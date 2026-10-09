// babyAI.js — needs simulation + behavior state machine for each baby.
export const BabyStates = {
  IDLE: 'idle',
  HAPPY: 'happy',
  HUNGRY: 'hungry',
  SLEEPY: 'sleepy',
  DIRTY: 'dirty',
  PLAYING: 'playing',
  EATING: 'eating',
  BATHING: 'bathing',
  SLEEPING: 'sleeping',
  CRYING: 'crying',
  SICK: 'sick',
};

export class Needs {
  constructor(save = null) {
    this.hunger = 80; this.energy = 80; this.happiness = 80;
    this.hygiene = 85; this.health = 95; this.comfort = 80;
    if (save) Object.assign(this, save);
  }
  // decay multipliers tuned gentle for children — nothing crashes fast
  tick(dt, decay = {}) {
    const d = (cur, rate) => Math.max(0, Math.min(100, cur - rate * dt));
    this.hunger = d(this.hunger, (decay.hunger ?? 1) * 0.55);
    this.energy = d(this.energy, (decay.energy ?? 1) * 0.38);
    this.happiness = d(this.happiness, (decay.happiness ?? 1) * 0.30);
    this.hygiene = d(this.hygiene, (decay.hygiene ?? 1) * 0.26);
    this.health = d(this.health, (decay.health ?? 1) * 0.10);
    this.comfort = d(this.comfort, (decay.comfort ?? 1) * 0.22);
  }
  apply(o) {
    for (const k of ['hunger', 'energy', 'happiness', 'hygiene', 'health', 'comfort']) {
      if (o[k] !== undefined) this[k] = Math.max(0, Math.min(100, this[k] + o[k]));
    }
  }
  lowest() {
    let min = Infinity, key = 'hunger';
    for (const k of ['hunger', 'energy', 'happiness', 'hygiene', 'health', 'comfort']) {
      if (this[k] < min) { min = this[k]; key = k; }
    }
    return { key, value: min };
  }
  toJSON() { return { ...this }; }
}

export const NEED_META = {
  hunger:    { icon: '🍎', ar: 'الجوع', color: '#ff9f43' },
  energy:    { icon: '⚡', ar: 'الطاقة', color: '#448aff' },
  happiness: { icon: '😊', ar: 'السعادة', color: '#ff6fb5' },
  hygiene:   { icon: '🛁', ar: 'النظافة', color: '#26c6da' },
  health:    { icon: '❤️', ar: 'الصحة', color: '#ef5350' },
  comfort:   { icon: '🧸', ar: 'الراحة', color: '#7c4dff' },
};

export class BabyAI {
  // cfg: character config (decay rates etc). needs: Needs instance.
  constructor(cfg, needs) {
    this.cfg = cfg;
    this.needs = needs;
    this.state = BabyStates.IDLE;
    this.busy = null;          // activity lock set by rooms (eating/bathing…)
    this._soundAcc = Math.random() * 8;
    this._cryAcc = 0;
  }

  // rooms call this when the player cares for the baby
  apply(effects) {
    this.needs.apply(effects);
    this._evalState(true);
  }

  setBusy(activity) {   // 'eating' | 'bathing' | 'sleeping' | 'playing' | null
    this.busy = activity;
    this._evalState(true);
  }

  update(dt, onEvent) {
    this.needs.tick(dt, this.cfg.decay || {});
    this._evalState(false);

    // occasional ambient sounds depending on state
    this._soundAcc -= dt;
    if (this._soundAcc <= 0) {
      this._soundAcc = 6 + Math.random() * 10;
      if (this.state === BabyStates.CRYING) onEvent?.('cry');
      else if (this.state === BabyStates.HUNGRY) onEvent?.('cry');
      else if (this.state === BabyStates.SLEEPING) onEvent?.('snore');
      else if (this.state === BabyStates.SLEEPY) onEvent?.('yawn');
      else if (this.state === BabyStates.HAPPY || this.state === BabyStates.PLAYING) onEvent?.('giggle');
      else if (Math.random() < .6) onEvent?.('babble');
    }
  }

  _evalState(force) {
    const n = this.needs;
    let next;
    if (this.busy) {
      next = {
        eating: BabyStates.EATING, bathing: BabyStates.BATHING,
        sleeping: BabyStates.SLEEPING, playing: BabyStates.PLAYING,
      }[this.busy] || BabyStates.IDLE;
    } else if (n.health < 30) next = BabyStates.SICK;
    else if (n.hunger < 25) next = BabyStates.HUNGRY;
    else if (n.hygiene < 25) next = BabyStates.DIRTY;
    else if (n.energy < 25) next = BabyStates.SLEEPY;
    else if (n.hunger < 15 || n.energy < 12 || n.happiness < 15) next = BabyStates.CRYING;
    else if (n.happiness > 65 && n.hunger > 45 && n.energy > 40) next = BabyStates.HAPPY;
    else next = BabyStates.IDLE;

    if (next !== this.state || force) {
      const prev = this.state;
      this.state = next;
      this.onStateChange?.(next, prev);
    }
  }

  // emoji bubble shown above the baby's head
  bubbleEmoji() {
    switch (this.state) {
      case BabyStates.HUNGRY: return '🍼';
      case BabyStates.SLEEPY: return '😴';
      case BabyStates.DIRTY: return '🛁';
      case BabyStates.CRYING: return '😢';
      case BabyStates.SICK: return '🤒';
      case BabyStates.HAPPY: return '😄';
      case BabyStates.PLAYING: return '🧸';
      case BabyStates.EATING: return '😋';
      case BabyStates.BATHING: return '🫧';
      case BabyStates.SLEEPING: return '💤';
      default: return null;
    }
  }

  moodFace() {
    switch (this.state) {
      case BabyStates.HUNGRY: return 'sad';
      case BabyStates.SLEEPY: return 'sleepy';
      case BabyStates.DIRTY: return 'annoyed';
      case BabyStates.CRYING: return 'crying';
      case BabyStates.SICK: return 'sick';
      case BabyStates.HAPPY: return 'happy';
      case BabyStates.PLAYING: return 'excited';
      case BabyStates.EATING: return 'happy';
      case BabyStates.BATHING: return 'happy';
      case BabyStates.SLEEPING: return 'sleep';
      default: return 'neutral';
    }
  }
}
