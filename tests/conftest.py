import importlib
import os
import sys
import time
import pytest
import boto3
from moto import mock_aws

@pytest.fixture
def api(monkeypatch):
    for k,v in {'AWS_ACCESS_KEY_ID':'testing','AWS_SECRET_ACCESS_KEY':'testing','AWS_DEFAULT_REGION':'us-east-1','AWS_EC2_METADATA_DISABLED':'true','COGNITO_ISSUER':'https://issuer.test/pool','COGNITO_CLIENT_ID':'client','BOOKING_READY':'true'}.items():
        monkeypatch.setenv(k,v)
    with mock_aws():
        db=boto3.resource('dynamodb',region_name='us-east-1')
        for name,key in [('Appointments','appointment_id'),('AvailabilityBlocks','block_id'),('BlogPosts','post_id'),('ProBonoRequests','request_id'),('ChatLeads','lead_id'),('ChatSessions','session_id'),('BookingSlots','slot_id'),('OperationControl','pk')]:
            db.create_table(TableName=name,KeySchema=[{'AttributeName':key,'KeyType':'HASH'}],AttributeDefinitions=[{'AttributeName':key,'AttributeType':'S'}],BillingMode='PAY_PER_REQUEST')
        db.Table('AvailabilityBlocks').put_item(Item={'block_id':'WEEKLY_SCHEDULE','version':0,'schedule':{day:['09:00','10:00'] for day in ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']}})
        for module in ('secure_handler','storage','bookings','agent_core','secure_chat','chat_control'):
            sys.modules.pop(module,None)
        handler=importlib.import_module('secure_handler')
        yield handler,db

def event(method,path,body=None,admin=False,claims=None,key='test-command',query=None):
    import json
    request={'http':{'method':method},'requestId':'test'}
    if admin:
        request['authorizer']={'jwt':{'claims':claims or {'iss':'https://issuer.test/pool','client_id':'client','token_use':'access','exp':int(time.time())+3600,'iat':int(time.time()),'cognito:groups':'[Admins]','sub':'admin'}}}
    return {'rawPath':path,'requestContext':request,'headers':{'idempotency-key':key},'body':json.dumps(body or {}),'queryStringParameters':query or {}}
