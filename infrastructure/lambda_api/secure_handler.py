"""Explicit public/admin routing. Kept separate until controlled Lambda entrypoint rollout."""
import json
import re
import uuid
import unicodedata
import os
from decimal import Decimal
from botocore.exceptions import ClientError
from contracts import ApiError, body_of, text, phone, money
from security import route_access
from storage import db, control, put, wire, audit, transact, now, page, update, delete, expected, command, receipt, version_condition
import bookings

appointments=bookings.appointments
blocks=bookings.blocks
blog=db.Table(os.getenv('BLOG_TABLE','BlogPosts'))
probono=db.Table(os.getenv('PROBONO_TABLE','ProBonoRequests'))
leads=db.Table(os.getenv('LEADS_TABLE','ChatLeads'))
STAGES={'NUEVO','CONTACTADO','ASESORIA','PROPUESTA','GANADO','CERRADO'}
CATEGORIES={'Derecho Familiar','Niñez y Adolescencia','Derecho Civil y Patrimonial','Servicios Internacionales (EEUU)','Pro Bono','Consulta General'}

def response(status, body, request_id):
    def encode(value):
        if isinstance(value,Decimal):
            return int(value) if value==value.to_integral_value() else str(value)
        raise TypeError()
    return {'statusCode':status,'headers':{'Content-Type':'application/json','Cache-Control':'no-store','X-Request-Id':request_id},'body':json.dumps({**body,'request_id':request_id},default=encode,ensure_ascii=False)}

def validate_lead(body, creating=False):
    for key,maximum in {'client_name':160,'client_phone':32,'client_email':254,'source':120,'case_summary':500,'case_details':8000,'emotional_state':300,'payment_preference':300,'lost_reason':1000,'status':80}.items():
        if key in body or (key=='client_name' and creating):
            text(body,key,maximum,key=='client_name')
    if body.get('client_phone'):
        phone(body,'client_phone')
    for field,values in (('stage',STAGES),('category',CATEGORIES),('urgency',{'ALTA','MEDIA','NORMAL'})):
        if field in body and (not isinstance(body[field],str) or body[field] not in values):
            raise ApiError(422,'INVALID_FIELD',f'Campo inválido: {field}')
    if 'deal_value' in body:
        body['deal_value']=money(body['deal_value'])
    if 'notes' in body:
        notes=body['notes']
        if not isinstance(notes,list) or len(notes)>100:
            raise ApiError(422,'INVALID_NOTES','Notas inválidas')
        for note in notes:
            if not isinstance(note,dict):
                raise ApiError(422,'INVALID_NOTES','Nota inválida')
            text(note,'text',2000,True)

def slug_of(value):
    value=unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',value).strip('-')[:160]

def create_record(event, body, actor, path, table, keyname, item):
    identifier,digest,existing=command(event,body,actor,path)
    if existing:
        return existing
    item.update({keyname:str(uuid.uuid4()),'version':1,'created_at':now()})
    result={keyname:item[keyname],'version':1}
    transact([put(table.name,item,'attribute_not_exists('+keyname+')'),receipt(identifier,digest,result),audit(actor,'create',item[keyname])])
    return result

