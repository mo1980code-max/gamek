// Minimal tween engine (no external deps). A single global instance is
// advanced by the game loop. Works on plain numeric properties of any object.
export const Ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outElastic: t => { const c = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * c) + 1; },
};

class Tween {
  constructor(target, props, opts = {}) {
    this.target = target;
    this.props = props;
    this.dur = Math.max(0.001, opts.dur ?? 0.4);
    this.delay = opts.delay ?? 0;
    this.ease = opts.ease ?? Ease.outQuad;
    this.onDone = opts.onDone || null;
    this.onUpdate = opts.onUpdate || null;
    this.t = -this.delay;
    this.from = null;
    this.dead = false;
  }
  tick(dt) {
    if (this.dead) return true;
    this.t += dt;
    if (this.t < 0) return false;
    if (!this.from) {
      this.from = {};
      for (const k in this.props) this.from[k] = this.target[k] ?? 0;
    }
    const p = Math.min(1, this.t / this.dur);
    const e = this.ease(p);
    for (const k in this.props) {
      this.target[k] = this.from[k] + (this.props[k] - this.from[k]) * e;
    }
    if (this.onUpdate) this.onUpdate(e);
    if (p >= 1) { this.dead = true; if (this.onDone) this.onDone(); return true; }
    return false;
  }
}

class Tweener {
  constructor() { this.list = []; }
  to(target, props, opts = {}) {
    this.kill(target);
    const tw = new Tween(target, props, opts);
    this.list.push(tw);
    return tw;
  }
  kill(target) {
    for (const tw of this.list) if (tw.target === target) tw.dead = true;
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].tick(dt)) this.list.splice(i, 1);
    }
  }
  clear() { this.list.length = 0; }
}

export const tweener = new Tweener();
export const tween = (target, props, opts) => tweener.to(target, props, opts);
export const wait = (dur, onDone) => tweener.to(_dummy, { v: 1 }, { dur, onDone });
const _dummy = { v: 0 };
