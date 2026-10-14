"""Trust only Gateway authorizer context; never decode a caller-supplied JWT here."""
import json
import os
import re
import time
from contracts import ApiError

PUBLIC = {('GET','/api/availability'),('GET','/api/schedule'),('GET','/api/blog'),('POST','/api/appointments'),('POST','/api/probono'),('POST','/api/chat')}

def require_admin(event):
    claims = event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims')
    if not claims:
        raise ApiError(401, 'AUTH_REQUIRED', 'Inicia sesión para continuar')
    issuer, client = os.getenv('COGNITO_ISSUER'), os.getenv('COGNITO_CLIENT_ID')
    if not issuer or not client:
        raise ApiError(503, 'AUTH_NOT_CONFIGURED', 'Autenticación no configurada')
    try:
        valid_time = int(claims.get('exp',0)) > time.time() and int(claims.get('iat',0)) <= time.time()
    except (TypeError, ValueError):
        valid_time = False
    if claims.get('iss') != issuer or claims.get('client_id') != client or claims.get('token_use') != 'access' or not valid_time:
        raise ApiError(401, 'INVALID_TOKEN', 'Sesión inválida o vencida')
    groups = claims.get('cognito:groups', [])
    if isinstance(groups, str):
        try:
            groups = json.loads(groups)
        except ValueError:
            groups = [x.strip(' \"\'[]') for x in re.split(',', groups)]
    if not isinstance(groups, list) or 'Admins' not in groups:
        raise ApiError(403, 'FORBIDDEN', 'No tienes permiso administrativo')
    return claims.get('sub', 'unknown')

def route_access(event, method, path):
    is_admin_path = path.startswith('/api/admin/')
    normalized = '/api/' + path[len('/api/admin/'):] if is_admin_path else path
    public = (method, normalized) in PUBLIC or (method == 'GET' and re.fullmatch(r'/api/blog/[^/]+', normalized))
    if public and not is_admin_path:
        return normalized, False, 'anonymous'
    private = normalized in ('/api/appointments','/api/schedule','/api/blog','/api/probono','/api/crm/leads','/api/chat/leads') or re.fullmatch(r'/api/(appointments|blog|probono|crm/leads|chat/leads)/[^/]+', normalized)
    if not private:
        raise ApiError(404, 'NOT_FOUND', 'Ruta no encontrada')
    return normalized, True, require_admin(event)
