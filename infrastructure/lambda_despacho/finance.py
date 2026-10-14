from datetime import date
import uuid

from contracts import ApiError, text
import model
import repository as r


def due_operations(changes):
    """Transactional daily balances; bounded report jobs never scan case/payment rows."""
    totals, operations, months = {}, [], set()
    for quota, delta in changes:
        key = (quota['due_date'], quota['currency'])
        totals[key] = totals.get(key, 0) + delta
    for (day, ccy), delta in totals.items():
        pk, sk = 'DUE_BALANCE#' + day[:7], day + '#' + ccy
        old = r.get(pk, sk)
        amount = int(old['outstanding_minor']) if old else 0
        if amount + delta < 0:
            raise ApiError(409, 'DUE_BALANCE_CONFLICT', 'Saldo de vencimiento inconsistente')
        operations.append(r.put({'pk': pk, 'sk': sk, 'version': int(old['version']) + 1 if old else 1,
            'due_date': day, 'currency': ccy, 'outstanding_minor': amount + delta}, old['version'] if old else None))
        month = day[:7]
        if month not in months and not r.get('DUE_MONTHS', month):
            operations.append(r.put({'pk': 'DUE_MONTHS', 'sk': month, 'version': 1}))
        months.add(month)
    if totals:
        operations.append({'Update': {'TableName': r.table().name, 'Key': r.wire({'pk': 'REV#FINANCE', 'sk': 'DUE'}),
            'UpdateExpression': 'ADD #v :one', 'ExpressionAttributeNames': {'#v': 'version'},
            'ExpressionAttributeValues': r.wire({':one': 1})}})
    return operations


def effective_date(body):
    value = text(body, 'effective_date', 10, True)
    try:
        if date.fromisoformat(value).isoformat() != value:
            raise ValueError()
    except ValueError:
        raise ApiError(422, 'INVALID_DATE', 'Fecha inválida') from None
    return value


def balance(case_id, currency):
    pk, sk = 'CASE#' + case_id, 'BALANCE#' + currency
    old = r.get(pk, sk)
    return old or {'pk': pk, 'sk': sk, 'version': 0, 'currency': currency, 'agreed_minor': 0,
                   'allocated_minor': 0, 'received_minor': 0, 'unassigned_minor': 0, 'expenses_minor': 0, 'client_funds_minor': 0}


def balance_put(old, **changes):
    return r.put({**old, **changes, 'version': old['version'] + 1}, old['version'] if old['version'] else None)


def invoice_metadata(body):
    value = body.get('invoice_metadata')
    if value is None: return None
    if not isinstance(value, dict) or set(value) - {'number', 'cuf', 'reference', 'notes'}:
        raise ApiError(422, 'INVALID_INVOICE_METADATA', 'Referencia fiscal inválida')
    fields = {key: text(value, key, limit) for key, limit in [('number', 100), ('cuf', 150), ('reference', 200), ('notes', 1000)]}
    if not any(fields.values()):
        raise ApiError(422, 'INVALID_INVOICE_METADATA', 'Registra al menos una referencia fiscal real')
    return {**fields, 'source': 'MANUAL', 'siat_issued_by_system': False, 'attachment_status': 'NOT_UPLOADED_E2_PENDING'}


def agreement(event, actor, case_id, body):
    case = r.get('CASE#' + case_id, required=True)
    ccy, amount, day = model.currency(body), model.minor(body.get('amount')), effective_date(body)
    quotas = body.get('installments')
    if not isinstance(quotas, list) or not 1 <= len(quotas) <= 20:
        raise ApiError(422, 'INVALID_INSTALLMENTS', 'Define de una a veinte cuotas')
    identifier = str(uuid.uuid4())
    rows, total = [], 0
    for value in quotas:
        if not isinstance(value, dict):
            raise ApiError(422, 'INVALID_INSTALLMENTS', 'Cuota inválida')
        due = effective_date({'effective_date': value.get('due_date')})
        value_minor, quota_id = model.minor(value.get('amount')), str(uuid.uuid4())
        total += value_minor
        rows.append({'pk': case['pk'], 'sk': 'INSTALLMENT#' + quota_id, 'id': quota_id, 'version': 1,
                     'entity_type': 'INSTALLMENT', 'agreement_id': identifier, 'amount_minor': value_minor,
                     'paid_minor': 0, 'currency': ccy, 'due_date': due,
                     'gsi2pk': 'DUE_INSTALLMENT#' + due[:7], 'gsi2sk': due + '#' + quota_id})
    if total != amount:
        raise ApiError(422, 'INSTALLMENTS_TOTAL', 'La suma de cuotas debe coincidir con honorarios')
    old = balance(case_id, ccy)
    item = {'pk': case['pk'], 'sk': 'AGREEMENT#' + identifier, 'id': identifier, 'version': 1,
            'entity_type': 'AGREEMENT', 'currency': ccy, 'amount_minor': amount, 'effective_date': day,
            'description': text(body, 'description', 1000, True), 'created_at': r.timestamp()}
    operations = [r.check(case), r.put(item), *[r.put(row) for row in rows],
                  balance_put(old, agreed_minor=int(old['agreed_minor']) + amount)]
    operations += due_operations([(row, int(row['amount_minor'])) for row in rows])
    return r.commit(event, actor, 'POST/casos/' + case_id + '/honorarios', body, operations,
                    {'agreement_id': identifier, 'installment_ids': [row['id'] for row in rows]},
                    {day[:7] + '|AGREED#' + ccy: amount})


