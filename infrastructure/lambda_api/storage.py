import base64
import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
import boto3
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError
from contracts import ApiError

serializer = TypeSerializer()
db = boto3.resource('dynamodb')
client = db.meta.client
control = db.Table(os.getenv('CONTROL_TABLE', 'OperationControl'))

def now():
    return datetime.now(timezone.utc).isoformat()

def wire(item):
    return {k:serializer.serialize(v) for k,v in item.items()}

def put(table, item, condition=None, values=None):
    op = {'TableName':table, 'Item':wire(item)}
    if condition:
        op['ConditionExpression'] = condition
    if values:
        op['ExpressionAttributeValues'] = wire(values)
    return {'Put':op}

def audit(actor, action, resource):
    return put(control.name, {'pk':'AUDIT#'+str(uuid.uuid4()),'actor':actor,'action':action,'resource':resource,'created_at':now()})

def transact(operations):
    try:
        # Use low-level client without resource-side Python serializers.
        boto3.client('dynamodb').transact_write_items(TransactItems=operations)
    except ClientError as exc:
        if exc.response['Error']['Code'] in ('TransactionCanceledException','ConditionalCheckFailedException'):
            raise ApiError(409,'CONFLICT','El registro o el horario cambió; vuelve a cargar') from None
        raise

def version_condition(key_name, version):
    return f'attribute_exists({key_name}) AND ' + ('(attribute_not_exists(version) OR version = :v)' if version == 0 else 'version = :v')

def expected(body):
    value = body.get('expected_version')
    if isinstance(value,bool) or not isinstance(value,int) or value < 0:
        raise ApiError(422,'VERSION_REQUIRED','Se requiere expected_version')
    return value

def update(table, key, body, allowed, actor):
    old = table.get_item(Key=key,ConsistentRead=True).get('Item')
    if not old:
        raise ApiError(404,'NOT_FOUND','Registro inexistente')
    version = expected(body)
    changes = {k:v for k,v in body.items() if k in allowed}
    if not changes:
        raise ApiError(422,'EMPTY_UPDATE','No hay campos para actualizar')
    item = {**old,**changes,'version':version+1,'updated_at':now()}
    transact([put(table.name,item,version_condition(next(iter(key)),version),{':v':version}),audit(actor,'update',next(iter(key.values())))])
    return item

def delete(table, key, version, actor):
    if not table.get_item(Key=key,ConsistentRead=True).get('Item'):
        raise ApiError(404,'NOT_FOUND','Registro inexistente')
    op={'Delete':{'TableName':table.name,'Key':wire(key),'ConditionExpression':version_condition(next(iter(key)),version),'ExpressionAttributeValues':wire({':v':version})}}
    transact([op,audit(actor,'delete',next(iter(key.values())))])

def page(table, query, filter_expression=None, values=None, names=None):
    try:
        limit = int(query.get('limit',50))
        if not 1 <= limit <= 100:
            raise ValueError()
        kwargs={'Limit':limit}
        if query.get('cursor'):
            decoded=json.loads(base64.urlsafe_b64decode(query['cursor']).decode())
            if decoded['table'] != table.name or not isinstance(decoded['key'],dict):
                raise ValueError()
            keyname={os.getenv('APPOINTMENTS_TABLE','Appointments'):'appointment_id',os.getenv('BLOG_TABLE','BlogPosts'):'post_id',os.getenv('PROBONO_TABLE','ProBonoRequests'):'request_id',os.getenv('LEADS_TABLE','ChatLeads'):'lead_id'}[table.name]
            if set(decoded['key']) != {keyname} or not isinstance(decoded['key'][keyname],str):
                raise ValueError()
            kwargs['ExclusiveStartKey']=decoded['key']
        if filter_expression:
            kwargs['FilterExpression']=filter_expression
            kwargs['ExpressionAttributeValues']=values
            kwargs['ExpressionAttributeNames']=names
    except (ValueError, KeyError, TypeError, UnicodeError):
        raise ApiError(400,'INVALID_CURSOR','Cursor o límite inválido') from None
    result=table.scan(**kwargs)
    items=result.get('Items',[])
    for item in items:
        item.setdefault('version',0)
    last=result.get('LastEvaluatedKey')
    cursor=base64.urlsafe_b64encode(json.dumps({'table':table.name,'key':last}).encode()).decode() if last else None
    return items,cursor

def command(event, body, actor, path):
    key=(event.get('headers') or {}).get('idempotency-key') or (event.get('headers') or {}).get('Idempotency-Key')
    if not key or not isinstance(key,str) or len(key)>128:
        raise ApiError(422,'IDEMPOTENCY_REQUIRED','Se requiere Idempotency-Key')
    digest=hashlib.sha256(json.dumps(body,sort_keys=True,default=str).encode()).hexdigest()
    identifier='COMMAND#'+hashlib.sha256(f'{actor}|{path}|{key}'.encode()).hexdigest()
    old=control.get_item(Key={'pk':identifier},ConsistentRead=True).get('Item')
    if old and old['payload_hash'] != digest:
        raise ApiError(409,'IDEMPOTENCY_CONFLICT','La clave corresponde a otra solicitud')
    return identifier,digest,old.get('result') if old else None

def receipt(identifier,digest,result):
    return put(control.name,{'pk':identifier,'payload_hash':digest,'result':result,'created_at':now()},'attribute_not_exists(pk)')
