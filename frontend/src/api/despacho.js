import { currentSession, signOut } from './auth';

const pending = new Map();
const inFlight = new Set();
const base = import.meta.env.VITE_DESPACHO_API_ENDPOINT || import.meta.env.VITE_API_ENDPOINT;

export async function deskRequest(path, { method = 'GET', body, query } = {}) {
  const { session } = await currentSession();
  const url = new URL(`${base}/api/admin/despacho${path}`);
  for (const [key, value] of Object.entries(query || {})) if (value !== undefined && value !== '') url.searchParams.set(key, value);
  const headers = { Authorization: `Bearer ${session.getAccessToken().getJwtToken()}` };
  const fingerprint = `${method}:${path}:${JSON.stringify(body)}`;
  if (method !== 'GET') {
    if (inFlight.has(path)) throw new Error('Espera a que termine la operación anterior');
    if (!pending.has(fingerprint)) pending.set(fingerprint, crypto.randomUUID());
    headers['Idempotency-Key'] = pending.get(fingerprint);
    headers['Content-Type'] = 'application/json';
    inFlight.add(path);
  }
  try {
    const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) {
      if ([401, 403].includes(response.status)) { signOut(); pending.clear(); window.location.assign('/login'); }
      throw new Error(result.error?.message || 'No se pudo completar la operación');
    }
    pending.delete(fingerprint);
    return result.data;
  } finally { inFlight.delete(path); }
}