def payment(event, actor, case_id, body):
    case = r.get('CASE#' + case_id, required=True)
    if body.get('confirmed') is not True:
        raise ApiError(422, 'RECONCILIATION_REQUIRED', 'Confirma la recepción real antes de registrar el cobro')
    ccy, amount, day = model.currency(body), model.minor(body.get('amount')), effective_date(body)
    payer = text(body, 'payer_id', 80, True)
    person = r.get('PERSON#' + payer, required=True)
    parties, _ = r.query(case['pk'], {'limit': 100}, prefix='PARTY#')
    if not any(p['person_id'] == payer and p['role'] in {'CLIENTE', 'REPRESENTADO', 'PAGADOR'} for p in parties):
        raise ApiError(422, 'INVALID_PAYER', 'El pagador debe estar vinculado al caso')
    kind = model.choice(body, 'kind', {'HONORARIOS', 'FONDOS_CLIENTE'}, 'HONORARIOS')
    allocations = body.get('allocations', [])
    if not isinstance(allocations, list) or len(allocations) > 20 or (kind == 'FONDOS_CLIENTE' and allocations):
        raise ApiError(422, 'INVALID_ALLOCATIONS', 'Asignaciones inválidas')
    rows, keys, allocated = [], set(), 0
    for allocation in allocations:
        if not isinstance(allocation, dict):
            raise ApiError(422, 'INVALID_ALLOCATIONS', 'Asignación inválida')
        quota_id = text(allocation, 'installment_id', 80, True)
        if quota_id in keys:
            raise ApiError(422, 'DUPLICATE_ALLOCATION', 'Cuota repetida')
        keys.add(quota_id)
        quota = r.get(case['pk'], 'INSTALLMENT#' + quota_id, required=True)
        value = model.minor(allocation.get('amount'))
        if quota['currency'] != ccy or int(quota['paid_minor']) + value > int(quota['amount_minor']):
            raise ApiError(409, 'ALLOCATION_CONFLICT', 'Moneda distinta o asignación superior al saldo')
        rows.append((quota, value))
        allocated += value
    if allocated > amount:
        raise ApiError(422, 'OVERALLOCATED', 'Las asignaciones superan el pago')
    identifier = str(uuid.uuid4())
    item = {'pk': case['pk'], 'sk': 'PAYMENT#' + identifier, 'id': identifier, 'entity_type': 'PAYMENT',
            'version': 1, 'currency': ccy, 'amount_minor': amount, 'allocated_minor': allocated,
            'payer_id': payer, 'kind': kind, 'effective_date': day, 'reversed': False,
            'method': text(body, 'method', 100, True), 'reference': text(body, 'reference', 160, True),
            'invoice_metadata': invoice_metadata(body),
            'created_at': r.timestamp(), 'gsi1pk': 'TYPE#PAYMENT#' + day[:7], 'gsi1sk': day + '#' + identifier}
    old = balance(case_id, ccy)
    operations = [r.check(case), r.check(person), r.put(item)]
    # Durable business key remains even if idempotency keys change or a payment is reversed.
    import hashlib
    business = hashlib.sha256((case_id + '|' + ccy + '|' + item['method'] + '|' + item['reference']).encode()).hexdigest()
    operations.append(r.put({'pk': 'PAYMENT_REF#' + business, 'sk': 'META', 'version': 1, 'payment_id': identifier}))
    for quota, value in rows:
        operations += [r.put({**quota, 'paid_minor': int(quota['paid_minor']) + value, 'version': quota['version'] + 1}, quota['version']),
                       r.put({'pk': case['pk'], 'sk': 'ALLOCATION#' + identifier + '#' + quota['id'], 'version': 1,
                              'payment_id': identifier, 'installment_id': quota['id'], 'amount_minor': value, 'currency': ccy})]
    operations += due_operations([(quota, -value) for quota, value in rows])
    deltas = {day[:7] + '|RECEIVED#' + ccy: amount, day[:7] + '|UNASSIGNED#' + ccy: amount - allocated}
    if kind == 'HONORARIOS':
        operations.append(balance_put(old, allocated_minor=int(old['allocated_minor']) + allocated,
                                      received_minor=int(old['received_minor']) + amount,
                                      unassigned_minor=int(old['unassigned_minor']) + amount - allocated))
    else:
        operations.append(balance_put(old, client_funds_minor=int(old['client_funds_minor']) + amount))
        deltas = {day[:7] + '|CLIENT_FUNDS#' + ccy: amount}
    return r.commit(event, actor, 'POST/casos/' + case_id + '/pagos', body, operations, {'payment_id': identifier}, deltas)


