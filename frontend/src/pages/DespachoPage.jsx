import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness, Users, Plus, CalendarDays, Wallet, TrendingUp, ShieldCheck } from 'lucide-react';
import { currentSession, signOut } from '../api/auth';
import { deskRequest } from '../api/despacho';
import './DespachoPage.css';

const stages = ['NUEVO', 'CONTACTADO', 'ASESORIA', 'PROPUESTA', 'GANADO', 'PERDIDO'];
const stageLabels = { NUEVO: 'Nuevo', CONTACTADO: 'Contactado', ASESORIA: 'Asesoría', PROPUESTA: 'Propuesta', GANADO: 'Contrato obtenido', PERDIDO: 'No concretado' };
const states = ['BORRADOR', 'ACTIVO', 'CERRADO', 'ARCHIVADO'];
const currencies = ['BOB', 'USD', 'EUR'];
const ReadOnlyContext = createContext(false);
const field = (id, label, type = 'text', options) => ({ id, label, type, options });
const money = (amount, currency) => new Intl.NumberFormat('es-BO', { style: 'currency', currency }).format(Number(amount) / 100);

function Form({ title, fields, onSubmit, initial = {}, submit = 'Guardar', query = false, children }) {
  const readOnly = useContext(ReadOnlyContext) && !query;
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function send(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await onSubmit(values); setValues(initial); } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <form className="desk-form" onSubmit={send}>
    <h3>{title}</h3>
    <fieldset disabled={readOnly || busy}>
    <div className="desk-fields">{fields.map(({ id, label, type, options, optional }) => <label key={id} className={type === 'textarea' ? 'desk-wide' : ''}>
      {label}{optional ? ' · opcional' : ''}
      {type === 'select' ? <select required={!optional} value={values[id] || ''} onChange={e => setValues({ ...values, [id]: e.target.value })}>
        <option value="">Seleccionar</option>{options.map(option => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}
      </select> : type === 'checkbox' ? <input type="checkbox" required={!optional} checked={Boolean(values[id])} onChange={e => setValues({ ...values, [id]: e.target.checked })}/> : type === 'textarea' ? <textarea required={!optional} value={values[id] || ''} rows={4} onChange={e => setValues({ ...values, [id]: e.target.value })}/> : <input required={!optional} type={type} value={values[id] ?? ''} onChange={e => setValues({ ...values, [id]: e.target.value })}/>}
    </label>)}</div>
    {children}{error && <p className="desk-error" role="alert">{error}</p>}
    <button className="btn-primary" disabled={busy}>{busy ? 'Guardando…' : submit}</button>
    </fieldset>
  </form>;
}

function People({ people, onChange, onSelect }) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState(people.items || []);
  const [cursor, setCursor] = useState(people.next_cursor);
  const [error, setError] = useState('');
  useEffect(() => { setRows(people.items || []); setCursor(people.next_cursor); }, [people]);
  async function search(more = false) {
    setError('');
    try { const response = await deskRequest('/personas', { query: { name, cursor: more ? cursor : undefined } }); setRows(more ? [...rows, ...response.items] : response.items); setCursor(response.next_cursor); }
    catch (err) { setError(err.message); }
  }
  return <div className="desk-two-columns"><section className="desk-panel">
    <h2>Personas y clientes</h2><p>Un contacto compartido no identifica por sí solo a una persona.</p>
    <div className="desk-search"><input aria-label="Nombre desde el inicio" value={name} onChange={e => setName(e.target.value)}/><button onClick={() => search()}>Buscar por nombre</button></div>
    {error && <p className="desk-error" role="alert">{error}</p>}
    {!rows.length && <p className="desk-empty">No hay personas en esta consulta.</p>}
    {rows.map(person => <button className="desk-record" key={person.id} onClick={() => onSelect(person)}>
      <strong>{person.display_name}</strong><span>{person.is_client ? 'Cliente' : 'Contacto'} · {(person.contacts || []).map(c => c.value).join(' · ') || 'Sin contactos registrados'}</span>
    </button>)}
    {cursor && <button onClick={() => search(true)}>Cargar más</button>}
  </section><Form title="Agregar persona" fields={[field('display_name', 'Nombre completo'), { ...field('phone', 'Teléfono con código de país'), optional: true }, { ...field('email', 'Correo', 'email'), optional: true }, { ...field('is_client', 'Registrar como cliente', 'checkbox'), optional: true }]}
    onSubmit={async values => { await deskRequest('/personas', { method: 'POST', body: { display_name: values.display_name, is_client: Boolean(values.is_client), contacts: contacts(values) } }); await onChange(); }}/></div>;
}

