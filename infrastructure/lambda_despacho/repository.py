"""Private single-table repository. Interactive reads use Query/Get, never Scan."""
import base64
from datetime import datetime, timezone
import hashlib
import json
import os
import uuid
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError
from contracts import ApiError


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def table():
    return boto3.resource('dynamodb').Table(os.environ['CORE_TABLE'])


def get(pk, sk='META', required=False):
    item = table().get_item(Key={'pk': pk, 'sk': sk}, ConsistentRead=True).get('Item')
    if required and (not item or item.get('deleted')):
        raise ApiError(404, 'NOT_FOUND', 'Registro inexistente')
    return item


def wire(value):
    serializer = TypeSerializer()
    return {k: serializer.serialize(v) for k, v in value.items()}


def put(item, version=None):
    data = {'TableName': table().name, 'Item': wire(item)}
    if version is None:
        data['ConditionExpression'] = 'attribute_not_exists(pk)'
    else:
        data.update(ConditionExpression='#v = :v', ExpressionAttributeNames={'#v': 'version'},
                    ExpressionAttributeValues=wire({':v': version}))
    return {'Put': data}


def remove(pk, sk):
    return {'Delete': {'TableName': table().name, 'Key': wire({'pk': pk, 'sk': sk})}}


def check(item):
    return {'ConditionCheck': {'TableName': table().name, 'Key': wire({'pk': item['pk'], 'sk': item['sk']}),
            'ConditionExpression': '#v = :v', 'ExpressionAttributeNames': {'#v': 'version'},
            'ExpressionAttributeValues': wire({':v': item['version']})}}


def entity(kind, identifier, fields):
    now = timestamp()
    period = datetime.fromisoformat(now).astimezone(ZoneInfo('America/La_Paz')).strftime('%Y-%m')
    return {'pk': kind + '#' + identifier, 'sk': 'META', 'entity_type': kind, 'id': identifier,
            'schema_version': 1, 'version': 1, 'created_at': now, 'updated_at': now,
            'cohort_period': period, 'gsi1pk': 'TYPE#' + kind + '#' + period, 'gsi1sk': now + '#' + identifier, **fields}


def pointer(pk, item, sort=None):
    return {'pk': pk, 'sk': (sort or item['created_at']) + '#' + item['id'],
            'target_pk': item['pk'], 'target_sk': item['sk'], 'entity_type': 'POINTER', 'version': 1}


def query(pk, query_params=None, index=None, prefix=None, bounds=None):
    params = query_params or {}
    try:
        limit = int(params.get('limit', 25))
        if not 1 <= limit <= 100:
            raise ValueError()
        binding = {'pk': pk, 'index': index, 'prefix': prefix}
        if bounds: binding['bounds'] = bounds
        key_name = 'pk' if not index else index.lower() + 'pk'
        sort_name = 'sk' if not index else index.lower() + 'sk'
        condition = Key(key_name).eq(pk)
        if prefix:
            condition &= Key(sort_name).begins_with(prefix)
        if bounds:
            condition &= Key(sort_name).between(*bounds)
        kwargs = {'KeyConditionExpression': condition, 'Limit': limit, 'ConsistentRead': not index}
        if index:
            kwargs['IndexName'] = index
        if params.get('cursor'):
            cursor = json.loads(base64.urlsafe_b64decode(params['cursor']))
            if cursor['binding'] != binding or not isinstance(cursor['key'], dict):
                raise ValueError()
            allowed = {'pk', 'sk'} | ({key_name, sort_name} if index else set())
            if set(cursor['key']) != allowed or not all(isinstance(v, str) for v in cursor['key'].values()):
                raise ValueError()
            if cursor['key'][key_name] != pk or (prefix and not cursor['key'][sort_name].startswith(prefix)):
                raise ValueError()
            kwargs['ExclusiveStartKey'] = cursor['key']
    except (ValueError, TypeError, KeyError, UnicodeError):
        raise ApiError(400, 'INVALID_CURSOR', 'Cursor o límite inválido') from None
    response = table().query(**kwargs)
    last = response.get('LastEvaluatedKey')
    cursor = base64.urlsafe_b64encode(json.dumps({'binding': binding, 'key': last}).encode()).decode() if last else None
    return response.get('Items', []), cursor


def list_entities(pk, params=None):
    pointers, cursor = query(pk, params)
    return [item for row in pointers if (item := get(row['target_pk'], row['target_sk'])) and not item.get('deleted')], cursor


