import json
import boto3
import uuid
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
appointments_table = dynamodb.Table(os.environ.get('APPOINTMENTS_TABLE', 'Appointments'))
blocks_table = dynamodb.Table(os.environ.get('BLOCKS_TABLE', 'AvailabilityBlocks'))

def build_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,PATCH,DELETE'
        },
        'body': json.dumps(body)
    }

def get_default_schedule():
    hours = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
    return {
        'monday': hours,
        'tuesday': hours,
        'wednesday': hours,
        'thursday': hours,
        'friday': hours,
        'saturday': [],
        'sunday': []
    }

def lambda_handler(event, context):
    path = event.get('rawPath', '')
    http_method = event.get('requestContext', {}).get('http', {}).get('method', '')
    
    # Fallback for REST API payload format
    if not path:
        path = event.get('path', '')
        http_method = event.get('httpMethod', '')

    print(f"Received request: {http_method} {path}")

    if http_method == 'OPTIONS':
        return build_response(200, '')

    try:
        # ==========================================
        # PUBLIC ENDPOINTS
        # ==========================================
        
        # 1. GET Availability
        if path == '/api/availability' and http_method == 'GET':
            query_params = event.get('queryStringParameters', {})
            date_str = query_params.get('date')
            
            if not date_str:
                return build_response(400, {'error': 'Missing date parameter'})
                
            # Get day of week
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            day_name = days[dt.weekday()]
            
            # Fetch Weekly Schedule
            schedule_resp = blocks_table.get_item(Key={'block_id': 'WEEKLY_SCHEDULE'})
            if 'Item' in schedule_resp:
                weekly_schedule = schedule_resp['Item'].get('schedule', get_default_schedule())
            else:
                weekly_schedule = get_default_schedule()
                
            day_available_hours = weekly_schedule.get(day_name, [])
                
            # Fetch booked appointments for this date
            appointments_resp = appointments_table.query(
                IndexName='DateIndex',
                ExpressionAttributeNames={"#d": "date"},
                ExpressionAttributeValues={":d": date_str},
                KeyConditionExpression="#d = :d"
            )
            
            booked_times = [item['time'] for item in appointments_resp.get('Items', []) if item['status'] not in ('CANCELLED')]
            
            # Filter available hours
            available_times = [t for t in day_available_hours if t not in booked_times]
            
            return build_response(200, {'available_times': available_times})

        # 2. POST Appointment (Booking)
        elif path == '/api/appointments' and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            required_fields = ['name', 'phone', 'date', 'time']
            for field in required_fields:
                if field not in body:
                    return build_response(400, {'error': f'Missing required field: {field}'})
                    
            appointment_id = str(uuid.uuid4())
            item = {
                'appointment_id': appointment_id,
                'user_id': body.get('user_id', 'anonymous'),
                'name': body['name'],
                'phone': body['phone'],
                'email': body.get('email', ''),
                'date': body['date'],
                'time': body['time'],
                'reason': body.get('reason', ''),
                'status': body.get('status', 'PENDING_APPROVAL'),
                'created_at': datetime.utcnow().isoformat()
            }
            
            appointments_table.put_item(Item=item)
            
            return build_response(201, {
                'message': 'Appointment created successfully',
                'appointment_id': appointment_id,
                'status': item['status']
            })
            
        # ==========================================
        # ADMIN ENDPOINTS
        # ==========================================
        # 3. GET All Appointments
        elif path == '/api/appointments' and http_method == 'GET':
            resp = appointments_table.scan()
            return build_response(200, {'appointments': resp.get('Items', [])})

        # 4. PATCH Appointment
        elif path.startswith('/api/appointments/') and http_method == 'PATCH':
            appointment_id = path.split('/')[-1]
            body = json.loads(event.get('body', '{}'))
            
            fields_to_update = ['status', 'name', 'phone', 'email', 'date', 'time', 'reason']
            updates = []
            expr_names = {}
            expr_values = {}
            
            for field in fields_to_update:
                if field in body:
                    updates.append(f"#{field} = :{field}")
                    expr_names[f"#{field}"] = field
                    expr_values[f":{field}"] = body[field]
                    
            if not updates:
                return build_response(400, {'error': 'No fields to update'})
                
            update_expr = "SET " + ", ".join(updates)
            
            appointments_table.update_item(
                Key={'appointment_id': appointment_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_values
            )
            return build_response(200, {'message': 'Appointment updated'})
            
        # 5. GET Schedule
        elif path == '/api/schedule' and http_method == 'GET':
            schedule_resp = blocks_table.get_item(Key={'block_id': 'WEEKLY_SCHEDULE'})
            if 'Item' in schedule_resp:
                schedule = schedule_resp['Item'].get('schedule', get_default_schedule())
            else:
                schedule = get_default_schedule()
            return build_response(200, {'schedule': schedule})
            
        # 6. PUT Schedule
        elif path == '/api/schedule' and http_method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            schedule = body.get('schedule')
            if not schedule:
                return build_response(400, {'error': 'Missing schedule object'})
                
            blocks_table.put_item(Item={
                'block_id': 'WEEKLY_SCHEDULE',
                'schedule': schedule
            })
            return build_response(200, {'message': 'Schedule updated successfully', 'schedule': schedule})

        return build_response(404, {'error': 'Route not found'})

    except Exception as e:
        print(f"Error: {str(e)}")
        return build_response(500, {'error': 'Internal server error', 'details': str(e)})
