import hashlib
import json
import os
import secrets
import time
import uuid
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from contracts import ApiError, text
from storage import db, control, put, wire, audit, transact, now
from bufete_knowledge import BUFETE_KNOWLEDGE
import chat_control

sessions=db.Table(os.getenv('SESSIONS_TABLE','ChatSessions'))
leads=db.Table(os.getenv('LEADS_TABLE','ChatLeads'))
CONTACT='Puedes agendar en [Citas](/booking) o escribir a [WhatsApp del despacho](https://wa.me/59169512921).'
MAX_TURNS=6
MAX_CALLS=3
SYSTEM_PROMPT='''Eres el asistente de recepción del despacho de la Dra. Jhoselyn Gonzales.
Responde en español con empatía y una pregunta breve por turno. Usa únicamente la información verificada del despacho incluida abajo.
Resuelve horarios, ubicación, tarifas y coordinación de atención; para una consulta jurídica concreta, urgencia o solicitud humana deriva a la abogada.
No diagnostiques emociones, no des asesoría jurídica específica, no inventes normas/plazos, no prometas resultados ni confirmes pagos o avisos entregados.
Pide sólo nombre y teléfono y un resumen mínimo necesario; no solicites documentos de identidad, datos de menores o detalles íntimos en el chat público.
La herramienta sólo confirma que la ficha se guardó si su resultado es success. Si falla, dilo y ofrece contacto humano.
'''+BUFETE_KNOWLEDGE

def save_lead(arguments, identifier):
    from secure_handler import validate_lead
    if not isinstance(arguments,dict):
        raise ApiError(422,'INVALID_TOOL','Argumentos inválidos')
    allowed={'client_name','client_phone','category','case_details','emotional_state','urgency','payment_preference'}
    if set(arguments)-allowed:
        raise ApiError(422,'INVALID_TOOL','Campos no permitidos')
    validate_lead(arguments,True)
    text(arguments,'case_details',8000,True)
    if arguments.get('category') not in {'Derecho Familiar','Niñez y Adolescencia','Derecho Civil y Patrimonial','Servicios Internacionales (EEUU)','Pro Bono','Consulta General'}:
        raise ApiError(422,'INVALID_TOOL','Categoría inválida')
    if arguments['client_name'].strip().lower() in {'cliente','anónimo','anonimo','usuario','no proporcionado','cliente web'}:
        return {'status':'pending','message':'Falta nombre para seguimiento'}
    lead_id=str(uuid.uuid5(uuid.NAMESPACE_URL,'intake:'+identifier))
    old=leads.get_item(Key={'lead_id':lead_id},ConsistentRead=True).get('Item')
    if old:
        return {'status':'success','lead_id':lead_id,'message':'Ficha ya registrada'}
    # Do not persist model-inferred emotional state as a personal fact.
    row={**{k:v for k,v in arguments.items() if k!='emotional_state'},'lead_id':lead_id,'session_id':identifier,'case_summary':arguments.get('case_details','')[:300],'stage':'NUEVO','status':'NUEVO_LEAD','source':'Chatbot IA','notes':[],'deal_value':0,'version':1,'created_at':now()}
    transact([put(leads.name,row,'attribute_not_exists(lead_id)'),audit('chat','create_lead',lead_id),put(control.name,{'pk':'NOTIFICATION#'+lead_id,'lead_id':lead_id,'delivery_status':'PENDING','created_at':now()})])
    # Delivery is explicitly pending; never include sensitive case details in SNS.
    topic=os.getenv('SNS_TOPIC_ARN')
    if topic:
        try:
            boto3.client('sns').publish(TopicArn=topic,Subject='Nueva consulta registrada',Message='Hay una nueva consulta pendiente de revisión en el panel del despacho.')
            control.update_item(Key={'pk':'NOTIFICATION#'+lead_id},UpdateExpression='SET delivery_status = :s',ExpressionAttributeValues={':s':'PUBLISHED'})
        except ClientError:
            pass
    return {'status':'success','lead_id':lead_id,'message':'Ficha guardada; notificación pendiente o publicada, sin confirmar lectura'}