def commit(event, actor, action, body, operations, result, deltas=None):
    key = (event.get('headers') or {}).get('idempotency-key') or (event.get('headers') or {}).get('Idempotency-Key')
    if not isinstance(key, str) or not 1 <= len(key) <= 128:
        raise ApiError(422, 'IDEMPOTENCY_REQUIRED', 'Se requiere Idempotency-Key')
    digest = hashlib.sha256(json.dumps(body, sort_keys=True, default=str).encode()).hexdigest()
    command_pk = 'COMMAND#' + hashlib.sha256((actor + '|' + action + '|' + key).encode()).hexdigest()
    previous = get(command_pk)
    if previous:
        if previous['payload_hash'] != digest:
            raise ApiError(409, 'IDEMPOTENCY_CONFLICT', 'La clave corresponde a otra solicitud')
        return previous['result']
    now, event_id = timestamp(), str(uuid.uuid4())
    outbox = {'pk': 'OUTBOX#' + event_id, 'sk': 'META', 'entity_type': 'OUTBOX', 'id': event_id,
              'version': 1, 'status': 'PENDING', 'created_at': now, 'action': action,
              'deltas': deltas or {}, 'gsi1pk': 'OUTBOX_PENDING', 'gsi1sk': now + '#' + event_id}
    audit = {'pk': 'AUDIT#' + now[:10], 'sk': now + '#' + event_id, 'entity_type': 'AUDIT',
             'version': 1, 'actor': actor, 'action': action, 'references': result, 'created_at': now}
    receipt = {'pk': command_pk, 'sk': 'META', 'entity_type': 'COMMAND', 'version': 1,
               'payload_hash': digest, 'result': result, 'created_at': now}
    actions = [*operations, put(receipt), put(audit), put(outbox)]
    for period in {key.split('|', 1)[0] for key in (deltas or {})}:
        values = {key.split('|', 1)[1]: value for key, value in deltas.items() if key.startswith(period + '|')}
        actions += [put({'pk': 'LEDGER#' + period, 'sk': now + '#' + event_id, 'version': 1,
                         'entity_type': 'LEDGER', 'event_id': event_id, 'deltas': values}),
                    {'Update': {'TableName': table().name, 'Key': wire({'pk': 'REV#' + period, 'sk': 'LEDGER'}),
                                'UpdateExpression': 'ADD #v :one', 'ExpressionAttributeNames': {'#v': 'version'},
                                'ExpressionAttributeValues': wire({':one': 1})}}]
    keys = [(next(iter(op.values()))['TableName'], json.dumps(next(iter(op.values())).get('Key') or
             {k: next(iter(op.values()))['Item'][k] for k in ['pk', 'sk']}, sort_keys=True)) for op in actions]
    if len(keys) != len(set(keys)) or len(actions) > 100:
        raise ApiError(422, 'TRANSACTION_LIMIT', 'Divide el alta en operaciones más pequeñas')
    try:
        result_capacity = boto3.client('dynamodb').transact_write_items(TransactItems=actions, ReturnConsumedCapacity='INDEXES')
        capacities = result_capacity.get('ConsumedCapacity', [])
        print(json.dumps({'event': 'CORE_TRANSACTION', 'action_count': len(actions),
                          'read_units': sum(float(row['ReadCapacityUnits']) for row in capacities) if capacities and all('ReadCapacityUnits' in row for row in capacities) else None,
                          'write_units': sum(float(row['WriteCapacityUnits']) for row in capacities) if capacities and all('WriteCapacityUnits' in row for row in capacities) else None,
                          'consumed_capacity': sum(float(row.get('CapacityUnits', 0)) for row in result_capacity.get('ConsumedCapacity', []))}))
    except ClientError as exc:
        if exc.response['Error']['Code'] in ['TransactionCanceledException', 'ConditionalCheckFailedException']:
            previous = get(command_pk)
            if previous and previous['payload_hash'] == digest:
                return previous['result']
            raise ApiError(409, 'CONFLICT', 'El registro cambió; vuelve a cargar') from None
        raise
    return result


def replay(event, actor, action, body):
    key = (event.get('headers') or {}).get('idempotency-key') or (event.get('headers') or {}).get('Idempotency-Key')
    if not isinstance(key, str) or not 1 <= len(key) <= 128:
        raise ApiError(422, 'IDEMPOTENCY_REQUIRED', 'Se requiere Idempotency-Key')
    pk = 'COMMAND#' + hashlib.sha256((actor + '|' + action + '|' + key).encode()).hexdigest()
    old = get(pk)
    if old:
        digest = hashlib.sha256(json.dumps(body, sort_keys=True, default=str).encode()).hexdigest()
        if digest != old['payload_hash']:
            raise ApiError(409, 'IDEMPOTENCY_CONFLICT', 'La clave corresponde a otra solicitud')
        return old['result']


def expected(body, item):
    version = body.get('expected_version')
    if isinstance(version, bool) or not isinstance(version, int) or version < 1:
        raise ApiError(422, 'VERSION_REQUIRED', 'Se requiere expected_version')
    if version != item['version']:
        raise ApiError(409, 'CONFLICT', 'El registro cambió; vuelve a cargar')
    return version
