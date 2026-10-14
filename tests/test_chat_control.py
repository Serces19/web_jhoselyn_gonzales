import importlib
import pytest
from conftest import event
from contracts import ApiError

def test_disabled_chat_never_invokes_model(api, monkeypatch):
    monkeypatch.setenv('CHAT_AI_ENABLED','false')
    result=api[0].lambda_handler(event('POST','/api/chat',{'message':'Consulta offline'}),None)
    import json
    assert result['statusCode']==200 and json.loads(result['body'])['ai_enabled'] is False

def test_atomic_budget_rejects_overrun(api, monkeypatch):
    for key,value in {'AI_MONTHLY_BUDGET_MICROUSD':'12','AI_DAILY_BUDGET_MICROUSD':'12','AI_INPUT_USD_PER_MILLION':'1','AI_OUTPUT_USD_PER_MILLION':'1'}.items():
        monkeypatch.setenv(key,value)
    module=importlib.import_module('chat_control')
    module.reserve('123456',6)
    with pytest.raises(ApiError) as error:
        module.reserve('a',1)
    assert error.value.status==429

def test_model_tool_is_idempotent_and_validated(api):
    module=importlib.import_module('secure_chat')
    value={'client_name':'Offline Test','category':'Consulta General','case_details':'Fixture aislada'}
    first=module.save_lead(value,'offline-session')
    second=module.save_lead(value,'offline-session')
    assert first['lead_id']==second['lead_id']
    assert api[1].Table('ChatLeads').scan()['Count']==1
    with pytest.raises(ApiError):
        module.save_lead({**value,'stage':'GANADO'},'other')
