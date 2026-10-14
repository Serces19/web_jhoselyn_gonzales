import hashlib
import importlib
import json
from unittest.mock import patch
from contracts import ApiError
import pytest

def configure(monkeypatch):
    for k,v in {'CHAT_AI_ENABLED':'true','AI_MONTHLY_BUDGET_MICROUSD':'1000000','AI_DAILY_BUDGET_MICROUSD':'1000000','AI_INPUT_USD_PER_MILLION':'1','AI_OUTPUT_USD_PER_MILLION':'1'}.items():
        monkeypatch.setenv(k,v)

def test_initial_replay_and_session_bearer(api,monkeypatch):
    configure(monkeypatch)
    module=importlib.import_module('secure_chat')
    with patch.object(module.boto3,'client',wraps=module.boto3.client) as client:
        # Replace only runtime, preserving all DynamoDB transaction clients.
        original=client._mock_wraps
        class Runtime:
            calls=0
            def converse(self,**kwargs):
                self.calls+=1
                return {'stopReason':'end_turn','output':{'message':{'role':'assistant','content':[{'text':'Respuesta de prueba offline'}]}},'usage':{'inputTokens':20,'outputTokens':10}}
        runtime=Runtime()
        client.side_effect=lambda name,*a,**kw: runtime if name=='bedrock-runtime' else original(name,*a,**kw)
        first=module.process(None,'Offline','request-1')
        second=module.process(None,'Offline','request-1')
        assert first['session_id']==second['session_id'] and runtime.calls==1
        with pytest.raises(ApiError): module.process('a'*43,'Offline','request-2')
        module.process(first['session_id'],'Next offline','request-3')
        assert runtime.calls==2

def test_failure_history_has_no_dangling_tool_and_no_false_save(api,monkeypatch):
    configure(monkeypatch)
    module=importlib.import_module('secure_chat')
    original=module.boto3.client
    class Runtime:
        def converse(self,**kwargs): raise RuntimeError('offline failure')
    with patch.object(module.boto3,'client',side_effect=lambda name,*a,**kw: Runtime() if name=='bedrock-runtime' else original(name,*a,**kw)):
        result=module.process(None,'Offline error','request')
    assert 'No se pudo' in result['response'] and result['lead'] is None
    key=hashlib.sha256(result['session_id'].encode()).hexdigest()
    messages=json.loads(api[1].Table('ChatSessions').get_item(Key={'session_id':key})['Item']['messages'])
    assert [m['role'] for m in messages]==['user','assistant']
    assert not api[1].Table('ChatLeads').scan()['Items']

def test_origin_limit_cannot_be_reset_with_new_sessions(api):
    module=importlib.import_module('chat_control')
    for _ in range(20): module.rate_limit('offline-origin')
    with pytest.raises(ApiError) as exc: module.rate_limit('offline-origin')
    assert exc.value.status==429