function contacts(values) { return [...(values.phone ? [{ kind: 'PHONE', value: values.phone }] : []), ...(values.email ? [{ kind: 'EMAIL', value: values.email }] : [])]; }

function PersonDetail({ person, onChange, onOpenCase }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState('');
  const [related, setRelated] = useState(null);
  async function conflicts() {
    try {
      const first = person.contacts?.[0];
      const query = first ? { [first.kind === 'PHONE' ? 'phone' : 'email']: first.value } : { name: person.display_name };
      setMatches(await deskRequest('/conflictos', { query }));
    } catch (err) { setError(err.message); }
  }
  return <section className="desk-panel"><h2>{person.display_name}</h2>
    <button onClick={async () => { try { setRelated(await deskRequest('/personas/' + person.id + '/casos')); } catch (err) { setError(err.message); } }}>Ver asuntos y roles de esta persona</button>
    {related?.items.map(row => <button className="desk-record" key={row.id + row.role} onClick={() => onOpenCase(row.id)}>{row.title} · {row.role} · {row.state}</button>)}
    {related?.next_cursor && <button onClick={async () => { try { const page = await deskRequest('/personas/' + person.id + '/casos', { query: { cursor: related.next_cursor } }); setRelated({ ...page, items: [...related.items, ...page.items] }); } catch (err) { setError(err.message); } }}>Más relaciones</button>}
    <button onClick={conflicts}>Revisar coincidencias</button>
    {matches && <div className="desk-notice"><p>Estas coincidencias requieren revisión humana; no certifican ausencia de conflicto.</p>
      {matches.candidates.map(p => <p key={p.id}>{p.display_name}</p>)}{matches.next_cursor && <p>Hay más candidatos: acota la búsqueda antes de decidir.</p>}</div>}
    {error && <p className="desk-error" role="alert">{error}</p>}
    <Form query title="Buscar coincidencias por documento" fields={[field('country', 'País emisor'), field('issuer', 'Entidad emisora'), field('kind', 'Tipo de documento'), field('value', 'Número de documento')]}
      onSubmit={async query => { setMatches(await deskRequest('/conflictos', { query })); }}/>
    <p>{person.identifiers?.map(i => `${i.country} · ${i.issuer} · ${i.kind}: ${i.value}`).join(' / ') || 'Sin documentos de identidad registrados.'}</p>
    <Form key={'identifier-' + person.version} title="Agregar documento de identidad" fields={[field('country', 'País emisor'), field('issuer', 'Entidad emisora'), field('kind', 'Tipo de documento'), field('value', 'Número de documento')]}
      onSubmit={async identifier => { await deskRequest('/personas/' + person.id, { method: 'PATCH', body: { expected_version: person.version, identifiers: [...(person.identifiers || []), identifier] } }); await onChange(person.id); }}/>
    <Form key={person.version} title="Actualizar persona" initial={{ display_name: person.display_name, is_client: person.is_client,
      phone: person.contacts.find(c => c.kind === 'PHONE')?.value || '', email: person.contacts.find(c => c.kind === 'EMAIL')?.value || '' }}
      fields={[field('display_name', 'Nombre completo'), { ...field('phone', 'Teléfono con código de país'), optional: true }, { ...field('email', 'Correo', 'email'), optional: true }, { ...field('is_client', 'Cliente', 'checkbox'), optional: true }]}
      onSubmit={async values => {
        // Preserve extra contacts/identifiers not edited by this compact form.
        const extra = person.contacts.filter((c, i) => i !== person.contacts.findIndex(x => x.kind === c.kind));
        await deskRequest('/personas/' + person.id, { method: 'PATCH', body: { expected_version: person.version,
          display_name: values.display_name, is_client: Boolean(values.is_client), contacts: [...contacts(values), ...extra] } }); await onChange(person.id);
      }}/>
  </section>;
}

