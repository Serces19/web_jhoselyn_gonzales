import hashlib
import json
import uuid

from contracts import ApiError, text
import model
import repository as r


def create_person(event, actor, body):
    fields = model.person_fields(body)
    identifier = str(uuid.uuid4())
    item = r.entity('PERSON', identifier, fields)
    item['gsi2sk'] += '#' + identifier
    operations = [r.put(item), r.put(r.pointer('LIST#PERSON', item, fields['normalized_name']))]
    for key in model.lookup_keys(fields):
        operations.append(r.put({'pk': key, 'sk': 'PERSON#' + identifier, 'target_pk': item['pk'], 'target_sk': 'META', 'version': 1}))
    if fields['is_client']:
        operations.append(r.put({'pk': item['pk'], 'sk': 'CLIENT', 'version': 1, 'created_at': item['created_at']}))
    return r.commit(event, actor, 'POST/personas', body, operations, {'person_id': identifier, 'version': 1})


def edit_person(event, actor, identifier, body):
    old = r.get('PERSON#' + identifier, required=True)
    version = r.expected(body, old)
    fields = model.person_fields({**old, **body})
    item = {**old, **fields, 'version': version + 1, 'updated_at': r.timestamp()}
    item['gsi2sk'] += '#' + identifier
    operations = [r.put(item, version)]
    if old['normalized_name'] != fields['normalized_name']:
        operations += [r.remove('LIST#PERSON', old['normalized_name'] + '#' + identifier),
                       r.put(r.pointer('LIST#PERSON', item, fields['normalized_name']))]
    previous, current = model.lookup_keys(old), model.lookup_keys(fields)
    operations += [r.remove(key, old['pk']) for key in previous - current]
    operations += [r.put({'pk': key, 'sk': old['pk'], 'target_pk': old['pk'], 'target_sk': 'META', 'version': 1}) for key in current - previous]
    if fields['is_client'] != old['is_client']:
        profile = r.get(old['pk'], 'CLIENT')
        if profile:
            operations.append(r.put({**profile, 'active': fields['is_client'], 'version': profile['version'] + 1}, profile['version']))
        elif fields['is_client']:
            operations.append(r.put({'pk': old['pk'], 'sk': 'CLIENT', 'version': 1, 'active': True, 'created_at': r.timestamp()}))
    # CLIENT history remains if commercial status changes; META is authoritative.
    return r.commit(event, actor, 'PATCH/personas/' + identifier, body, operations, {'person_id': identifier, 'version': version + 1})


def persons(params):
    name = params.get('name')
    if not name:
        return r.list_entities('LIST#PERSON', params)
    name = model.normalized(name)
    if len(name) < 2:
        raise ApiError(422, 'SEARCH_TOO_SHORT', 'Introduce al menos dos caracteres')
    rows, cursor = r.query('PERSON_NAME#' + name[:2], params, 'GSI2', name)
    return [item for row in rows if (item := r.get(row['pk'], row['sk'])) and not item.get('deleted')], cursor


def conflicts(params):
    if params.get('phone'):
        fields = {'contacts': [model.contact({'kind': 'PHONE', 'value': params['phone']})]}
    elif params.get('email'):
        fields = {'contacts': [model.contact({'kind': 'EMAIL', 'value': params['email']})]}
    elif all(params.get(k) for k in ['country', 'issuer', 'kind', 'value']):
        fields = {'identifiers': [{k: params[k].strip().upper() for k in ['country', 'issuer', 'kind', 'value']}]}
    elif params.get('name'):
        rows, cursor = persons(params)
        return {'candidates': rows, 'next_cursor': cursor, 'scope': 'PREFIX_NAME', 'requires_human_review': True}
    else:
        raise ApiError(422, 'SEARCH_REQUIRED', 'Indica contacto, nombre o identificador completo')
    key = next(iter(model.lookup_keys(fields)))
    rows, cursor = r.list_entities(key, params)
    return {'candidates': rows, 'next_cursor': cursor, 'scope': 'EXACT_CONTACT_OR_IDENTIFIER', 'requires_human_review': True}


