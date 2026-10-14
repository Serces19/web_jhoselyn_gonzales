"""Outbox relay and idempotent metrics consumer. No external customer messages."""
import json
import os
import time

import boto3
from boto3.dynamodb.types import TypeDeserializer
from botocore.exceptions import ClientError
import repository as r


def enqueue(event_id):
    return boto3.client('sqs').send_message(QueueUrl=os.environ['JOBS_QUEUE_URL'],
                MessageBody=json.dumps({'event_id': event_id}), MessageGroupId='desk-metrics', MessageDeduplicationId=event_id)


def relay(event, context):
    failures, decoder = [], TypeDeserializer()
    for record in event.get('Records', []):
        try:
            image = {k: decoder.deserialize(v) for k, v in record.get('dynamodb', {}).get('NewImage', {}).items()}
            if record.get('eventName') == 'INSERT' and image.get('entity_type') == 'OUTBOX' and image.get('status') == 'PENDING':
                enqueue(image['id'])
        except Exception as exc:
            print(json.dumps({'code': type(exc).__name__, 'event': 'OUTBOX_RELAY_FAILED'}))
            failures.append({'itemIdentifier': record['dynamodb']['SequenceNumber']})
    return {'batchItemFailures': failures}


def apply(event_id):
    item = r.get('OUTBOX#' + event_id, required=True)
    if r.get('APPLIED#metrics#' + event_id):
        return
    operations = [r.put({'pk': 'APPLIED#metrics#' + event_id, 'sk': 'META', 'version': 1, 'applied_at': r.timestamp()}),
                  r.put({k: v for k, v in {**item, 'status': 'DONE', 'version': item['version'] + 1}.items() if k not in {'gsi1pk', 'gsi1sk'}}, item['version'])]
    for metric, delta in item.get('deltas', {}).items():
        if not delta:
            continue
        period, name = metric.split('|', 1)
        operations.append({'Update': {'TableName': r.table().name, 'Key': r.wire({'pk': 'METRIC#' + period, 'sk': name}),
            'UpdateExpression': 'SET updated_at = :now ADD #value :delta',
            'ExpressionAttributeNames': {'#value': 'value'}, 'ExpressionAttributeValues': r.wire({':now': r.timestamp(), ':delta': int(delta)})}})
    for period in {key.split('|', 1)[0] for key in item.get('deltas', {})}:
        operations.append({'Update': {'TableName': r.table().name, 'Key': r.wire({'pk': 'REV#' + period, 'sk': 'METRICS'}),
            'UpdateExpression': 'ADD #v :one', 'ExpressionAttributeNames': {'#v': 'version'},
            'ExpressionAttributeValues': r.wire({':one': 1})}})
    try:
        boto3.client('dynamodb').transact_write_items(TransactItems=operations)
    except ClientError:
        if r.get('APPLIED#metrics#' + event_id):
            return
        raise


def consume(event, context):
    failures = []
    records = event.get('Records', [])
    for index, record in enumerate(records):
        try:
            apply(json.loads(record['body'])['event_id'])
        except Exception as exc:
            print(json.dumps({'code': type(exc).__name__, 'event': 'METRICS_FAILED'}))
            # FIFO: do not acknowledge later records after the first failed record.
            failures.extend({'itemIdentifier': row['messageId']} for row in records[index:])
            break
    return {'batchItemFailures': failures}


def reconcile(event, context):
    state = r.get('CONFIG#OUTBOX_RECONCILE')
    saved = event.get('cursor') or (state or {}).get('cursor')
    rows, cursor = r.query('OUTBOX_PENDING', {'limit': 100, **({'cursor': saved} if saved else {})}, 'GSI1')
    sent = 0
    for row in rows:
        current = r.get(row['pk'], row['sk'])
        if current and current['status'] == 'PENDING':
            enqueue(current['id'])
            sent += 1
    version = int((state or {}).get('version', 0))
    operation = r.put({'pk': 'CONFIG#OUTBOX_RECONCILE', 'sk': 'META', 'version': version + 1,
                       'cursor': cursor, 'updated_at': r.timestamp()}, version or None)
    boto3.client('dynamodb').transact_write_items(TransactItems=[operation])
    return {'enqueued': sent, 'next_cursor': cursor}
