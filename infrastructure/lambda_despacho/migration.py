"""Explicit legacy import builder. Never infer currency or legal-case outcome."""
import hashlib
import json
import uuid

from contracts import ApiError
import model
import repository as r


def source_hash(legacy):
    return hashlib.sha256(json.dumps(legacy, sort_keys=True, default=str, ensure_ascii=False).encode()).hexdigest()


def classification(legacy):
    name = legacy.get('client_name')
    summary = legacy.get('case_details') or legacy.get('case_summary')
    placeholder = not isinstance(name, str) or name.strip().casefold() in {'', 'cliente', 'cliente web', 'usuario', 'anónimo', 'anonimo', 'no proporcionado'}
    return 'UNRESOLVED_REQUIRES_REVIEW' if placeholder or not isinstance(summary, str) or not summary.strip() else 'IMPORTED_REQUIRES_REVIEW'


def import_lead(event, actor, legacy):
    legacy_id = legacy.get('lead_id')
    if not isinstance(legacy_id, str) or not legacy_id:
        raise ApiError(422, 'LEGACY_ID_REQUIRED', 'Falta ID de origen')
    if len(json.dumps(legacy, default=str).encode()) > 200000:
        raise ApiError(413, 'LEGACY_TOO_LARGE', 'Registro requiere revisión separada')
    marker = 'MIGRATION#ChatLeads#' + hashlib.sha256(legacy_id.encode()).hexdigest()
    existing = r.get(marker)
    if existing:
        if existing.get('source_hash') != source_hash(legacy):
            raise ApiError(409, 'LEGACY_SOURCE_CHANGED', 'El origen cambió: requiere revisión del corte de migración')
        return {key: existing[key] for key in ['legacy_id', 'person_id', 'opportunity_id', 'status']}
    name = legacy.get('client_name')
    placeholder = not isinstance(name, str) or name.strip().casefold() in {'', 'cliente', 'cliente web', 'usuario', 'anónimo', 'anonimo', 'no proporcionado'}
    pid, oid = None, None
    operations, deltas = [], {}
    if not placeholder:
        fields, contacts = {'display_name': name, 'contacts': []}, []
        for kind, value in [('PHONE', legacy.get('client_phone')), ('EMAIL', legacy.get('client_email'))]:
            if value:
                try: contacts.append(model.contact({'kind': kind, 'value': value}))
                except ApiError: pass  # Original is preserved in the private migration source.
        fields['contacts'] = contacts
        fields = model.person_fields(fields)
        pid, oid = str(uuid.uuid4()), str(uuid.uuid4())
        person = r.entity('PERSON', pid, fields)
        person['gsi2sk'] += '#' + pid
        summary = legacy.get('case_details') or legacy.get('case_summary')
        if not isinstance(summary, str) or not summary.strip():
            # No fabricated summary: hold the record for review instead.
            pid, oid = None, None
        else:
            stage = legacy.get('stage') if legacy.get('stage') in model.STAGES else 'NUEVO'
            if stage == 'PERDIDO' and not legacy.get('lost_reason'):
                stage = 'NUEVO'
            opportunity = r.entity('OPP', oid, {'person_id': pid, 'summary': summary[:4000], 'stage': stage,
                'source': legacy.get('source') or 'ChatLeads legacy', 'needs_review': True,
                'lost_reason': legacy.get('lost_reason', ''), 'legacy_id': legacy_id, 'legacy_created_at': legacy.get('created_at')})
            operations = [r.put(person), r.put(r.pointer('LIST#PERSON', person, person['normalized_name'])),
                r.put(opportunity), r.put(r.pointer('LIST#OPP#' + stage, opportunity)),
                r.put({'pk': opportunity['pk'], 'sk': 'STAGE#' + opportunity['created_at'] + '#' + oid,
                       'version': 1, 'previous': None, 'next': stage, 'actor': actor, 'reason': 'LEGACY_IMPORT_REQUIRES_REVIEW'}),
                r.put({'pk': person['pk'], 'sk': 'OPP#' + oid, 'version': 1, 'target_pk': opportunity['pk'], 'target_sk': 'META'})]
            operations += [r.put({'pk': key, 'sk': person['pk'], 'version': 1, 'target_pk': person['pk'], 'target_sk': 'META'}) for key in model.lookup_keys(fields)]
            deltas = {opportunity['cohort_period'] + '|OPP#' + stage: 1}
    status = 'IMPORTED_REQUIRES_REVIEW' if pid else 'UNRESOLVED_REQUIRES_REVIEW'
    record = {'pk': marker, 'sk': 'META', 'version': 1, 'legacy_id': legacy_id,
              'person_id': pid, 'opportunity_id': oid, 'status': status, 'source_record': legacy, 'source_hash': source_hash(legacy),
              'created_at': r.timestamp(), 'currency_inferred': False}
    operations.append(r.put(record))
    result = {'legacy_id': legacy_id, 'person_id': pid, 'opportunity_id': oid, 'status': status}
    return r.commit(event, actor, 'MIGRATE/ChatLeads/' + legacy_id, legacy, operations, result, deltas)
