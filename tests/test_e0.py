import json
import time
from decimal import Decimal
from conftest import event

def invoke(api, *args, **kwargs):
    result=api[0].lambda_handler(event(*args,**kwargs),None)
    return result['statusCode'],json.loads(result['body'])

def reservation():
    return {'name':'Test offline','phone':'+59170000000','date':'2099-10-13','time':'09:00','status':'APPROVED'}

def test_private_routes_and_aliases(api):
    for method,path in [('GET','/api/appointments'),('GET','/api/crm/leads'),('GET','/api/chat/leads'),('GET','/api/probono'),('PUT','/api/schedule'),('DELETE','/api/blog/id')]:
        assert invoke(api,method,path)[0]==401
    assert invoke(api,'GET','/api/admin/appointments',admin=True)[0]==200
    for patch,status in [({'cognito:groups':'[NotAdmins]'},403),({'token_use':'id'},401),({'iss':'wrong'},401),({'client_id':'wrong'},401),({'exp':1},401)]:
        claims=event('GET','/',admin=True)['requestContext']['authorizer']['jwt']['claims']
        claims.update(patch)
        assert invoke(api,'GET','/api/admin/appointments',admin=True,claims=claims)[0]==status

def test_json_invalid_is_client_error(api):
    request=event('POST','/api/appointments');request['body']='{'
    r=api[0].lambda_handler(request,None)
    assert r['statusCode']==400
    assert 'details' not in json.loads(r['body'])

def test_slot_exclusion_idempotency_and_public_status(api):
    status,row=invoke(api,'POST','/api/appointments',reservation())
    assert status==201 and row['status']=='PENDING_APPROVAL'
    assert invoke(api,'POST','/api/appointments',reservation())[1]['appointment_id']==row['appointment_id']
    assert invoke(api,'POST','/api/appointments',reservation(),key='different')[0]==409
    other=reservation();other['name']='Changed'
    assert invoke(api,'POST','/api/appointments',other)[0]==409
    assert api[1].Table('Appointments').scan()['Count']==1

def test_cancel_releases_slot_and_rejects_stale_update(api):
    _,row=invoke(api,'POST','/api/appointments',reservation())
    path='/api/admin/appointments/'+row['appointment_id']
    assert invoke(api,'PATCH',path,{'expected_version':1,'status':'CANCELLED'},admin=True)[0]==200
    assert invoke(api,'PATCH',path,{'expected_version':1,'status':'APPROVED'},admin=True)[0]==409
    assert invoke(api,'POST','/api/appointments',reservation(),key='next')[0]==201

def test_reschedule_conflict_is_atomic(api):
    _,row=invoke(api,'POST','/api/appointments',reservation())
    second=reservation();second['time']='10:00'
    assert invoke(api,'POST','/api/appointments',second,key='two')[0]==201
    assert invoke(api,'PATCH','/api/admin/appointments/'+row['appointment_id'],{'expected_version':1,'time':'10:00'},admin=True)[0]==409
    stored=api[1].Table('Appointments').get_item(Key={'appointment_id':row['appointment_id']})['Item']
    assert stored['time']=='09:00' and stored['version']==1

def test_blank_dates_and_unknown_ids(api):
    for change in ({'name':''},{'date':'invalid'},{'phone':'not-a-phone'},{'time':'24:00'}):
        assert invoke(api,'POST','/api/appointments',{**reservation(),**change})[0]==422
    assert invoke(api,'PATCH','/api/admin/appointments/missing',{'expected_version':0,'status':'APPROVED'},admin=True)[0]==404

def test_blog_published_slug_and_unique_mapping(api):
    draft={'title':'Artículo á','content':'Offline fixture','published':False}
    status,row=invoke(api,'POST','/api/admin/blog',draft,admin=True)
    assert status==201 and row['slug']=='articulo-a'
    assert invoke(api,'GET','/api/blog')[1]['posts']==[]
    assert invoke(api,'GET','/api/blog/'+row['slug'])[0]==404
    assert invoke(api,'POST','/api/admin/blog',draft,admin=True,key='collision')[0]==409
    assert invoke(api,'PUT','/api/admin/blog/'+row['post_id'],{'expected_version':1,'published':True},admin=True)[0]==200
    assert invoke(api,'GET','/api/blog/'+row['slug'])[0]==200

def test_decimal_version_and_cursor(api):
    for i in range(3):
        assert invoke(api,'POST','/api/admin/crm/leads',{'client_name':f'Offline {i}','deal_value':123.45},admin=True,key=str(i))[0]==201
    db=api[1].Table('ChatLeads')
    row=db.scan()['Items'][0]
    assert row['deal_value']==Decimal('123.45')
    result=invoke(api,'GET','/api/admin/crm/leads',admin=True,query={'limit':'1'})[1]
    assert result['next_cursor'] and len(result['leads'])==1
    nextpage=invoke(api,'GET','/api/admin/crm/leads',admin=True,query={'limit':'1','cursor':result['next_cursor']})[1]
    assert nextpage['leads'][0]['lead_id']!=result['leads'][0]['lead_id']
    assert invoke(api,'GET','/api/admin/crm/leads',admin=True,query={'cursor':'broken'})[0]==400
    path='/api/admin/crm/leads/'+row['lead_id']
    assert invoke(api,'PATCH',path,{'expected_version':0,'deal_value':1},admin=True)[0]==409
    assert invoke(api,'PATCH',path,{'expected_version':1,'deal_value':-1},admin=True)[0]==422