function Intake({ people, opportunity, onCreated }) {
  const [found, setFound] = useState(people);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const options = (found.items || []).map(p => ({ value: p.id, label: p.display_name }));
  return <section className="desk-panel"><h2>Alta rápida</h2><p>La persona y el caso nuevo se guardan juntos. El caso comienza como borrador y requiere revisar conflictos antes de activarlo.</p>
    <div className="desk-search"><input aria-label="Buscar persona existente" value={search} onChange={e => setSearch(e.target.value)}/><button onClick={async () => { try { setFound(await deskRequest('/personas', { query: { name: search } })); } catch (err) { setError(err.message); } }}>Buscar personas para reutilizar</button></div>
    {error && <p className="desk-error">{error}</p>}{found.next_cursor && <button onClick={async () => { try { const page = await deskRequest('/personas', { query: { name: search, cursor: found.next_cursor } }); setFound({ ...page, items: [...found.items, ...page.items] }); } catch (err) { setError(err.message); } }}>Más personas</button>}
    {opportunity && <p className="desk-notice">Vinculado a oportunidad: {opportunity.summary}</p>}
    <Form key={opportunity?.id || 'new'} title="Nuevo asunto" initial={opportunity ? { person_id: opportunity.person_id } : {}} fields={[{ ...field('person_id', 'Reutilizar persona', 'select', options), optional: true },
      { ...field('display_name', 'Nombre completo de la persona nueva'), optional: true }, { ...field('phone', 'Teléfono con código de país'), optional: true }, { ...field('email', 'Correo', 'email'), optional: true },
      { ...field('counterparty_id', 'Contraparte registrada', 'select', options), optional: true }, { ...field('represented_id', 'Representado registrado', 'select', options), optional: true }, { ...field('payer_id', 'Pagador registrado', 'select', options), optional: true },
      field('title', 'Título del caso'), field('area', 'Área jurídica'), field('original_narrative', 'Relato original', 'textarea')]}
      onSubmit={async values => { const result = await deskRequest('/intake', { method: 'POST', body: {
        ...(values.person_id ? { person_id: values.person_id } : { person: { display_name: values.display_name || '', contacts: contacts(values) } }),
        case: { title: values.title, area: values.area, original_narrative: values.original_narrative, ...(opportunity ? { opportunity_id: opportunity.id } : {}),
          parties: [['counterparty_id', 'CONTRAPARTE'], ['represented_id', 'REPRESENTADO'], ['payer_id', 'PAGADOR']].filter(([key]) => values[key]).map(([key, role]) => ({ person_id: values[key], role })) } } }); await onCreated(result.case_id); }}/>
  </section>;
}

function Pipeline({ people, onChange, onConvert }) {
  const readOnly = useContext(ReadOnlyContext);
  const [columns, setColumns] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { setColumns(Object.fromEntries(await Promise.all(stages.map(async stage => [stage, await deskRequest('/oportunidades', { query: { stage } })])))); } catch (err) { setError(err.message); } }, []);
  useEffect(() => { load(); }, [load]);
  async function move(item, stage) {
    let lost_reason;
    if (stage === 'PERDIDO') { lost_reason = window.prompt('Motivo por el que no se concretó'); if (!lost_reason) return; }
    try { await deskRequest('/oportunidades/' + item.id, { method: 'PATCH', body: { expected_version: item.version, stage, ...(lost_reason ? { lost_reason } : {}) } }); await load(); }
    catch (err) { setError(err.message); }
  }
  return <section><div className="desk-panel"><h2>Embudo comercial</h2><p>Contrato obtenido describe una contratación, no el resultado judicial.</p>
    <Form title="Nueva oportunidad" fields={[field('person_id', 'Persona', 'select', (people.items || []).map(p => ({ value: p.id, label: p.display_name }))), field('source', 'Canal de origen'), field('summary', 'Resumen del asunto', 'textarea')]}
      onSubmit={async values => { await deskRequest('/oportunidades', { method: 'POST', body: values }); await load(); await onChange(); }}/>
    {error && <p className="desk-error" role="alert">{error}</p>}</div>
    {!columns ? <p>Cargando oportunidades…</p> : <div className="desk-board">{stages.map(stage => <section className="desk-column" key={stage}><h3>{stageLabels[stage]}</h3>
      {!columns[stage].items.length && <p className="desk-empty">Sin oportunidades en esta página.</p>}
      {columns[stage].items.map(item => <article className="desk-card" key={item.id}><p>{people.items?.find(p => p.id === item.person_id)?.display_name || 'Consultar ficha de persona'}</p><strong>{item.summary}</strong><p>{item.source}</p>{item.needs_review && <p className="desk-notice">Origen pendiente de revisión humana.</p>}
        {item.needs_review && <Form title="Confirmar revisión del origen" fields={[field('review_note', 'Nota de revisión', 'textarea')]} onSubmit={async values => { await deskRequest('/oportunidades/' + item.id, { method: 'PATCH', body: { expected_version: item.version, needs_review: false, lost_reason: item.lost_reason, ...values } }); await load(); }}/>}
        <select disabled={readOnly} aria-label="Cambiar etapa" value={stage} onChange={e => move(item, e.target.value)}>{stages.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}</select><button onClick={async () => { try { await onConvert(item); } catch (err) { setError(err.message); } }}>Abrir alta de caso</button></article>)}
      {columns[stage].next_cursor && <button onClick={async () => { try { const more = await deskRequest('/oportunidades', { query: { stage, cursor: columns[stage].next_cursor } }); setColumns(old => ({ ...old, [stage]: { ...more, items: [...old[stage].items, ...more.items] } })); } catch (err) { setError(err.message); } }}>Cargar más</button>}
    </section>)}</div>}
  </section>;
}

