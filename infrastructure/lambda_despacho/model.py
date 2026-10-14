from decimal import Decimal, InvalidOperation
import hashlib
import re
import unicodedata

from contracts import ApiError, text

STAGES = {'NUEVO', 'CONTACTADO', 'ASESORIA', 'PROPUESTA', 'GANADO', 'PERDIDO'}
CASE_STATES = {'BORRADOR', 'ACTIVO', 'CERRADO', 'ARCHIVADO'}
ROLES = {'CLIENTE', 'REPRESENTADO', 'PAGADOR', 'CONTRAPARTE', 'OTRO'}
CURRENCIES = {'BOB', 'USD', 'EUR'}


def normalized(value):
    return ' '.join(''.join(c for c in unicodedata.normalize('NFKD', value) if not unicodedata.combining(c)).casefold().split())


def contact(value):
    if not isinstance(value, dict) or value.get('kind') not in {'PHONE', 'EMAIL'}:
        raise ApiError(422, 'INVALID_CONTACT', 'Contacto inválido')
    raw = text(value, 'value', 254, True)
    if value['kind'] == 'PHONE':
        raw = re.sub(r'[\s().-]', '', raw)
        if not re.fullmatch(r'\+[1-9]\d{7,14}', raw):
            raise ApiError(422, 'INVALID_PHONE', 'Usa código de país, por ejemplo +591')
    else:
        raw = raw.strip().lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', raw):
            raise ApiError(422, 'INVALID_EMAIL', 'Correo inválido')
    return {'kind': value['kind'], 'value': raw}


def person_fields(body):
    name = text(body, 'display_name', 160, True)
    norm = normalized(name)
    if len(norm) < 2:
        raise ApiError(422, 'INVALID_NAME', 'Nombre insuficiente')
    contacts = body.get('contacts', [])
    identifiers = body.get('identifiers', [])
    if not isinstance(contacts, list) or len(contacts) > 10 or not isinstance(identifiers, list) or len(identifiers) > 5:
        raise ApiError(422, 'INVALID_PERSON', 'Máximo diez contactos y cinco identificadores')
    contacts = [contact(c) for c in contacts]
    ids = []
    for value in identifiers:
        if not isinstance(value, dict):
            raise ApiError(422, 'INVALID_IDENTIFIER', 'Identificador inválido')
        ids.append({k: text(value, k, 120, True).strip().upper() for k in ['country', 'issuer', 'kind', 'value']})
    if not isinstance(body.get('is_client', False), bool):
        raise ApiError(422, 'INVALID_CLIENT', 'is_client debe ser booleano')
    return {'display_name': name, 'normalized_name': norm, 'contacts': contacts, 'identifiers': ids,
            'is_client': body.get('is_client', False), 'gsi2pk': 'PERSON_NAME#' + norm[:2], 'gsi2sk': norm}


def lookup_keys(fields):
    values = [('CONTACT', c['kind'] + '|' + c['value']) for c in fields.get('contacts', [])]
    values += [('IDENTIFIER', '|'.join(c[k] for k in ['country', 'issuer', 'kind', 'value'])) for c in fields.get('identifiers', [])]
    return {'LOOKUP#' + kind + '#' + hashlib.sha256(value.encode()).hexdigest() for kind, value in values}


def choice(body, field, values, default=None):
    value = body.get(field, default)
    if value not in values:
        raise ApiError(422, 'INVALID_FIELD', 'Campo inválido: ' + field)
    return value


def minor(value):
    try:
        if isinstance(value, (float, bool)):
            raise ValueError()
        amount = Decimal(str(value))
        if not amount.is_finite() or amount <= 0 or amount.as_tuple().exponent < -2 or amount > Decimal('999999999.99'):
            raise ValueError()
        return int(amount * 100)
    except (ValueError, InvalidOperation, TypeError):
        raise ApiError(422, 'INVALID_AMOUNT', 'Importe positivo con hasta dos decimales') from None


def currency(body):
    return choice(body, 'currency', CURRENCIES)