def reverse(event, actor, case_id, payment_id, body):
    item = r.get('CASE#' + case_id, 'PAYMENT#' + payment_id, required=True)
    version = r.expected(body, item)
    if item['reversed']:
        raise ApiError(409, 'ALREADY_REVERSED', 'El registro ya está revertido')
    reason, day = text(body, 'reason', 2000, True), effective_date(body)
    ccy, amount = item['currency'], int(item['amount_minor'])
    old = balance(case_id, ccy)
    identifier = str(uuid.uuid4())
    operations = [r.put({**item, 'version': version + 1, 'reversed': True}, version),
                  r.put({'pk': item['pk'], 'sk': 'REVERSAL#' + identifier, 'version': 1, 'payment_id': payment_id,
                         'reason': reason, 'amount_minor': amount, 'currency': ccy, 'effective_date': day})]
    allocations, _ = r.query(item['pk'], {'limit': 100}, prefix='ALLOCATION#' + payment_id + '#')
    due_changes = []
    for allocation in allocations:
        quota = r.get(item['pk'], 'INSTALLMENT#' + allocation['installment_id'], required=True)
        if quota['paid_minor'] < allocation['amount_minor']:
            raise ApiError(409, 'INVALID_REVERSAL', 'Saldo inconsistente; requiere conciliación')
        operations.append(r.put({**quota, 'paid_minor': int(quota['paid_minor'] - allocation['amount_minor']),
                                 'version': quota['version'] + 1}, quota['version']))
        due_changes.append((quota, int(allocation['amount_minor'])))
    operations += due_operations(due_changes)
    allocated = int(item['allocated_minor'])
    if item['kind'] == 'HONORARIOS':
        operations.append(balance_put(old, allocated_minor=int(old['allocated_minor']) - allocated,
                                      received_minor=int(old['received_minor']) - amount,
                                      unassigned_minor=int(old['unassigned_minor']) - amount + allocated))
        deltas = {item['effective_date'][:7] + '|RECEIVED#' + ccy: -amount,
                  item['effective_date'][:7] + '|UNASSIGNED#' + ccy: -amount + allocated}
    else:
        if old['client_funds_minor'] < amount:
            raise ApiError(409, 'CLIENT_FUNDS_USED', 'Fondos utilizados: concilia antes de revertir')
        operations.append(balance_put(old, client_funds_minor=int(old['client_funds_minor']) - amount))
        deltas = {item['effective_date'][:7] + '|CLIENT_FUNDS#' + ccy: -amount}
    return r.commit(event, actor, 'POST/casos/' + case_id + '/pagos/' + payment_id + '/reversion', body,
                    operations, {'reversal_id': identifier, 'accounting_only': True}, deltas)


