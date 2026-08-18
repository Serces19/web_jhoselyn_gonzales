import json
import boto3
import uuid
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
appointments_table = dynamodb.Table(os.environ.get('APPOINTMENTS_TABLE', 'Appointments'))
blocks_table = dynamodb.Table(os.environ.get('BLOCKS_TABLE', 'AvailabilityBlocks'))
blog_table = dynamodb.Table(os.environ.get('BLOG_TABLE', 'BlogPosts'))
probono_table = dynamodb.Table(os.environ.get('PROBONO_TABLE', 'ProBonoRequests'))

def build_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,PATCH,DELETE'
        },
        'body': json.dumps(body, default=str)
    }

def get_default_schedule():
    hours = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
    return {
        'monday': hours, 'tuesday': hours, 'wednesday': hours,
        'thursday': hours, 'friday': hours, 'saturday': [], 'sunday': []
    }

def lambda_handler(event, context):
    path = event.get('rawPath', '')
    http_method = event.get('requestContext', {}).get('http', {}).get('method', '')
    if not path:
        path = event.get('path', '')
        http_method = event.get('httpMethod', '')

    print(f"Received request: {http_method} {path}")

    if http_method == 'OPTIONS':
        return build_response(200, '')

    try:
        # ==========================================
        # AVAILABILITY
        # ==========================================
        if path == '/api/availability' and http_method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            date_str = query_params.get('date')
            if not date_str:
                return build_response(400, {'error': 'Missing date parameter'})
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
            day_name = days[dt.weekday()]
            schedule_resp = blocks_table.get_item(Key={'block_id': 'WEEKLY_SCHEDULE'})
            weekly_schedule = schedule_resp['Item'].get('schedule', get_default_schedule()) if 'Item' in schedule_resp else get_default_schedule()
            day_available_hours = weekly_schedule.get(day_name, [])
            appointments_resp = appointments_table.query(
                IndexName='DateIndex',
                ExpressionAttributeNames={"#d": "date"},
                ExpressionAttributeValues={":d": date_str},
                KeyConditionExpression="#d = :d"
            )
            booked_times = [item['time'] for item in appointments_resp.get('Items', []) if item['status'] not in ('CANCELLED',)]
            available_times = [t for t in day_available_hours if t not in booked_times]
            return build_response(200, {'available_times': available_times})

        # ==========================================
        # APPOINTMENTS
        # ==========================================
        elif path == '/api/appointments' and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            for field in ['name', 'phone', 'date', 'time']:
                if field not in body:
                    return build_response(400, {'error': f'Missing required field: {field}'})
            appointment_id = str(uuid.uuid4())
            item = {
                'appointment_id': appointment_id,
                'user_id': body.get('user_id', 'anonymous'),
                'name': body['name'], 'phone': body['phone'],
                'email': body.get('email', ''), 'date': body['date'],
                'time': body['time'], 'reason': body.get('reason', ''),
                'status': body.get('status', 'PENDING_APPROVAL'),
                'created_at': datetime.utcnow().isoformat()
            }
            appointments_table.put_item(Item=item)
            return build_response(201, {'message': 'Appointment created', 'appointment_id': appointment_id, 'status': item['status']})

        elif path == '/api/appointments' and http_method == 'GET':
            resp = appointments_table.scan()
            return build_response(200, {'appointments': resp.get('Items', [])})

        elif path.startswith('/api/appointments/') and http_method == 'PATCH':
            appointment_id = path.split('/')[-1]
            body = json.loads(event.get('body', '{}'))
            fields = ['status', 'name', 'phone', 'email', 'date', 'time', 'reason']
            updates, expr_names, expr_values = [], {}, {}
            for field in fields:
                if field in body:
                    updates.append(f"#{field} = :{field}")
                    expr_names[f"#{field}"] = field
                    expr_values[f":{field}"] = body[field]
            if not updates:
                return build_response(400, {'error': 'No fields to update'})
            appointments_table.update_item(
                Key={'appointment_id': appointment_id},
                UpdateExpression="SET " + ", ".join(updates),
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_values
            )
            return build_response(200, {'message': 'Appointment updated'})

        # ==========================================
        # SCHEDULE
        # ==========================================
        elif path == '/api/schedule' and http_method == 'GET':
            schedule_resp = blocks_table.get_item(Key={'block_id': 'WEEKLY_SCHEDULE'})
            schedule = schedule_resp['Item'].get('schedule', get_default_schedule()) if 'Item' in schedule_resp else get_default_schedule()
            return build_response(200, {'schedule': schedule})

        elif path == '/api/schedule' and http_method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            schedule = body.get('schedule')
            if not schedule:
                return build_response(400, {'error': 'Missing schedule object'})
            blocks_table.put_item(Item={'block_id': 'WEEKLY_SCHEDULE', 'schedule': schedule})
            return build_response(200, {'message': 'Schedule updated', 'schedule': schedule})

        # ==========================================
        # BLOG
        # ==========================================
        elif path == '/api/blog' and http_method == 'GET':
            resp = blog_table.scan()
            posts = sorted(resp.get('Items', []), key=lambda x: x.get('created_at', ''), reverse=True)
            # Don't return full content in listing
            for p in posts:
                p.pop('content', None)
            return build_response(200, {'posts': posts})

        elif path.startswith('/api/blog/') and path.count('/') == 3 and http_method == 'GET':
            slug = path.split('/')[-1]
            resp = blog_table.scan(
                FilterExpression='#slug = :slug',
                ExpressionAttributeNames={'#slug': 'slug'},
                ExpressionAttributeValues={':slug': slug}
            )
            items = resp.get('Items', [])
            if not items:
                return build_response(404, {'error': 'Post not found'})
            return build_response(200, {'post': items[0]})

        elif path == '/api/blog' and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            for field in ['title', 'content']:
                if field not in body:
                    return build_response(400, {'error': f'Missing field: {field}'})
            post_id = str(uuid.uuid4())
            # Generate slug from title
            import re
            slug = re.sub(r'[^a-z0-9]+', '-', body['title'].lower()).strip('-')
            item = {
                'post_id': post_id, 'title': body['title'],
                'slug': body.get('slug', slug), 'content': body['content'],
                'excerpt': body.get('excerpt', body['content'][:180] + '...'),
                'category': body.get('category', ''), 'author': body.get('author', 'Jhoselyn Gonzales'),
                'image_url': body.get('image_url', ''), 'published': body.get('published', True),
                'created_at': datetime.utcnow().isoformat()
            }
            blog_table.put_item(Item=item)
            return build_response(201, {'message': 'Post created', 'post_id': post_id, 'slug': item['slug']})

        elif path.startswith('/api/blog/') and http_method == 'PUT':
            post_id = path.split('/')[-1]
            body = json.loads(event.get('body', '{}'))
            fields = ['title', 'content', 'excerpt', 'category', 'image_url', 'published', 'slug']
            updates, expr_names, expr_values = [], {}, {}
            for field in fields:
                if field in body:
                    updates.append(f"#{field} = :{field}")
                    expr_names[f"#{field}"] = field
                    expr_values[f":{field}"] = body[field]
            if not updates:
                return build_response(400, {'error': 'No fields to update'})
            blog_table.update_item(
                Key={'post_id': post_id},
                UpdateExpression="SET " + ", ".join(updates),
                ExpressionAttributeNames=expr_names, ExpressionAttributeValues=expr_values
            )
            return build_response(200, {'message': 'Post updated'})

        elif path.startswith('/api/blog/') and http_method == 'DELETE':
            post_id = path.split('/')[-1]
            blog_table.delete_item(Key={'post_id': post_id})
            return build_response(200, {'message': 'Post deleted'})

        # ==========================================
        # PRO BONO
        # ==========================================
        elif path == '/api/probono' and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            req_id = str(uuid.uuid4())
            item = {
                'request_id': req_id, 'name': body.get('name', ''),
                'phone': body.get('phone', ''), 'email': body.get('email', ''),
                'location': body.get('location', ''), 'case_type': body.get('case_type', ''),
                'description': body.get('description', ''), 'income': body.get('income', ''),
                'status': 'PENDING', 'created_at': datetime.utcnow().isoformat()
            }
            probono_table.put_item(Item=item)
            return build_response(201, {'message': 'Pro bono request submitted', 'request_id': req_id})

        elif path == '/api/probono' and http_method == 'GET':
            resp = probono_table.scan()
            items = sorted(resp.get('Items', []), key=lambda x: x.get('created_at', ''), reverse=True)
            return build_response(200, {'requests': items})

        elif path.startswith('/api/probono/') and http_method == 'PATCH':
            req_id = path.split('/')[-1]
            body = json.loads(event.get('body', '{}'))
            status = body.get('status', 'REVIEWING')
            probono_table.update_item(
                Key={'request_id': req_id},
                UpdateExpression='SET #s = :s',
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={':s': status}
            )
            return build_response(200, {'message': 'Status updated'})

        # ==========================================
        # CHATBOT AI & LEADS
        # ==========================================
        elif path == '/api/chat' and http_method == 'POST':
            from agent_core import process_chat_message
            body = json.loads(event.get('body', '{}'))
            session_id = body.get('session_id')
            message = body.get('message', '')
            if not message:
                return build_response(400, {'error': 'Missing message parameter'})
            result = process_chat_message(session_id, message)
            return build_response(200, result)

        elif path == '/api/chat/leads' and http_method == 'GET':
            from agent_core import leads_table
            resp = leads_table.scan()
            items = sorted(resp.get('Items', []), key=lambda x: x.get('created_at', ''), reverse=True)
            return build_response(200, {'leads': items})

        elif path.startswith('/api/chat/leads/') and http_method == 'PATCH':
            from agent_core import leads_table
            lead_id = path.split('/')[-1]
            body = json.loads(event.get('body', '{}'))
            status = body.get('status', 'CONTACTADO')
            leads_table.update_item(
                Key={'lead_id': lead_id},
                UpdateExpression='SET #s = :s',
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={':s': status}
            )
            return build_response(200, {'message': 'Lead status updated'})

        return build_response(404, {'error': 'Route not found'})

    except Exception as e:
        print(f"Error: {str(e)}")
        return build_response(500, {'error': 'Internal server error', 'details': str(e)})