def blog_write(event, body, actor, post_id=None):
    old=blog.get_item(Key={'post_id':post_id},ConsistentRead=True).get('Item') if post_id else None
    if post_id and not old:
        raise ApiError(404,'NOT_FOUND','Artículo inexistente')
    item={**(old or {}),**{k:v for k,v in body.items() if k in {'title','content','excerpt','category','image_url','published','slug'}}}
    title=text(item,'title',200,True); content=text(item,'content',20000,True)
    text(item,'excerpt',500); text(item,'category',120); text(item,'image_url',2000)
    if not isinstance(item.get('published',True),bool):
        raise ApiError(422,'INVALID_FIELD','published debe ser booleano')
    slug=slug_of(text(item,'slug',160) or title)
    if not slug:
        raise ApiError(422,'INVALID_SLUG','Slug inválido')
    item.update(slug=slug,published=item.get('published',True),author=item.get('author','Jhoselyn Gonzales'))
    operations=[]
    if old:
        v=expected(body)
        item.update(version=v+1,updated_at=now())
        operations.append(put(blog.name,item,version_condition('post_id',v),{':v':v}))
    else:
        identifier,digest,existing=command(event,body,actor,'blog')
        if existing:
            return existing
        item.update(post_id=str(uuid.uuid4()),version=1,created_at=now(),excerpt=item.get('excerpt',content[:180]))
        operations.append(put(blog.name,item,'attribute_not_exists(post_id)'))
        operations.append(receipt(identifier,digest,{'post_id':item['post_id'],'slug':slug,'version':1}))
    operations.append(put(control.name,{'pk':'SLUG#'+slug,'post_id':item['post_id']},'attribute_not_exists(pk) OR post_id = :id',{':id':item['post_id']}))
    if old and old['slug']!=slug:
        operations.append({'Delete':{'TableName':control.name,'Key':wire({'pk':'SLUG#'+old['slug']}),'ConditionExpression':'attribute_not_exists(pk) OR post_id = :id','ExpressionAttributeValues':wire({':id':item['post_id']})}})
    operations.append(audit(actor,'blog_write',item['post_id']))
    transact(operations)
    return {'post_id':item['post_id'],'slug':slug,'version':item['version']}

