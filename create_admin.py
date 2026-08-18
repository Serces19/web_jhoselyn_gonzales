import boto3

client = boto3.client('cognito-idp', region_name='us-east-1')
pool_id = 'us-east-1_WIEGYaEgn'
email = 'scope.estudio@gmail.com'
password = 'ScopeEstudio1!'

try:
    response = client.admin_create_user(
        UserPoolId=pool_id,
        Username=email,
        UserAttributes=[
            {'Name': 'email', 'Value': email},
            {'Name': 'email_verified', 'Value': 'true'}
        ],
        TemporaryPassword=password,
        MessageAction='SUPPRESS'
    )
    print("User created.")
    
    client.admin_set_user_password(
        UserPoolId=pool_id,
        Username=email,
        Password=password,
        Permanent=True
    )
    print("Password set permanently.")
    
    client.admin_add_user_to_group(
        UserPoolId=pool_id,
        Username=email,
        GroupName='Admins'
    )
    print("Added to Admins group.")
except Exception as e:
    print("Error:", e)
