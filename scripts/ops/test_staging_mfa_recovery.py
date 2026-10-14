"""Lost-authenticator recovery test, strictly in the disposable staging Cognito pool."""
import argparse
import json
from pathlib import Path
import secrets
import time

import boto3
from test_staging_e0 import totp

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    cognito = session.client('cognito-idp')
    pools = [pool for page in cognito.get_paginator('list_user_pools').paginate(MaxResults=60)
             for pool in page['UserPools'] if pool['Name'] == 'staging-e0-jhoselyn_web_pool']
    assert len(pools) == 1
    pool = pools[0]['Id']
    assert pool != 'us-east-1_WIEGYaEgn'
    client = next(c['ClientId'] for c in cognito.list_user_pool_clients(UserPoolId=pool)['UserPoolClients']
                  if c['ClientName'] == 'staging-e0-jhoselyn_web_app_client')
    username = 'e0-recovery-' + secrets.token_hex(4) + '@example.invalid'
    password = 'E0!' + secrets.token_urlsafe(30) + 'aZ9'
    result = cognito.admin_create_user(UserPoolId=pool, Username=username, MessageAction='SUPPRESS',
                                      UserAttributes=[{'Name': 'email', 'Value': username}])
    username = result['User']['Username']
    cognito.admin_set_user_password(UserPoolId=pool, Username=username, Password=password, Permanent=True)

    def login():
        return cognito.initiate_auth(ClientId=client, AuthFlow='USER_PASSWORD_AUTH',
                                    AuthParameters={'USERNAME': username, 'PASSWORD': password})

    initial = login()
    if initial.get('ChallengeName') == 'MFA_SETUP':
        associated = cognito.associate_software_token(Session=initial['Session'])
        verified = cognito.verify_software_token(Session=associated['Session'], UserCode=totp(associated['SecretCode']))
        initial = cognito.respond_to_auth_challenge(ClientId=client, ChallengeName='MFA_SETUP',
                  Session=verified['Session'], ChallengeResponses={'USERNAME': username})
        token = initial['AuthenticationResult']['AccessToken']
    else:
        token = initial['AuthenticationResult']['AccessToken']
        secret = cognito.associate_software_token(AccessToken=token)['SecretCode']
        assert cognito.verify_software_token(AccessToken=token, UserCode=totp(secret))['Status'] == 'SUCCESS'
    cognito.set_user_mfa_preference(AccessToken=token, SoftwareTokenMfaSettings={'Enabled': True, 'PreferredMfa': True})
    cognito.set_user_pool_mfa_config(UserPoolId=pool, MfaConfiguration='ON', SoftwareTokenMfaConfiguration={'Enabled': True})
    cognito.admin_user_global_sign_out(UserPoolId=pool, Username=username)
    cognito.admin_delete_software_token(UserPoolId=pool, Username=username)
    challenge = login()
    assert challenge['ChallengeName'] == 'MFA_SETUP'
    associated = cognito.associate_software_token(Session=challenge['Session'])
    replacement = associated['SecretCode']
    verified = cognito.verify_software_token(Session=associated['Session'], UserCode=totp(replacement))
    assert verified['Status'] == 'SUCCESS'
    registered = cognito.respond_to_auth_challenge(ClientId=client, ChallengeName='MFA_SETUP',
                    Session=verified['Session'], ChallengeResponses={'USERNAME': username})
    assert registered.get('AuthenticationResult')
    cognito.set_user_mfa_preference(AccessToken=registered['AuthenticationResult']['AccessToken'],
                                   SoftwareTokenMfaSettings={'Enabled': True, 'PreferredMfa': True})
    time.sleep(31 - time.time() % 30)
    challenge = login()
    assert challenge['ChallengeName'] == 'SOFTWARE_TOKEN_MFA'
    result = cognito.respond_to_auth_challenge(ClientId=client, ChallengeName='SOFTWARE_TOKEN_MFA',
                    Session=challenge['Session'], ChallengeResponses={'USERNAME': username, 'SOFTWARE_TOKEN_MFA_CODE': totp(replacement)})
    assert result.get('AuthenticationResult')
    assert cognito.get_user_pool_mfa_config(UserPoolId=pool)['MfaConfiguration'] == 'ON'
    report = {'environment': 'staging-e0-', 'mfa_required_throughout_recovery': True,
              'administrative_factor_removal': 'passed', 'new_login_challenge': 'MFA_SETUP',
              'replacement_registered': True, 'next_login_totp_verified': True,
              'production_users_modified': False, 'external_messages_sent': False}
    (ROOT / 'docs/operations/mfa-recovery-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