def create_opportunity(event, actor, body):
    person = r.get('PERSON#' + text(body, 'person_id', 80, True), required=True)
    stage = model.choice(body, 'stage', model.STAGES, 'NUEVO')
    if stage == 'PERDIDO' and not text(body, 'lost_reason', 1000):
        raise ApiError(422, 'LOST_REASON_REQUIRED', 'Indica por qué no se concretó')
    identifier = str(uuid.uuid4())
    item = r.entity('OPP', identifier, {'person_id': person['id'], 'stage': stage,
        'summary': text(body, 'summary', 4000, True), 'source': text(body, 'source', 120, True),
        'lost_reason': text(body, 'lost_reason', 1000), 'needs_review': bool(body.get('needs_review', False))})
    history = {'pk': item['pk'], 'sk': 'STAGE#' + item['created_at'] + '#' + identifier,
               'version': 1, 'previous': None, 'next': stage, 'actor': actor, 'reason': item['lost_reason']}
    operations = [r.check(person), r.put(item), r.put(history), r.put(r.pointer('LIST#OPP#' + stage, item)),
                  r.put({'pk': person['pk'], 'sk': 'OPP#' + identifier, 'target_pk': item['pk'], 'target_sk': 'META', 'version': 1})]
    return r.commit(event, actor, 'POST/oportunidades', body, operations, {'opportunity_id': identifier, 'version': 1},
                    {item['cohort_period'] + '|OPP#' + stage: 1})


def edit_opportunity(event, actor, identifier, body):
    old = r.get('OPP#' + identifier, required=True)
    version = r.expected(body, old)
    stage = model.choice(body, 'stage', model.STAGES, old['stage'])
    fields = {k: text(body, k, maximum, True) for k, maximum in [('summary', 4000), ('source', 120)] if k in body}
    reason = text(body, 'lost_reason', 1000) if stage == 'PERDIDO' else ''
    if stage == 'PERDIDO' and not reason:
        raise ApiError(422, 'LOST_REASON_REQUIRED', 'Indica por qué no se concretó')
    item = {**old, **fields, 'stage': stage, 'lost_reason': reason, 'version': version + 1, 'updated_at': r.timestamp()}
    if 'needs_review' in body:
        if not isinstance(body['needs_review'], bool):
            raise ApiError(422, 'INVALID_REVIEW', 'Estado de revisión inválido')
        item['needs_review'] = body['needs_review']
        if body['needs_review'] is False:
            item['review_note'] = text(body, 'review_note', 2000, True)
            item['reviewed_by'] = actor
    operations, deltas = [r.put(item, version)], {}
    if stage != old['stage']:
        operations += [r.remove('LIST#OPP#' + old['stage'], old['created_at'] + '#' + identifier),
                       r.put(r.pointer('LIST#OPP#' + stage, item)),
                       r.put({'pk': old['pk'], 'sk': 'STAGE#' + item['updated_at'] + '#' + str(uuid.uuid4()),
                              'version': 1, 'previous': old['stage'], 'next': stage, 'actor': actor, 'reason': reason})]
        period = old['cohort_period']
        deltas = {period + '|OPP#' + old['stage']: -1, period + '|OPP#' + stage: 1}
    return r.commit(event, actor, 'PATCH/oportunidades/' + identifier, body, operations,
                    {'opportunity_id': identifier, 'version': version + 1}, deltas)


def parties_of(body, pending=None):
    values = body.get('parties')
    if not isinstance(values, list) or not 1 <= len(values) <= 10:
        raise ApiError(422, 'INVALID_PARTIES', 'Alta rápida admite entre una y diez partes')
    parties, people = [], {}
    for value in values:
        if not isinstance(value, dict):
            raise ApiError(422, 'INVALID_PARTIES', 'Parte inválida')
        identifier = text(value, 'person_id', 80, True)
        role = model.choice(value, 'role', model.ROLES)
        people[identifier] = pending if pending and pending['id'] == identifier else r.get('PERSON#' + identifier, required=True)
        parties.append({'person_id': identifier, 'role': role})
    if len({(p['person_id'], p['role']) for p in parties}) != len(parties):
        raise ApiError(422, 'DUPLICATE_PARTY', 'Parte repetida')
    if not any(p['role'] in {'CLIENTE', 'REPRESENTADO'} for p in parties):
        raise ApiError(422, 'CLIENT_REQUIRED', 'Vincula cliente o representado')
    return parties, people


