import { currentSession, signOut } from './auth';

const versions = new Map();
const requests = new Map();
const inFlight = new Set();

export function clearApiState() { versions.clear(); requests.clear(); inFlight.clear(); }

function remember(path, data) {
  if (data.version !== undefined) versions.set(path, data.version);
  for (const [collection, id] of [['appointments', 'appointment_id'], ['posts', 'post_id'], ['leads', 'lead_id'], ['requests', 'request_id']]) {
    for (const item of data[collection] || []) versions.set(`${path}/${item[id]}`, Number(item.version || 0));
  }
}

export async function adminFetch(input, options = {}, pagination = { seen: new Set(), count: 0 }) {
  const url = new URL(input, window.location.origin);
  url.pathname = url.pathname.replace(/^\/api\/(?!admin\/)/, '/api/admin/');
  const { session } = await currentSession();
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...options.headers, Authorization: `Bearer ${session.getAccessToken().getJwtToken()}` };
  let body = options.body ? JSON.parse(options.body) : {};
  if (['PUT', 'PATCH', 'DELETE'].includes(method)) {
    const version = versions.get(url.pathname);
    if (version === undefined) throw new Error('Vuelve a cargar el registro antes de modificarlo');
    body = { ...body, expected_version: version };
    headers['Content-Type'] = 'application/json';
  }
  const fingerprint = `${method}:${url.pathname}:${JSON.stringify(body)}`;
  if (method === 'POST') {
    if (!requests.has(fingerprint)) requests.set(fingerprint, crypto.randomUUID());
    headers['Idempotency-Key'] = requests.get(fingerprint);
  }
  const mutating = method !== 'GET';
  if (mutating && inFlight.has(url.pathname)) throw new Error('Espera a que termine la actualización anterior');
  if (mutating) inFlight.add(url.pathname);
  try {
    const response = await fetch(url, { ...options, method, headers, body: method === 'GET' ? undefined : JSON.stringify(body) });
    const data = await response.clone().json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) { signOut(); clearApiState(); window.location.assign('/login'); }
      throw new Error(data.error || 'No se pudo completar la operación');
    }
    if (method === 'GET') remember(url.pathname, data);
    else if (['PUT', 'PATCH', 'DELETE'].includes(method)) versions.delete(url.pathname);
    if (method === 'POST') requests.delete(fingerprint);
    if (method === 'GET' && data.next_cursor) {
      const cursor = data.next_cursor;
      if (pagination.count >= 20 || pagination.seen.has(cursor)) throw new Error('Demasiados resultados o cursor repetido; acota la consulta');
      pagination.seen.add(cursor); pagination.count += 1;
      url.searchParams.set('cursor', cursor);
      const next = await adminFetch(url.toString(), options, pagination);
      const tail = await next.json();
      for (const key of ['appointments', 'posts', 'leads', 'requests']) {
        if (data[key]) data[key].push(...(tail[key] || []));
      }
      data.next_cursor = null;
      return new Response(JSON.stringify(data), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    }
    return response;
  } finally {
    if (mutating) inFlight.delete(url.pathname);
  }
}
