import os
import re
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from contracts import ApiError, text, phone
from storage import db, put, wire, audit, transact, now, command, receipt, expected, version_condition

appointments=db.Table(os.getenv('APPOINTMENTS_TABLE','Appointments'))
blocks=db.Table(os.getenv('BLOCKS_TABLE','AvailabilityBlocks'))
slots=db.Table(os.getenv('SLOTS_TABLE','BookingSlots'))
ZONE=ZoneInfo('America/La_Paz')
DAYS=['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
STATUSES={'PENDING_APPROVAL','APPROVED','CANCELLED'}

def slot_id(item):
    return item['date']+'#'+item['time']

def configured_schedule():
    row=blocks.get_item(Key={'block_id':'WEEKLY_SCHEDULE'},ConsistentRead=True).get('Item')
    if not row or not row.get('schedule'):
        raise ApiError(503,'SCHEDULE_NOT_CONFIGURED','Horario no configurado; contacta al despacho')
    return row

def validate_slot(item):
    try:
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',item['date']) or not re.fullmatch(r'\d{2}:\d{2}',item['time']):
            raise ValueError()
        date=datetime.strptime(item['date']+' '+item['time'],'%Y-%m-%d %H:%M').replace(tzinfo=ZONE)
    except (ValueError, TypeError, KeyError):
        raise ApiError(422,'INVALID_DATE','Fecha u hora inválida') from None
    if date <= datetime.now(ZONE):
        raise ApiError(422,'PAST_SLOT','Selecciona un horario futuro')
    schedule=configured_schedule()
    if item['time'] not in schedule['schedule'].get(DAYS[date.weekday()],[]):
        raise ApiError(422,'OUTSIDE_SCHEDULE','Horario no disponible')
    return schedule

def schedule_check(row):
    v=int(row.get('version',0))
    return {'ConditionCheck':{'TableName':blocks.name,'Key':wire({'block_id':'WEEKLY_SCHEDULE'}),'ConditionExpression':version_condition('block_id',v),'ExpressionAttributeValues':wire({':v':v})}}

def create(event, body, actor, admin=False):
    if os.getenv('BOOKING_READY','false').lower()!='true':
        raise ApiError(503,'BOOKING_MIGRATION_REQUIRED','Agenda en mantenimiento; contacta al despacho')
    identifier,digest,existing=command(event,body,actor,'appointments')
    if existing:
        return existing
    item={'name':text(body,'name',160,True),'phone':phone(body),'email':text(body,'email',254),'reason':text(body,'reason',4000),'date':text(body,'date',10,True),'time':text(body,'time',5,True)}
    row=validate_slot(item)
    status=body.get('status','PENDING_APPROVAL') if admin else 'PENDING_APPROVAL'
    if status not in STATUSES or status=='CANCELLED':
        raise ApiError(422,'INVALID_STATUS','Estado inválido')
    item.update(appointment_id=str(uuid.uuid4()),status=status,version=1,created_at=now())
    result={'appointment_id':item['appointment_id'],'status':status,'version':1}
    transact([put(appointments.name,item,'attribute_not_exists(appointment_id)'),put(slots.name,{'slot_id':slot_id(item),'appointment_id':item['appointment_id']},'attribute_not_exists(slot_id)'),schedule_check(row),receipt(identifier,digest,result),audit(actor,'create_appointment',item['appointment_id'])])
    return result

def patch(identifier, body, actor):
    old=appointments.get_item(Key={'appointment_id':identifier},ConsistentRead=True).get('Item')
    if not old:
        raise ApiError(404,'NOT_FOUND','Cita inexistente')
    v=expected(body)
    allowed={'name','phone','email','reason','date','time','status'}
    if not any(k in body for k in allowed):
        raise ApiError(422,'EMPTY_UPDATE','No hay cambios')
    item={**old,**{k:body[k] for k in allowed if k in body},'version':v+1,'updated_at':now()}
    text(item,'name',160,True); phone(item); text(item,'email',254); text(item,'reason',4000)
    if item['status'] not in STATUSES:
        raise ApiError(422,'INVALID_STATUS','Estado inválido')
    moved=slot_id(old)!=slot_id(item)
    reactivated=old['status']=='CANCELLED' and item['status']!='CANCELLED'
    operations=[put(appointments.name,item,version_condition('appointment_id',v),{':v':v}),audit(actor,'update_appointment',identifier)]
    if old['status']!='CANCELLED' and (item['status']=='CANCELLED' or moved):
        operations.append({'Delete':{'TableName':slots.name,'Key':wire({'slot_id':slot_id(old)}),'ConditionExpression':'appointment_id = :id','ExpressionAttributeValues':wire({':id':identifier})}})
    if item['status']!='CANCELLED' and (moved or reactivated):
        if os.getenv('BOOKING_READY','false').lower()!='true':
            raise ApiError(503,'BOOKING_MIGRATION_REQUIRED','Agenda en mantenimiento')
        operations.extend([schedule_check(validate_slot(item)),put(slots.name,{'slot_id':slot_id(item),'appointment_id':identifier},'attribute_not_exists(slot_id)')])
    transact(operations)
    return {'message':'Cita actualizada','version':v+1}

def availability(date):
    try:
        day=datetime.strptime(date,'%Y-%m-%d')
    except (ValueError,TypeError):
        raise ApiError(422,'INVALID_DATE','Fecha inválida') from None
    row=configured_schedule()
    if os.getenv('BOOKING_READY','false').lower()!='true':
        raise ApiError(503,'BOOKING_MIGRATION_REQUIRED','Agenda en mantenimiento')
    available=[]
    for hour in row['schedule'].get(DAYS[day.weekday()],[]):
        dt=datetime.strptime(date+' '+hour,'%Y-%m-%d %H:%M').replace(tzinfo=ZONE)
        if dt>datetime.now(ZONE) and not slots.get_item(Key={'slot_id':date+'#'+hour},ConsistentRead=True).get('Item'):
            available.append(hour)
    return {'available_times':available,'timezone':'America/La_Paz'}