def allocate(event, actor, case_id, payment_id, body):
    item = r.get('CASE#' + case_id, 'PAYMENT#' + payment_id, required=True)
    version = r.expected(body, item)
    if item['reversed'] or item['kind'] != 'HONORARIOS':
        raise ApiError(409, 'PAYMENT_UNAVAILABLE', 'El pago no admite asignaciones')
    values = body.get('allocations')
    if not isinstance(values, list) or not 1 <= len(values) <= 20:
        raise ApiError(422, 'INVALID_ALLOCATIONS', 'Define de una a veinte asignaciones')
    previous, _ = r.query(item['pk'], {'limit': 100}, prefix='ALLOCATION#' + payment_id + '#')
    existing = {row['installment_id']: row for row in previous}
    keys, total, operations, due_changes = set(), 0, [], []
    for value in values:
        if not isinstance(value, dict):
            raise ApiError(422, 'INVALID_ALLOCATIONS', 'Asignación inválida')
        quota_id = text(value, 'installment_id', 80, True)
        if quota_id in keys:
            raise ApiError(422, 'DUPLICATE_ALLOCATION', 'Cuota repetida')
        keys.add(quota_id)
        quota = r.get(item['pk'], 'INSTALLMENT#' + quota_id, required=True)
        amount = model.minor(value.get('amount'))
        if quota['currency'] != item['currency'] or quota['paid_minor'] + amount > quota['amount_minor']:
            raise ApiError(409, 'ALLOCATION_CONFLICT', 'Moneda distinta o asignación superior al saldo')
        old = existing.get(quota_id)
        allocation = {'pk': item['pk'], 'sk': 'ALLOCATION#' + payment_id + '#' + quota_id,
                      'version': int(old['version']) + 1 if old else 1, 'payment_id': payment_id,
                      'installment_id': quota_id, 'amount_minor': int(old['amount_minor']) + amount if old else amount,
                      'currency': item['currency']}
        operations += [r.put({**quota, 'paid_minor': int(quota['paid_minor']) + amount, 'version': quota['version'] + 1}, quota['version']),
                       r.put(allocation, old['version'] if old else None)]
        total += amount
        due_changes.append((quota, -amount))
    if len(keys | set(existing)) > 20 or int(item['allocated_minor']) + total > int(item['amount_minor']):
        raise ApiError(422, 'OVERALLOCATED', 'Asignaciones superiores al saldo del pago o a veinte cuotas')
    old = balance(case_id, item['currency'])
    identifier = str(uuid.uuid4())
    operations += [r.put({**item, 'version': version + 1, 'allocated_minor': int(item['allocated_minor']) + total}, version),
                   balance_put(old, allocated_minor=int(old['allocated_minor']) + total, unassigned_minor=int(old['unassigned_minor']) - total),
                   r.put({'pk': item['pk'], 'sk': 'ALLOCATION_EVENT#' + identifier, 'version': 1,
                          'payment_id': payment_id, 'allocations': values, 'created_at': r.timestamp(), 'actor': actor})]
    operations += due_operations(due_changes)
    return r.commit(event, actor, 'POST/casos/' + case_id + '/pagos/' + payment_id + '/asignaciones', body, operations,
                    {'payment_id': payment_id, 'version': version + 1},
                    {item['effective_date'][:7] + '|UNASSIGNED#' + item['currency']: -total})


def expense(event, actor, case_id, body):
    case = r.get('CASE#' + case_id, required=True)
    ccy, value, day = model.currency(body), model.minor(body.get('amount')), effective_date(body)
    identifier, old = str(uuid.uuid4()), balance(case_id, ccy)
    kind = model.choice(body, 'kind', {'OPERATIVO', 'FONDOS_CLIENTE'}, 'OPERATIVO')
    if kind == 'FONDOS_CLIENTE' and old['client_funds_minor'] < value:
        raise ApiError(409, 'INSUFFICIENT_CLIENT_FUNDS', 'No hay fondos suficientes del cliente')
    item = {'pk': case['pk'], 'sk': 'EXPENSE#' + identifier, 'id': identifier, 'entity_type': 'EXPENSE', 'version': 1,
            'currency': ccy, 'amount_minor': value, 'effective_date': day, 'kind': kind,
            'description': text(body, 'description', 2000, True), 'reference': text(body, 'reference', 160, True)}
    changes = {'expenses_minor': int(old['expenses_minor']) + value} if kind == 'OPERATIVO' else {'client_funds_minor': int(old['client_funds_minor']) - value}
    delta = 'EXPENSES#' if kind == 'OPERATIVO' else 'CLIENT_FUNDS#'
    return r.commit(event, actor, 'POST/casos/' + case_id + '/gastos', body,
                    [r.check(case), r.put(item), balance_put(old, **changes)], {'expense_id': identifier},
                    {day[:7] + '|' + delta + ccy: value if kind == 'OPERATIVO' else -value})
