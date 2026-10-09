// Tiny event bus used across the whole game.
export class EventBus {
  constructor() { this._map = new Map(); }

  on(evt, fn) {
    if (!this._map.has(evt)) this._map.set(evt, new Set());
    this._map.get(evt).add(fn);
    return fn;
  }

  off(evt, fn) {
    const s = this._map.get(evt);
    if (s) s.delete(fn);
  }

  emit(evt, data) {
    const s = this._map.get(evt);
    if (s) for (const fn of [...s]) fn(data);
  }

  clear() { this._map.clear(); }
}
export const bus = new EventBus();
