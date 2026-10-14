"""Small explicit contracts shared by HTTP handlers and model tools."""
import base64
import json
import re
from decimal import Decimal

class ApiError(Exception):
    def __init__(self, status, code, message):
        self.status, self.code, self.message = status, code, message
        super().__init__(message)

def text(body, key, maximum=500, required=False):
    value = body.get(key, '')
    if not isinstance(value, str) or len(value) > maximum or (required and not value.strip()):
        raise ApiError(422, 'INVALID_FIELD', f'Campo inválido: {key}')
    return value.strip()

def phone(body, key='phone', required=True):
    value = text(body, key, 32, required)
    digits = re.sub(r'[\s()+.-]', '', value)
    if value and not re.fullmatch(r'\d{7,15}', digits):
        raise ApiError(422, 'INVALID_PHONE', 'Teléfono inválido')
    return value

def money(value):
    if isinstance(value, bool):
        raise ApiError(422, 'INVALID_AMOUNT', 'Importe inválido')
    try:
        number = Decimal(str(value))
        if not number.is_finite() or number < 0 or number > Decimal('999999999.99') or number.as_tuple().exponent < -2:
            raise ValueError()
        return number
    except (ValueError, ArithmeticError):
        raise ApiError(422, 'INVALID_AMOUNT', 'Importe inválido; máximo dos decimales') from None

def body_of(event):
    raw = event.get('body') or '{}'
    if event.get('isBase64Encoded'):
        try:
            raw = base64.b64decode(raw, validate=True).decode('utf-8')
        except (ValueError, UnicodeError):
            raise ApiError(400, 'INVALID_JSON', 'JSON inválido') from None
    if len(raw.encode('utf-8')) > 32000:
        raise ApiError(413, 'PAYLOAD_TOO_LARGE', 'Solicitud demasiado grande')
    try:
        value = json.loads(raw, parse_float=Decimal, parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
    except (ValueError, TypeError):
        raise ApiError(400, 'INVALID_JSON', 'JSON inválido') from None
    if not isinstance(value, dict):
        raise ApiError(422, 'INVALID_BODY', 'Se requiere un objeto JSON')
    return value