function CaseList({ onSelect }) {
  const [state, setState] = useState('BORRADOR');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { let current = true; setResponse(null); setError(''); deskRequest('/casos', { query: { state } }).then(value => { if (current) setResponse(value); }).catch(err => { if (current) setError(err.message); }); return () => { current = false; }; }, [state]);
  return <section className="desk-panel"><h2>Casos</h2><select aria-label="Estado de casos" value={state} onChange={e => setState(e.target.value)}>{states.map(s => <option key={s}>{s}</option>)}</select>
    {error && <p className="desk-error">{error}</p>}{!response ? <p>Cargando casos…</p> : !response.items.length ? <p className="desk-empty">No hay casos en esta consulta.</p> : response.items.map(item => <button className="desk-record" key={item.id} onClick={() => onSelect(item.id)}><strong>{item.title}</strong><span>{item.area} · {item.state}</span></button>)}
    {response?.next_cursor && <button onClick={async () => { try { const page = await deskRequest('/casos', { query: { state, cursor: response.next_cursor } }); setResponse({ ...page, items: [...response.items, ...page.items] }); } catch (err) { setError(err.message); } }}>Cargar más</button>}
  </section>;
}

function CaseDetail({ id }) {
  const readOnly = useContext(ReadOnlyContext);
  const [data, setData] = useState(null);
  const [names, setNames] = useState({});
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { const response = await deskRequest('/casos/' + id); setData(response);
      const ids = [...new Set(response.parties.map(r => r.person_id))];
      setNames(Object.fromEntries(await Promise.all(ids.map(async pid => [pid, (await deskRequest('/personas/' + pid)).display_name]))));
    } catch (err) { setError(err.message); }
  }, [id]);
  useEffect(() => { refresh(); }, [refresh]);
  if (!data) return <p>{error || 'Cargando expediente…'}</p>;
  const records = data.records;
  const parts = data.parties;
  const quotas = records.filter(r => r.sk.startsWith('INSTALLMENT#'));
  const payments = records.filter(r => r.sk.startsWith('PAYMENT#'));
  const options = [...new Set(parts.filter(r => ['CLIENTE', 'REPRESENTADO', 'PAGADOR'].includes(r.role)).map(r => r.person_id))].map(pid => ({ value: pid, label: names[pid] || 'Cargando persona…' }));
  async function write(suffix, body) { await deskRequest('/casos/' + id + suffix, { method: 'POST', body }); await refresh(); }
  return <section className="desk-panel"><p className="desk-eyebrow">{data.item.state} · {data.item.area}</p><h2>{data.item.title}</h2>
    {error && <p className="desk-error">{error}</p>}<blockquote className="desk-narrative">{data.item.original_narrative}</blockquote>
    <div className="desk-notice">{parts.map(p => <p key={p.sk}>{p.role}: {names[p.person_id] || 'Cargando persona…'}</p>)}</div>
    {!data.review_valid && <p className="desk-notice">La revisión de conflictos está pendiente o ya no corresponde a los datos actuales.</p>}
    {data.item.state === 'BORRADOR' && <AddPartyForm version={data.item.version} write={write}/>}
    <Form key={data.item.version} title="Revisión y estado del caso" fields={[field('conflict_note', 'Resultado de tu revisión de conflictos', 'textarea'), field('reviewed', 'He revisado personalmente partes y coincidencias', 'checkbox'), field('conflict_decision', 'Decisión', 'select', ['APROBADO', 'REVISAR', 'RECHAZADO']), field('state', 'Estado', 'select', states)]}
      initial={{ state: data.item.state }} onSubmit={async ({ reviewed: _reviewed, ...values }) => { await deskRequest('/casos/' + id, { method: 'PATCH', body: { ...values, expected_version: data.item.version } }); await refresh(); }}/>
    <h3>Finanzas del caso</h3><p>Registros contables manuales. No ejecutan transferencias ni confirman un pago desde una captura.</p>
    {data.balances.map(row => <div className="desk-account" key={row.sk}><strong>{row.currency}</strong><span>Pactado: {money(row.agreed_minor, row.currency)}</span><span>Recibido: {money(row.received_minor, row.currency)}</span><span>Saldo de cuotas: {money(Number(row.agreed_minor) - Number(row.allocated_minor), row.currency)}</span><span>Sin asignar: {money(row.unassigned_minor, row.currency)}</span><span>Fondos del cliente: {money(row.client_funds_minor, row.currency)}</span></div>)}
    <div className="desk-two-columns"><AgreementForm write={write}/>
    <Form title="Registrar pago recibido" fields={[field('amount', 'Importe recibido'), field('currency', 'Moneda', 'select', currencies), field('effective_date', 'Fecha real del pago', 'date'), field('payer_id', 'Pagador', 'select', options), field('method', 'Medio utilizado'), field('reference', 'Referencia única del comprobante o recibo'), field('kind', 'Destino', 'select', ['HONORARIOS', 'FONDOS_CLIENTE']), { ...field('installment_id', 'Asignar a una cuota', 'select', quotas.map(q => ({ value: q.id, label: `${q.due_date} · ${money(Number(q.amount_minor) - Number(q.paid_minor), q.currency)}` }))), optional: true }, { ...field('allocated', 'Importe a asignar'), optional: true }, { ...field('invoice_number', 'Número de factura emitida externamente'), optional: true }, { ...field('invoice_cuf', 'CUF de factura existente'), optional: true }, field('confirmed', 'Verifiqué la recepción real del dinero', 'checkbox')]}
      onSubmit={async ({ installment_id, allocated, invoice_number, invoice_cuf, ...values }) => write('/pagos', { ...values,
        ...((invoice_number || invoice_cuf) ? { invoice_metadata: { number: invoice_number || '', cuf: invoice_cuf || '' } } : {}), allocations: installment_id ? [{ installment_id, amount: allocated }] : [] })}/></div>
    {payments.map(payment => <div className="desk-card" key={payment.id}><strong>{money(payment.amount_minor, payment.currency)} · {payment.reference}</strong><p>{payment.reversed ? 'Registro revertido' : 'Recepción registrada'} · {payment.effective_date}</p>
      {!payment.reversed && payment.kind === 'HONORARIOS' && Number(payment.allocated_minor) < Number(payment.amount_minor) && <Form title="Asignar saldo del pago" fields={[field('installment_id', 'Cuota', 'select', quotas.filter(q => q.currency === payment.currency).map(q => ({ value: q.id, label: `${q.due_date} · ${money(Number(q.amount_minor) - Number(q.paid_minor), q.currency)}` }))), field('amount', 'Importe a asignar')]}
        onSubmit={({ installment_id, amount }) => write('/pagos/' + payment.id + '/asignaciones', { expected_version: payment.version, allocations: [{ installment_id, amount }] })}/>}
      {!payment.reversed && <Form title="Reversión contable completa" fields={[field('reason', 'Motivo', 'textarea'), field('effective_date', 'Fecha del ajuste', 'date')]}
        onSubmit={values => write('/pagos/' + payment.id + '/reversion', { ...values, expected_version: payment.version })} submit="Registrar reversión"/>}</div>)}
    <div className="desk-two-columns"><Form title="Gasto del caso" fields={[field('description', 'Concepto'), field('amount', 'Importe'), field('currency', 'Moneda', 'select', currencies), field('effective_date', 'Fecha real', 'date'), field('reference', 'Referencia'), field('kind', 'Origen de fondos', 'select', ['OPERATIVO', 'FONDOS_CLIENTE'])]} onSubmit={values => write('/gastos', values)}/>
      <Form title="Tarea, audiencia o plazo manual" fields={[field('title', 'Descripción'), field('kind', 'Tipo', 'select', ['TAREA', 'AUDIENCIA', 'PLAZO']), field('due_at', 'Fecha y hora de Bolivia', 'datetime-local'), field('date_source', 'Fuente de la fecha'), field('manual_confirmed', 'Confirmé personalmente la fecha', 'checkbox')]}
        onSubmit={values => write('/tareas', { ...values, due_at: values.due_at + ':00-04:00' })}/></div>
    <h3>Tareas registradas</h3>{records.filter(r => r.sk.startsWith('TASK#')).map(task => <div className="desk-card" key={task.id}><strong>{task.title}</strong><p>{task.state} · {new Date(task.due_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</p>
      {task.state === 'PENDIENTE' && <button disabled={readOnly} onClick={async () => { try { await deskRequest('/casos/' + id + '/tareas/' + task.id, { method: 'PATCH', body: { expected_version: task.version, state: 'HECHO' } }); await refresh(); } catch (err) { setError(err.message); } }}>Marcar completada</button>}</div>)}
    <Form title="Vincular cita del panel anterior" fields={[field('appointment_id', 'Identificador de la cita existente')]}
      onSubmit={values => write('/citas', { ...values, expected_version: data.item.version })}/>
    {records.filter(r => r.sk.startsWith('APPOINTMENT#')).map(row => <p key={row.sk}>Cita vinculada: {row.appointment_id}</p>)}
    {data.next_cursor && <button onClick={async () => { try { const page = await deskRequest('/casos/' + id, { query: { cursor: data.next_cursor } }); setData({ ...page, records: [...records, ...page.records] }); } catch (err) { setError(err.message); } }}>Cargar más registros del caso</button>}
  </section>;
}

function AgreementForm({ write }) {
  const empty = () => ({ key: crypto.randomUUID(), due_date: '', amount: '' });
  const [quotas, setQuotas] = useState(() => [empty()]);
  return <Form title="Honorarios y cuotas" fields={[field('description', 'Concepto acordado'), field('amount', 'Total pactado'), field('currency', 'Moneda', 'select', currencies), field('effective_date', 'Fecha del acuerdo', 'date')]}
    onSubmit={async values => { await write('/honorarios', { ...values, installments: quotas.map(({ due_date, amount }) => ({ due_date, amount })) }); setQuotas([empty()]); }}>
    <p>La suma de las cuotas debe coincidir con el total pactado.</p>
    {quotas.map((quota, index) => <div className="desk-fields" key={quota.key}><label>Cuota {index + 1} · vencimiento<input type="date" required value={quota.due_date} onChange={e => setQuotas(old => old.map(row => row.key === quota.key ? { ...row, due_date: e.target.value } : row))}/></label>
      <label>Importe<input required value={quota.amount} onChange={e => setQuotas(old => old.map(row => row.key === quota.key ? { ...row, amount: e.target.value } : row))}/></label>{quotas.length > 1 && <button type="button" onClick={() => setQuotas(old => old.filter(row => row.key !== quota.key))}>Quitar cuota</button>}</div>)}
    {quotas.length < 20 && <button type="button" onClick={() => setQuotas(old => [...old, empty()])}>Agregar cuota</button>}
  </Form>;
}

function AddPartyForm({ version, write }) {
  const [name, setName] = useState('');
  const [people, setPeople] = useState({ items: [] });
  const [error, setError] = useState('');
  return <section><h3>Agregar parte al borrador</h3><p>Agregar una parte invalida la revisión anterior. Los datos originales del relato se conservan.</p>
    <div className="desk-search"><input aria-label="Buscar parte registrada" value={name} onChange={e => setName(e.target.value)}/><button onClick={async () => { try { setPeople(await deskRequest('/personas', { query: { name } })); } catch (err) { setError(err.message); } }}>Buscar persona</button></div>
    {error && <p className="desk-error">{error}</p>}
    {people.next_cursor && <button onClick={async () => { try { const page = await deskRequest('/personas', { query: { name, cursor: people.next_cursor } }); setPeople({ ...page, items: [...people.items, ...page.items] }); } catch (err) { setError(err.message); } }}>Más personas</button>}
    <Form title="Vincular persona" fields={[field('person_id', 'Persona registrada', 'select', people.items.map(p => ({ value: p.id, label: p.display_name }))), field('role', 'Rol en el caso', 'select', ['CLIENTE', 'REPRESENTADO', 'PAGADOR', 'CONTRAPARTE', 'OTRO'])]}
      onSubmit={values => write('/partes', { ...values, expected_version: version })}/>
  </section>;
}

function PeriodView({ metrics }) {
  const readOnly = useContext(ReadOnlyContext);
  const [period, setPeriod] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null);
  const [cutoff, setCutoff] = useState('');
  const [dueJob, setDueJob] = useState(null);
  const [view, setView] = useState('MES');
  const [agendaDate, setAgendaDate] = useState('');
  async function load(more = false) { try { const response = await deskRequest(metrics ? '/metricas' : '/agenda', { query: { period, ...(!metrics ? { view, date: agendaDate } : {}), cursor: more ? data.next_cursor : undefined } }); setData(more ? { ...response, items: [...data.items, ...response.items] } : response); } catch (err) { setError(err.message); } }
  const labels = { AGREED: 'Pactado', RECEIVED: 'Recibido', UNASSIGNED: 'Sin asignar', EXPENSES: 'Gastos', CLIENT_FUNDS: 'Fondos de clientes' };
  return <section className="desk-panel"><h2>{metrics ? 'Métricas por período' : 'Agenda interna'}</h2>
    <p>{metrics ? 'Oportunidades y casos por mes de alta; importes por fecha del movimiento y moneda. Cálculo asincrónico: no se basa en la página visible del embudo.' : 'Fechas ingresadas y confirmadas manualmente, en horario de Bolivia. No calcula plazos jurídicos.'}</p>
    <div className="desk-search"><input type="month" aria-label="Período" value={period} onChange={e => { setPeriod(e.target.value); setData(null); setJob(null); setError(''); }}/><button onClick={() => load()}>Consultar</button></div>
    {!metrics && <div className="desk-search"><select aria-label="Vista de agenda" value={view} onChange={e => { setView(e.target.value); setData(null); }}><option value="MES">Mes</option><option value="DIA">Día</option><option value="SEMANA">Siete días</option></select>{view !== 'MES' && <label>Desde esta fecha<input type="date" value={agendaDate} onChange={e => { setAgendaDate(e.target.value); setData(null); }}/></label>}</div>}
    {metrics && <div className="desk-notice"><button disabled={readOnly} onClick={async () => { try { setJob(await deskRequest('/metricas/rebuild', { method: 'POST', body: { period } })); setError(''); } catch (err) { setError(err.message); } }}>Iniciar conciliación del período</button>
      {job && <><span>{job.status} · {job.processed_events === undefined ? 'Pendiente' : `${job.processed_events} eventos revisados`}</span>{job.status !== 'DONE' && <button onClick={async () => { try { const next = await deskRequest('/jobs/' + job.job_id + '/step', { method: 'POST', body: { expected_version: job.version } }); setJob(next); if (next.status === 'DONE') await load(); } catch (err) { setError(err.message); } }}>Continuar conciliación</button>}</>}
    </div>}
    {metrics && <div className="desk-notice"><label>Cuotas con vencimiento anterior a esta fecha<input type="date" value={cutoff} onChange={e => { setCutoff(e.target.value); setDueJob(null); }}/></label>
      <p>Consulta saldo impago actual por moneda. No reconstruye qué se debía históricamente en esa fecha.</p>
      <button disabled={readOnly} onClick={async () => { try { setDueJob(await deskRequest('/metricas/vencido', { method: 'POST', body: { cutoff_date: cutoff } })); } catch (err) { setError(err.message); } }}>Consultar saldo vencido</button>
      {dueJob && <><p>{dueJob.status}</p>{dueJob.status !== 'DONE' ? <button onClick={async () => { try { setDueJob(await deskRequest('/jobs/' + dueJob.job_id + '/step', { method: 'POST', body: { expected_version: dueJob.version } })); } catch (err) { setError(err.message); } }}>Continuar cálculo</button> : Object.entries(dueJob.totals || {}).map(([ccy, value]) => <p key={ccy}>{money(value, ccy)}</p>)}</>}
    </div>}
    {error && <p className="desk-error">{error}</p>}{data && !data.items.length && <p className="desk-empty">No hay registros procesados para este período.</p>}
    {data?.items.map(row => metrics ? <div className="desk-record" key={row.sk}>{row.sk.startsWith('OPP#') ? stageLabels[row.sk.split('#')[1]] : row.sk.startsWith('CASE#') ? `Casos ${row.sk.split('#')[1]}` : `${labels[row.sk.split('#')[0]] || 'Movimiento'} · ${row.sk.split('#')[1]}`}<strong>{row.sk.startsWith('OPP#') || row.sk.startsWith('CASE#') ? Number(row.value) : money(row.value, row.sk.split('#')[1])}</strong><small>Calculado: {new Date(row.updated_at).toLocaleString('es-BO')}</small></div> : <div className="desk-record" key={row.id}><strong>{row.title}</strong><span>{row.kind} · {row.state} · {new Date(row.due_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</span></div>)}
    {data?.next_cursor && <button onClick={() => load(true)}>Cargar más</button>}
  </section>;
}

export default function DespachoPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('intake');
  const [config, setConfig] = useState(null);
  const [people, setPeople] = useState({ items: [] });
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [opportunity, setOpportunity] = useState(null);
  const [error, setError] = useState('');
  const enabled = import.meta.env.VITE_DESPACHO_ENABLED === 'true';
  const refreshPeople = useCallback(async () => setPeople(await deskRequest('/personas')), []);
  useEffect(() => {
    async function load() {
      try { await currentSession(); } catch { navigate('/login'); return; }
      if (enabled) { try { setConfig(await deskRequest('/config')); await refreshPeople(); } catch (err) { setError(err.message); } }
    }
    load();
  }, [enabled, navigate, refreshPeople]);
  const menu = [['intake', Plus, 'Alta rápida'], ['people', Users, 'Personas'], ['pipeline', TrendingUp, 'Embudo'], ['cases', BriefcaseBusiness, 'Casos'], ['agenda', CalendarDays, 'Agenda'], ['metrics', Wallet, 'Métricas']];
  return <main className="desk-app"><header className="desk-header"><Link to="/admin"><ArrowLeft size={18}/> Panel anterior</Link><img src="/logo.jpg" alt="Despacho Jhoselyn Gonzales"/><button onClick={() => { signOut(); navigate('/login'); }}>Cerrar sesión</button></header>
    <div className="desk-heading"><p className="desk-eyebrow">Gestión del despacho</p><h1>Personas, asuntos y seguimiento.</h1><p>Una ficha por persona. Un expediente por asunto. Cada movimiento conserva su historia.</p></div>
    {!enabled ? <section className="desk-panel"><h2>Despacho en desarrollo</h2><p>El nuevo módulo no está habilitado en este entorno. El panel actual sigue disponible.</p></section> : <>
      {config && <div className="desk-notice"><ShieldCheck size={18}/><span>{config.environment === 'staging' ? 'Entorno de pruebas aislado' : 'Despacho'} · {config.pilot_enabled ? 'Piloto habilitado' : 'Piloto con expedientes reales pendiente de habilitación'}</span></div>}
      {config?.environment === 'production' && !config.pilot_enabled && <p className="desk-notice">Modo revisión: sólo lectura. Puedes recorrer las pantallas; altas, cambios y cálculos con jobs se habilitarán después de acordar el piloto y la conservación de expedientes.</p>}
      {error && <p className="desk-error" role="alert">{error}</p>}
      {!config ? <p>Cargando configuración del despacho…</p> : <ReadOnlyContext.Provider value={config.environment === 'production' && !config.pilot_enabled}><nav className="desk-tabs">{menu.map(([key, Icon, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setSelectedCase(null); setSelectedPerson(null); setOpportunity(null); }}><Icon size={17}/>{label}</button>)}</nav>
        {selectedCase ? <CaseDetail key={selectedCase} id={selectedCase}/> : tab === 'intake' ? <Intake people={people} opportunity={opportunity} onCreated={async id => { await refreshPeople(); setSelectedCase(id); setOpportunity(null); }}/>
          : tab === 'people' ? <><People people={people} onChange={refreshPeople} onSelect={setSelectedPerson}/>{selectedPerson && <PersonDetail key={selectedPerson.id} person={selectedPerson} onOpenCase={setSelectedCase} onChange={async id => { setSelectedPerson(await deskRequest('/personas/' + id)); await refreshPeople(); }}/>}</>
          : tab === 'pipeline' ? <Pipeline people={people} onChange={refreshPeople} onConvert={async item => { const person = await deskRequest('/personas/' + item.person_id); setPeople(old => ({ ...old, items: old.items.some(p => p.id === person.id) ? old.items : [person, ...old.items] })); setOpportunity(item); setTab('intake'); }}/>
          : tab === 'cases' ? <CaseList onSelect={setSelectedCase}/>
          : <PeriodView key={tab} metrics={tab === 'metrics'}/>}</ReadOnlyContext.Provider>}
    </>}
  </main>;
}
