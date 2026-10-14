"""Atomic conservative cost reservations. Optional inference is off without configuration."""
import math
import os
import time
import uuid
import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from botocore.exceptions import ClientError
from contracts import ApiError
from storage import control, transact, wire, put

def enabled():
    return os.getenv('CHAT_AI_ENABLED','false').lower()=='true' and all(Decimal(os.getenv(k,'0'))>0 for k in ('AI_MONTHLY_BUDGET_MICROUSD','AI_DAILY_BUDGET_MICROUSD','AI_INPUT_USD_PER_MILLION','AI_OUTPUT_USD_PER_MILLION'))

def rate_limit(origin):
    key='RATE#'+str(int(time.time())//3600)+'#'+hashlib.sha256(origin.encode()).hexdigest()
    try:
        control.update_item(Key={'pk':key},UpdateExpression='SET expires_at = :expires ADD requests_count :one',ConditionExpression='attribute_not_exists(requests_count) OR requests_count < :limit',ExpressionAttributeValues={':expires':int(time.time())+7200,':one':1,':limit':20})
    except ClientError as exc:
        if exc.response['Error']['Code']=='ConditionalCheckFailedException':
            raise ApiError(429,'CHAT_RATE_LIMIT','Límite de consultas alcanzado; contacta al despacho') from None
        raise

def reserve(input_text, max_output):
    date=datetime.now(timezone.utc)
    # UTF-8 bytes are a conservative token upper bound for supported tokenizer inputs.
    amount=math.ceil(len(input_text.encode('utf-8'))*Decimal(os.getenv('AI_INPUT_USD_PER_MILLION','0'))+max_output*Decimal(os.getenv('AI_OUTPUT_USD_PER_MILLION','0')))
    if amount<=0:
        raise ApiError(503,'AI_NOT_CONFIGURED','IA no configurada')
    operations=[]
    for period,limit in ((date.strftime('%Y-%m'),int(os.getenv('AI_MONTHLY_BUDGET_MICROUSD','0'))),(date.strftime('%Y-%m-%d'),int(os.getenv('AI_DAILY_BUDGET_MICROUSD','0')))):
        if amount>limit:
            raise ApiError(429,'AI_QUOTA','Cuota de IA agotada')
        operations.append({'Update':{'TableName':control.name,'Key':wire({'pk':'BUDGET#'+period}),'UpdateExpression':'ADD reserved_microusd :cost','ConditionExpression':'attribute_not_exists(reserved_microusd) OR reserved_microusd <= :remaining','ExpressionAttributeValues':wire({':cost':amount,':remaining':limit-amount})}})
    identifier='INFERENCE#'+str(uuid.uuid4())
    operations.append(put(control.name,{'pk':identifier,'reserved_microusd':amount,'status':'RESERVED','expires_at':int(time.time())+90*86400},'attribute_not_exists(pk)'))
    try:
        transact(operations)
    except ApiError:
        raise ApiError(429,'AI_QUOTA','Cuota de IA agotada') from None
    return identifier

def usage(identifier, metadata):
    control.update_item(Key={'pk':identifier},UpdateExpression='SET usage_metadata = :u, #s = :s',ExpressionAttributeNames={'#s':'status'},ExpressionAttributeValues={':u':metadata,':s':'COMPLETE'})
