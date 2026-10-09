// roomBase.js — shared machinery for all 20 daycare rooms: shell building,
// interaction registration, guided activity steps, rewards, baby handling.
import * as THREE from 'three';
import { roomShell } from './kit.js';
import { tween, wait } from './tween.js';

export class RoomBase {
  static def = { id: 'room', nameAr: 'غرفة', nameEn: 'Room', emoji: '🚪', color: '#7c4dff', color2: '#448aff', music: 'play', sky: 'indoor' };
  get def() { return this.constructor.def; }

  constructor(game) {
    this.game = game;
    this.hits = [];
    this.group = new THREE.Group();
    this.stepDefs = [];
    this.doneSteps = new Set();
    this.timers = new Set();
    this.customUpdate = null;
    this.active = false;
    this._babiesHere = [];
  }

  /* ---------- lifecycle ---------- */
  ensureBuilt() {
    if (!this._built) { this.build(); this._built = true; }
    return this.group;
  }
  build() { return this.group; }            // override
  enter() {}                                 // override
  exit() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.game.audio.stopAllLoops();
    // detach persistent babies so the room dispose never touches them
    for (const b of this._babiesHere) b.parent?.remove(b);
    this._babiesHere = [];
  }
  update(dt, time) { this.customUpdate?.(dt, time); }

  later(ms, fn) { const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms); this.timers.add(t); return t; }

  /* ---------- shell & helpers ---------- */
  shell(opts = {}) { const s = roomShell(opts); this.group.add(s); return s; }

  addHit(obj, handlers) {
    obj.userData.hit = handlers;
    this.hits.push(obj);
    return obj;
  }
  clearHits() { this.hits.length = 0; }

  /* ---------- guided steps ---------- */
  setSteps(defs) {
    this.stepDefs = defs.map(d => ({ ...d }));
    this.doneSteps.clear();
    this._refreshSteps();
  }
  isStepDone(id) { return this.doneSteps.has(id); }
  currentStep() { return this.stepDefs.find(s => !this.doneSteps.has(s.id)); }
  step(id) {
    if (this.doneSteps.has(id)) return false;
    this.doneSteps.add(id);
    this.game.audio.sfx('success');
    const cur = this.currentStep();
    if (!cur) this._allDone();
    this._refreshSteps();
    return true;
  }
  _refreshSteps() {
    const cur = this.currentStep()?.id;
    this.game.ui.setSteps(this.stepDefs.map(s => ({
      label: s.label, icon: s.icon, done: this.doneSteps.has(s.id), now: s.id === cur,
    })));
  }
  _allDone() {
    const d = this.def;
    this.game.audio.stopAllLoops();
    this.game.audio.sfx('complete');
    this.game.rewards.confetti();
    this.game.rewards.grant(d.rewardCoins ?? 10, d.rewardStars ?? 1);
    this.game.rewards.toast(`أتممت نشاط ${d.nameAr}! +${d.rewardCoins ?? 10} 🪙`, '🎉', 'gold');
    if (d.stat) this.game.tasks.count(d.stat);
    this.onAllStepsDone?.();
  }

  hint(text) { this.game.ui.setHint(text); }

  /* ---------- baby helpers ---------- */
  addBaby(x = 0, z = 1.5, ry = 0, anim = 'idle') {
    const baby = this.game.activeBaby;
    baby.position.set(x, 0, z);
    baby.rotation.set(0, ry, 0);
    baby.animator.play(anim);
    baby.animLock = null;
    this.group.add(baby);
    this._babiesHere = [baby];
    return baby;
  }
  addNPCBaby(cfgId, x, z, ry, anim = 'idle') {
    const baby = this.game.babyReg.get(cfgId);
    baby.position.set(x, 0, z);
    baby.rotation.set(0, ry, 0);
    baby.animator.play(anim);
    this.group.add(baby);
    this._babiesHere.push(baby);
    return baby;
  }
  walkBabyTo(baby, x, z, dur = 1.2, onDone) {
    baby.animator.play('walk');
    const from = { x: baby.position.x, z: baby.position.z };
    const dir = Math.atan2(x - from.x, z - from.z);
    tween(baby.rotation, { y: dir }, { dur: .25 });
    tween(baby.position, { x, z }, { dur, onDone: () => { baby.animator.play('idle'); onDone?.(); } });
  }

  /* ---------- economy ---------- */
  rewardCoins(n, worldPos) {
    this.game.rewards.grant(n, 0);
    if (worldPos) {
      this.game.fx.burstStars(worldPos, 10, [0xffd54f, 0xffc107]);
      this.game.rewards.floater(worldPos, `+${n} 🪙`);
    }
  }

  /* ---------- camera view shortcut ---------- */
  view(v) { this.game.rig.setView(v); }
}
