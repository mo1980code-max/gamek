// saveSystem.js — localStorage persistence with autosave.
const KEY = 'babyJiniDaycare3D_v1';

const DEFAULTS = {
  coins: 40,
  stars: 0,
  selectedBaby: 'jini',
  outfits: {},          // babyId -> outfit patch
  needs: {},            // babyId -> needs snapshot
  owned: {},            // shop item id -> true
  decor: {},            // decoration placements
  wardrobeUnlocked: {}, // premium outfit ids
  tasks: { day: '', progress: {}, claimed: {} },
  stats: { feedings: 0, baths: 0, sleeps: 0, minigames: 0, meals: 0, petcare: 0, puzzles: 0, diapers: 0, drawings: 0, songs: 0, stories: 0, parties: 0, laundry: 0, doctor: 0 },
  bestScores: {},       // minigame id -> best
  settings: { music: .7, sfx: .9, muted: false },
  visited: {},          // roomId -> count
  photos: 0,
};

export class SaveSystem {
  constructor() {
    this.data = this._load();
    this._acc = 0;
  }
  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return deepMerge(structuredClone(DEFAULTS), parsed);
      }
    } catch (e) { console.warn('save load failed', e); }
    return structuredClone(DEFAULTS);
  }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full/blocked */ }
  }
  tick(dt) {
    this._acc += dt;
    if (this._acc > 6) { this._acc = 0; this.save(); }
  }
  reset() {
    localStorage.removeItem(KEY);
    this.data = structuredClone(DEFAULTS);
    this.save();
  }
}

function deepMerge(base, over) {
  for (const k in over) {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && typeof base[k] === 'object' && base[k]) {
      deepMerge(base[k], over[k]);
    } else {
      base[k] = over[k];
    }
  }
  return base;
}