def dispatch(event, method, path, admin, actor, body):
    query=event.get('queryStringParameters') or {}
    if path=='/api/availability' and method=='GET':
        return 200,bookings.availability(query.get('date'))
    if path=='/api/schedule' and method=='GET':
        row=bookings.configured_schedule()
        return 200,{'schedule':row['schedule'],'version':int(row.get('version',0))}
    if path=='/api/schedule' and method=='PUT':
        schedule=body.get('schedule')
        if not isinstance(schedule,dict) or set(schedule)!=set(bookings.DAYS):
            raise ApiError(422,'INVALID_SCHEDULE','Se requieren los siete días')
        for hours in schedule.values():
            if not isinstance(hours,list) or len(hours)>24 or any(not isinstance(h,str) or not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d',h) for h in hours) or len(set(hours))!=len(hours):
                raise ApiError(422,'INVALID_SCHEDULE','Horas inválidas')
        item=update(blocks,{'block_id':'WEEKLY_SCHEDULE'},body,{'schedule'},actor)
        return 200,{'schedule':item['schedule'],'version':item['version']}
    if path=='/api/appointments':
        if method=='POST':
            return 201,bookings.create(event,body,actor,admin)
        if method=='GET':
            rows,cursor=page(appointments,query)
            return 200,{'appointments':rows,'next_cursor':cursor}
    if re.fullmatch(r'/api/appointments/[^/]+',path) and method=='PATCH':
        return 200,bookings.patch(path.split('/')[-1],body,actor)
    if path=='/api/blog' and method=='GET':
        rows,cursor=page(blog,query,None if admin else '#p = :p',None if admin else {':p':True},None if admin else {'#p':'published'})
        if not admin:
            rows=[{k:v for k,v in row.items() if k!='content'} for row in rows]
        return 200,{'posts':rows,'next_cursor':cursor}
    if path=='/api/blog' and method=='POST':
        return 201,blog_write(event,body,actor)
    if re.fullmatch(r'/api/blog/[^/]+',path):
        identifier=path.split('/')[-1]
        if method=='GET':
            if admin:
                row=blog.get_item(Key={'post_id':identifier},ConsistentRead=True).get('Item')
            else:
                mapping=control.get_item(Key={'pk':'SLUG#'+identifier},ConsistentRead=True).get('Item')
                row=blog.get_item(Key={'post_id':mapping['post_id']},ConsistentRead=True).get('Item') if mapping else None
            if not row or (not admin and row.get('published') is not True):
                raise ApiError(404,'NOT_FOUND','Artículo inexistente')
            return 200,{'post':row}
        if method=='PUT':
            return 200,blog_write(event,body,actor,identifier)
        if method=='DELETE':
            delete(blog,{'post_id':identifier},expected(body),actor)
            return 200,{'message':'Artículo eliminado'}
    if path=='/api/probono':
        if method=='POST':
            item={k:text(body,k,n,k in ('name','description')) for k,n in {'name':160,'email':254,'location':300,'case_type':160,'description':6000,'income':200}.items()}
            item.update(phone=phone(body),status='PENDING')
            return 201,create_record(event,body,actor,path,probono,'request_id',item)
        if method=='GET':
            rows,cursor=page(probono,query)
            return 200,{'requests':rows,'next_cursor':cursor}
    if re.fullmatch(r'/api/probono/[^/]+',path) and method=='PATCH':
        if body.get('status') not in ('PENDING','REVIEWING','APPROVED','REJECTED'):
            raise ApiError(422,'INVALID_STATUS','Estado inválido')
        item=update(probono,{'request_id':path.split('/')[-1]},body,{'status'},actor)
        return 200,{'version':item['version']}
    if path in ('/api/crm/leads','/api/chat/leads'):
        if method=='GET':
            rows,cursor=page(leads,query)
            for row in rows:
                row.setdefault('stage','CONTACTADO' if row.get('status')=='CONTACTADO' else 'NUEVO')
                row.setdefault('notes',[]); row.setdefault('deal_value',0)
            return 200,{'leads':rows,'next_cursor':cursor}
        if method=='POST':
            validate_lead(body,True)
            fields={'client_name','client_phone','client_email','category','source','stage','urgency','case_summary','case_details','emotional_state','payment_preference','deal_value','notes'}
            item={k:v for k,v in body.items() if k in fields}
            for k,v in {'stage':'NUEVO','status':'NUEVO_LEAD','source':'Manual / Despacho','category':'Consulta General','urgency':'NORMAL','notes':[],'deal_value':0}.items():
                item.setdefault(k,v)
            return 201,create_record(event,body,actor,'leads',leads,'lead_id',item)
    if re.fullmatch(r'/api/(crm/leads|chat/leads)/[^/]+',path):
        key={'lead_id':path.split('/')[-1]}
        if method=='PATCH':
            validate_lead(body)
            fields={'client_name','client_phone','client_email','stage','status','notes','deal_value','category','urgency','source','case_summary','case_details','payment_preference','emotional_state','lost_reason'}
            row=update(leads,key,body,fields,actor)
            return 200,{'version':row['version']}
        if method=='DELETE':
            delete(leads,key,expected(body),actor)
            return 200,{'message':'Prospecto eliminado'}
    if path=='/api/chat' and method=='POST':
        from secure_chat import process
        origin=event.get('requestContext',{}).get('http',{}).get('sourceIp','unknown')
        return 200,process(text(body,'session_id',80) or None,text(body,'message',2000,True),(event.get('headers') or {}).get('idempotency-key'),origin)
    raise ApiError(404,'NOT_FOUND','Ruta no encontrada')

def lambda_handler(event, context):
    request_id=event.get('requestContext',{}).get('requestId') or str(uuid.uuid4())
    try:
        method=event.get('requestContext',{}).get('http',{}).get('method','')
        path=event.get('rawPath','')
        if method=='OPTIONS':
            return response(204,{},request_id)
        path,admin,actor=route_access(event,method,path)
        body=body_of(event) if method in {'POST','PUT','PATCH','DELETE'} else {}
        status,result=dispatch(event,method,path,admin,actor,body)
        return response(status,result,request_id)
    except ApiError as exc:
        return response(exc.status,{'error':exc.message,'code':exc.code},request_id)
    except ClientError as exc:
        print(json.dumps({'request_id':request_id,'code':exc.response['Error']['Code']}))
        return response(503,{'error':'Servicio temporalmente no disponible','code':'DEPENDENCY_ERROR'},request_id)
    except Exception as exc:
        print(json.dumps({'request_id':request_id,'code':type(exc).__name__}))
        return response(500,{'error':'Error interno','code':'INTERNAL_ERROR'},request_id)