def process(session_token, message, request_key, origin='unknown'):
    if not chat_control.enabled():
        return {'response':'La atención automática está desactivada. '+CONTACT,'turn_count':0,'max_turns':MAX_TURNS,'limit_reached':False,'lead':None,'ai_enabled':False}
    if not request_key or len(request_key)>128:
        raise ApiError(422,'IDEMPOTENCY_REQUIRED','Se requiere Idempotency-Key')
    chat_control.rate_limit(origin)
    supplied=bool(session_token)
    if not session_token:
        initial_key='CHATINIT#'+hashlib.sha256(request_key.encode()).hexdigest()
        initial=control.get_item(Key={'pk':initial_key},ConsistentRead=True).get('Item')
        if initial and int(initial.get('expires_at',0))>time.time():
            session_token=initial['token']
        else:
            session_token=secrets.token_urlsafe(32)
            try:
                control.put_item(Item={'pk':initial_key,'token':session_token,'expires_at':int(time.time())+7*86400},ConditionExpression='attribute_not_exists(pk) OR expires_at < :now',ExpressionAttributeValues={':now':int(time.time())})
            except ClientError as exc:
                if exc.response['Error']['Code']!='ConditionalCheckFailedException': raise
                session_token=control.get_item(Key={'pk':initial_key},ConsistentRead=True)['Item']['token']
    if len(session_token)<40 or len(session_token)>80:
        raise ApiError(401,'INVALID_SESSION','Inicia una nueva conversación')
    identifier=hashlib.sha256(session_token.encode()).hexdigest()
    fingerprint=hashlib.sha256((request_key+'|'+message).encode()).hexdigest()
    row=sessions.get_item(Key={'session_id':identifier},ConsistentRead=True).get('Item')
    if supplied and not row:
        raise ApiError(401,'INVALID_SESSION','Inicia una nueva conversación')
    if row and int(row.get('expires_at',0))<=time.time():
        raise ApiError(401,'SESSION_EXPIRED','Inicia una nueva conversación')
    if row and row.get('last_request_key')==request_key:
        if row.get('last_fingerprint')!=fingerprint:
            raise ApiError(409,'IDEMPOTENCY_CONFLICT','La clave corresponde a otro mensaje')
        return {**row['last_result'],'session_id':session_token}
    if row and int(row.get('turn_count',0))>=MAX_TURNS:
        return {'session_id':session_token,'turn_count':MAX_TURNS,'max_turns':MAX_TURNS,'limit_reached':True,'response':CONTACT,'lead':None}
    lock_id=str(uuid.uuid4())
    try:
        control.put_item(Item={'pk':'CHATLOCK#'+identifier,'owner':lock_id,'expires_at':int(time.time())+90},ConditionExpression='attribute_not_exists(pk) OR expires_at < :now',ExpressionAttributeValues={':now':int(time.time())})
    except ClientError as exc:
        if exc.response['Error']['Code']=='ConditionalCheckFailedException':
            raise ApiError(409,'CHAT_BUSY','Espera a la respuesta anterior') from None
        raise
    try:
        # Re-read after acquiring lock, to detect a completed concurrent request.
        row=sessions.get_item(Key={'session_id':identifier},ConsistentRead=True).get('Item')
        if row and row.get('last_request_key')==request_key:
            if row.get('last_fingerprint')!=fingerprint:
                raise ApiError(409,'IDEMPOTENCY_CONFLICT','La clave corresponde a otro mensaje')
            return {**row['last_result'],'session_id':session_token}
        from agent_core import TOOL_DEFINITIONS
        history=json.loads(row.get('messages','[]')) if row else []
        turn=int(row.get('turn_count',0)) if row else 0
        if turn>=MAX_TURNS:
            return {'session_id':session_token,'turn_count':turn,'max_turns':MAX_TURNS,'limit_reached':True,'response':CONTACT,'lead':None}
        history.append({'role':'user','content':[{'text':message}]})
        runtime=boto3.client('bedrock-runtime',config=Config(connect_timeout=3,read_timeout=7,retries={'total_max_attempts':1}))
        answer='No se pudo completar la atención automática. '+CONTACT
        lead=None
        complete_history=list(history[:-1])
        try:
            for _ in range(MAX_CALLS):
                system=[{'text':SYSTEM_PROMPT+f'\nTurno {turn+1} de {MAX_TURNS}. Al finalizar deriva a contacto humano.'}]
                reservation=chat_control.reserve(json.dumps({'system':system,'messages':history,'tools':TOOL_DEFINITIONS},ensure_ascii=False),512)
                result=runtime.converse(modelId=os.getenv('BEDROCK_MODEL_ID','us.anthropic.claude-haiku-4-5-20251001-v1:0'),system=system,messages=history,toolConfig={'tools':TOOL_DEFINITIONS},inferenceConfig={'maxTokens':512,'temperature':0.3})
                chat_control.usage(reservation,result.get('usage',{}))
                output=result['output']['message'];history.append(output)
                if result.get('stopReason')!='tool_use':
                    answer=' '.join(x['text'] for x in output['content'] if 'text' in x)
                    complete_history=history
                    break
                tool_results=[]
                for content in output['content']:
                    if 'toolUse' not in content: continue
                    tool=content['toolUse']
                    try:
                        if tool['name']!='save_lead_summary':
                            raise ApiError(422,'UNKNOWN_TOOL','Herramienta desconocida')
                        lead=save_lead(tool['input'],identifier)
                        tool_result=lead
                    except ApiError as exc:
                        tool_result={'status':'error','message':exc.message}
                    tool_results.append({'toolResult':{'toolUseId':tool['toolUseId'],'content':[{'json':tool_result}],'status':'success' if tool_result['status']=='success' else 'error'}})
                history.append({'role':'user','content':tool_results})
        except ApiError as exc:
            answer=exc.message+'. '+CONTACT
        except Exception as exc:
            print(json.dumps({'operation':'chat','error_class':type(exc).__name__}))
        # Store only complete conversational turns; no dangling tool blocks after errors.
        if complete_history is not history:
            complete_history.extend([{'role':'user','content':[{'text':message}]},{'role':'assistant','content':[{'text':answer}]}])
        result={'turn_count':turn+1,'max_turns':MAX_TURNS,'limit_reached':turn+1>=MAX_TURNS,'response':answer,'lead':lead,'ai_enabled':True}
        owner=control.get_item(Key={'pk':'CHATLOCK#'+identifier},ConsistentRead=True).get('Item')
        if not owner or owner['owner']!=lock_id:
            raise ApiError(409,'CHAT_LOCK_LOST','Reintenta la consulta')
        session_item={'session_id':identifier,'messages':json.dumps(complete_history),'turn_count':turn+1,'last_request_key':request_key,'last_fingerprint':fingerprint,'last_result':result,'updated_at':now(),'expires_at':int(time.time())+7*86400}
        transact([{'ConditionCheck':{'TableName':control.name,'Key':wire({'pk':'CHATLOCK#'+identifier}),'ConditionExpression':'#o = :owner AND expires_at > :now','ExpressionAttributeNames':{'#o':'owner'},'ExpressionAttributeValues':wire({':owner':lock_id,':now':int(time.time())})}},put(sessions.name,session_item,'attribute_not_exists(session_id) OR turn_count = :turn',{':turn':turn})])
        return {**result,'session_id':session_token}
    finally:
        try:
            control.delete_item(Key={'pk':'CHATLOCK#'+identifier},ConditionExpression='#o = :owner',ExpressionAttributeNames={'#o':'owner'},ExpressionAttributeValues={':owner':lock_id})
        except ClientError as exc:
            if exc.response['Error']['Code']!='ConditionalCheckFailedException': raise
