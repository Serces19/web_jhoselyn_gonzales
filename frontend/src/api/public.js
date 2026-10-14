export async function readCollection(url, key) {
  const target = new URL(url, window.location.origin);
  const items = [];
  const seen = new Set();
  for (let pages = 0; pages < 20; pages += 1) {
    const response = await fetch(target);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar la información');
    items.push(...(data[key] || []));
    if (!data.next_cursor) return items;
    if (seen.has(data.next_cursor)) throw new Error('La paginación no pudo continuar');
    seen.add(data.next_cursor);
    target.searchParams.set('cursor', data.next_cursor);
  }
  throw new Error('Demasiados resultados; solicita una consulta más acotada');
}