def party_digest(parties, people=None):
    return hashlib.sha256(json.dumps(sorted((p['person_id'], p['role'], int(people[p['person_id']]['version']) if people else None) for p in parties)).encode()).hexdigest()


def create_case(event, actor, body, pending=None, pending_operations=None, command_body=None):
    parties, people = parties_of(body, pending)
    identifier = str(uuid.uuid4())
    item = r.entity('CASE', identifier, {'title': text(body, 'title', 200, True),
        'original_narrative': text(body, 'original_narrative', 16000, True), 'area': text(body, 'area', 120, True),
        'state': 'BORRADOR', 'parties_digest': party_digest(parties, people), 'conflict_review': None,
        'responsible': actor, 'opportunity_id': text(body, 'opportunity_id', 80)})
    operations = [*(pending_operations or []), r.put(item), r.put(r.pointer('LIST#CASE#BORRADOR', item))]
    operations += [r.check(person) for person in people.values() if not pending or person['id'] != pending['id']]
    if item['opportunity_id']:
        opportunity = r.get('OPP#' + item['opportunity_id'], required=True)
        if not any(p['person_id'] == opportunity['person_id'] and p['role'] in {'CLIENTE', 'REPRESENTADO'} for p in parties):
            raise ApiError(422, 'OPPORTUNITY_PERSON_MISMATCH', 'La persona de la oportunidad debe ser cliente o representado del caso')
        operations.append(r.check(opportunity))
        operations.append(r.put({'pk': opportunity['pk'], 'sk': 'CASE#' + identifier,
                                 'target_pk': item['pk'], 'target_sk': 'META', 'version': 1}))
    for party in parties:
        operations += [r.put({'pk': item['pk'], 'sk': 'PARTY#' + party['role'] + '#' + party['person_id'],
                             'version': 1, **party}),
                       r.put({'pk': 'PERSON#' + party['person_id'], 'sk': 'CASE#' + identifier + '#' + party['role'],
                              'target_pk': item['pk'], 'target_sk': 'META', 'version': 1, 'role': party['role']})]
    operations.append(r.put({'pk': item['pk'], 'sk': 'EVENT#' + item['created_at'] + '#' + identifier,
                            'version': 1, 'action': 'CASE_CREATED_DRAFT', 'actor': actor}))
    result = {'case_id': identifier, 'state': 'BORRADOR', 'version': 1}
    if pending:
        result['person_id'] = pending['id']
    return r.commit(event, actor, 'POST/intake' if command_body is not None else 'POST/casos', command_body if command_body is not None else body, operations, result,
                    {item['cohort_period'] + '|CASE#BORRADOR': 1})


def intake(event, actor, body):
    case = body.get('case')
    if not isinstance(case, dict):
        raise ApiError(422, 'INVALID_INTAKE', 'Define los datos del caso')
    person, operations = None, []
    if body.get('person_id'):
        identifier = text(body, 'person_id', 80, True)
        r.get('PERSON#' + identifier, required=True)
    else:
        if not isinstance(body.get('person'), dict):
            raise ApiError(422, 'INVALID_PERSON', 'Busca una persona o captura una nueva')
        identifier = str(uuid.uuid4())
        fields = model.person_fields({**body['person'], 'is_client': True})
        person = r.entity('PERSON', identifier, fields)
        person['gsi2sk'] += '#' + identifier
        operations = [r.put(person), r.put(r.pointer('LIST#PERSON', person, fields['normalized_name'])),
                      r.put({'pk': person['pk'], 'sk': 'CLIENT', 'version': 1, 'created_at': person['created_at']})]
        operations += [r.put({'pk': key, 'sk': person['pk'], 'target_pk': person['pk'], 'target_sk': 'META', 'version': 1})
                       for key in model.lookup_keys(fields)]
    parties = case.get('parties', [])
    if not isinstance(parties, list):
        raise ApiError(422, 'INVALID_PARTIES', 'Partes inválidas')
    return create_case(event, actor, {**case, 'parties': [{'person_id': identifier, 'role': 'CLIENTE'}, *parties]},
                       person, operations, body)


