// Bus d'événements minimal : découple les systèmes (quêtes, interface,
// audio, PNJ) sans dépendances circulaires.

const handlers = new Map();

export function on(name, fn) {
  if (!handlers.has(name)) handlers.set(name, new Set());
  handlers.get(name).add(fn);
  return () => handlers.get(name)?.delete(fn);
}

export function emit(name, data) {
  const set = handlers.get(name);
  if (!set) return;
  for (const fn of [...set]) {
    try { fn(data); } catch (e) { console.error(`[événement ${name}]`, e); }
  }
}