def edit_case(event, actor, identifier, body):
    old = r.get('CASE#' + identifier, required=True)
    version = r.expected(body, old)
    item = {**old, 'version': version + 1, 'updated_at': r.timestamp()}
    parties, _ = r.query(old['pk'], {'limit': 100}, prefix='PARTY#')
    people = {p['person_id']: r.get('PERSON#' + p['person_id'], required=True) for p in parties}
    digest = party_digest(parties, people)
    item['parties_digest'] = digest
    for name, maximum in [('title', 200), ('area', 120)]:
        if name in body:
            item[name] = text(body, name, maximum, True)
    # Original narrative is immutable. Corrections are appended as events later.
    if 'conflict_decision' in body:
        decision = model.choice(body, 'conflict_decision', {'APROBADO', 'RECHAZADO', 'REVISAR'})
        note = text(body, 'conflict_note', 2000, True)
        item['conflict_review'] = {'decision': decision, 'note': note, 'actor': actor,
                                   'reviewed_at': item['updated_at'], 'parties_digest': digest}
    state = model.choice(body, 'state', model.CASE_STATES, old['state'])
    review = item.get('conflict_review') or {}
    if state == 'ACTIVO' and (review.get('decision') != 'APROBADO' or review.get('parties_digest') != digest):
        raise ApiError(409, 'CONFLICT_REVIEW_REQUIRED', 'Revisa conflictos antes de activar el caso')
    item['state'] = state
    operations = [r.put(item, version), r.put({'pk': old['pk'], 'sk': 'EVENT#' + item['updated_at'] + '#' + str(uuid.uuid4()),
        'version': 1, 'actor': actor, 'action': 'CASE_UPDATED', 'previous_state': old['state'], 'next_state': state})]
    operations += [r.check(person) for person in people.values()]
    deltas = {}
    if state != old['state']:
        operations += [r.remove('LIST#CASE#' + old['state'], old['created_at'] + '#' + identifier),
                       r.put(r.pointer('LIST#CASE#' + state, item))]
        period = old['cohort_period']
        deltas = {period + '|CASE#' + old['state']: -1, period + '|CASE#' + state: 1}
    return r.commit(event, actor, 'PATCH/casos/' + identifier, body, operations, {'case_id': identifier, 'version': version + 1, 'state': state}, deltas)


def add_party(event, actor, identifier, body):
    case = r.get('CASE#' + identifier, required=True)
    version = r.expected(body, case)
    if case['state'] != 'BORRADOR':
        raise ApiError(409, 'DRAFT_REQUIRED', 'Pasa el caso a borrador y revisa conflictos después de agregar partes')
    person = r.get('PERSON#' + text(body, 'person_id', 80, True), required=True)
    role = model.choice(body, 'role', model.ROLES)
    parties, _ = r.query(case['pk'], {'limit': 100}, prefix='PARTY#')
    if len(parties) >= 50:
        raise ApiError(422, 'PARTIES_LIMIT', 'Caso requiere un flujo ampliado de partes')
    sk = 'PARTY#' + role + '#' + person['id']
    if any(p['sk'] == sk for p in parties):
        raise ApiError(409, 'PARTY_EXISTS', 'La persona ya tiene ese rol en el caso')
    operations = [r.put({**case, 'version': version + 1, 'conflict_review': None, 'updated_at': r.timestamp()}, version),
        r.check(person), r.put({'pk': case['pk'], 'sk': sk, 'version': 1, 'person_id': person['id'], 'role': role}),
        r.put({'pk': person['pk'], 'sk': 'CASE#' + identifier + '#' + role, 'version': 1,
               'target_pk': case['pk'], 'target_sk': 'META', 'role': role}),
        r.put({'pk': case['pk'], 'sk': 'EVENT#' + r.timestamp() + '#' + str(uuid.uuid4()),
               'version': 1, 'actor': actor, 'action': 'PARTY_ADDED_REVIEW_INVALIDATED', 'person_id': person['id'], 'role': role})]
    return r.commit(event, actor, 'POST/casos/' + identifier + '/partes', body, operations, {'case_id': identifier, 'version': version + 1})
