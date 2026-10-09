// babyAnimations.js — procedural animation rig for the babies.
// Each animation is a pure function computing a *target pose* every frame;
// the rig then exponential-damps toward that target, which gives free smooth
// crossfades between any two animations.
//
// Rig contract (created by Baby):
//   root      : outer THREE.Group (ground contact, position moved by rooms)
//   hips      : group at hip height (y offset channel = crouch/bounce)
//   torso, head : groups/meshes
//   armL/armR : groups pivoted at the shoulders, arms extend along -Y
//   legL/legR : groups pivoted at the hips, legs extend along -Y
export const ANIMS = [
  'idle', 'walk', 'run', 'sit', 'sleep', 'eat', 'drink', 'cry', 'laugh',
  'dance', 'clap', 'bath', 'play', 'jump', 'swim', 'carried', 'ride',
];

export class BabyAnimator {
  constructor(rig) {
    this.rig = rig;
    this.name = 'idle';
    this.t = 0;
    this.speed = 1;
    this.onChew = null;      // callback fired periodically by eat anim
    this.onStep = null;      // fired by walk anim (for footstep sounds)
    this._stepAcc = 0;
    this._chewAcc = 0;
    this.loop = true;
    this.onDone = null;
    this.onceT = 0;
  }

  play(name, opts = {}) {
    if (!ANIMS.includes(name)) name = 'idle';
    if (this.name !== name) { this.name = name; this.t = 0; this.onceT = 0; }
    this.speed = opts.speed ?? 1;
    this.loop = opts.loop ?? true;
    this.onDone = opts.onDone ?? null;
    return this;
  }

  // compute target pose channels
  _pose() {
    const t = this.t;
    const S = Math.sin, C = Math.cos;
    const p = {
      hipsY: 0, rootRotX: 0, rootRotZ: 0,
      torsoRotX: 0, torsoRotZ: 0, torsoScaleY: 1,
      headRotX: 0, headRotY: 0, headRotZ: 0,
      armLRotX: 0, armLRotZ: .18, armRRotX: 0, armRRotZ: -.18,
      legLRotX: 0, legRRotX: 0,
      leanZ: 0,
    };
    switch (this.name) {
      case 'idle':
        p.hipsY = S(t * 2) * .015 + .01;
        p.headRotZ = S(t * 1.3) * .06;
        p.headRotY = S(t * .7) * .15;
        p.armLRotZ = .18 + S(t * 2) * .06;
        p.armRRotZ = -.18 - S(t * 2 + 1) * .06;
        p.torsoScaleY = 1 + S(t * 2) * .015;
        break;
      case 'walk': {
        const w = t * 9;
        p.legLRotX = S(w) * .65;
        p.legRRotX = -S(w) * .65;
        p.armLRotX = -S(w) * .5;
        p.armRRotX = S(w) * .5;
        p.hipsY = Math.abs(S(w)) * .04 + .01;
        p.torsoRotZ = S(w) * .04;
        p.headRotY = S(w * .5) * .08;
        this._footstep(w);
        break;
      }
      case 'run': {
        const w = t * 14;
        p.legLRotX = S(w) * .95;
        p.legRRotX = -S(w) * .95;
        p.armLRotX = -S(w) * 1;
        p.armRRotX = S(w) * 1;
        p.hipsY = Math.abs(S(w)) * .06;
        p.torsoRotX = .18;
        p.leanZ = 0;
        this._footstep(w);
        break;
      }
      case 'sit':
        p.hipsY = -.22;
        p.legLRotX = -1.45; p.legRRotX = -1.45;
        p.armLRotZ = .5; p.armRRotZ = -.5;
        p.armLRotX = -.4; p.armRRotX = -.4;
        p.headRotZ = S(t * 1.5) * .05;
        break;
      case 'sleep':
        p.rootRotX = -Math.PI / 2 * .94;
        p.hipsY = -.12;
        p.legLRotX = .12; p.legRRotX = .05;
        p.armLRotZ = .35; p.armRRotZ = -.35;
        p.armLRotX = .1; p.armRRotX = .1;
        p.torsoScaleY = 1 + S(t * 1.4) * .04;   // slow breathing
        p.headRotZ = .15;
        break;
      case 'eat': {
        const cyc = (t * 2.2) % 1;
        const up = cyc < .45;
        p.armRRotX = up ? -2.2 : -.6;
        p.armRRotZ = -.35;
        p.headRotX = up ? .18 : .05;
        p.hipsY = .01 + S(t * 4) * .01;
        p.headRotZ = S(t * 9) * (up ? .05 : 0);   // chewing wobble
        this._chew(up);
        break;
      }
      case 'drink':
        p.armRRotX = -2.5; p.armRRotZ = -.5;
        p.armLRotX = -2.3; p.armLRotZ = .5;
        p.headRotX = .25;
        p.hipsY = .01;
        break;
      case 'cry': {
        const sh = S(t * 22) * .03;
        p.rootRotZ = sh;
        p.headRotX = .3 + S(t * 5) * .08;
        p.headRotZ = S(t * 3) * .1;
        p.armLRotX = -2.4; p.armLRotZ = .55;
        p.armRRotX = -2.4; p.armRRotZ = -.55;    // rubbing eyes
        p.hipsY = -.03 + S(t * 11) * .015;
        break;
      }
      case 'laugh': {
        const b = Math.abs(S(t * 6));
        p.hipsY = b * .09;
        p.headRotX = -.25;
        p.armLRotX = -2.6 + S(t * 8) * .2; p.armLRotZ = .7;
        p.armRRotX = -2.6 - S(t * 8) * .2; p.armRRotZ = -.7;
        p.torsoRotX = -.12;
        break;
      }
      case 'dance': {
        const w = t * 7;
        p.hipsY = Math.abs(S(w)) * .1 + .02;
        p.rootRotZ = S(w * .5) * .12;
        p.armLRotZ = .3 + (S(w) > 0 ? 2.4 : .3);
        p.armRRotZ = -.3 - (S(w) < 0 ? 2.4 : .3);
        p.headRotZ = S(w * .5 + 1) * .2;
        p.legLRotX = S(w) * .3;
        p.legRRotX = -S(w) * .3;
        break;
      }
      case 'clap': {
        const cl = (Math.sin(t * 9) + 1) / 2;
        p.armLRotX = -1.2; p.armRRotX = -1.2;
        p.armLRotZ = .25 + cl * .55;
        p.armRRotZ = -.25 - cl * .55;
        p.headRotX = -.08;
        p.hipsY = S(t * 9) * .02 + .02;
        break;
      }
      case 'bath': {
        const w = t * 5;
        p.hipsY = -.18;
        p.legLRotX = -1.3; p.legRRotX = -1.3;
        p.armLRotX = -1.8 + S(w) * .8; p.armLRotZ = .8;
        p.armRRotX = -1.8 - S(w) * .8; p.armRRotZ = -.8;
        p.headRotX = S(w * .7) * .15;
        break;
      }
      case 'play': {
        const b = Math.abs(S(t * 4));
        p.hipsY = b * .07;
        p.armLRotX = -1.4 + S(t * 6) * .6; p.armLRotZ = .7;
        p.armRRotX = -1.4 - S(t * 6) * .6; p.armRRotZ = -.7;
        p.headRotX = -.12;
        p.legLRotX = b * .3; p.legRRotX = b * .3;
        break;
      }
      case 'jump':
        p.legLRotX = -1; p.legRRotX = -1;
        p.armLRotX = -2.8; p.armLRotZ = .5;
        p.armRRotX = -2.8; p.armRRotZ = -.5;
        p.headRotX = -.15;
        break;
      case 'swim': {
        const w = t * 6;
        p.rootRotX = -Math.PI / 2 * .96;
        p.hipsY = -.1;
        p.armLRotX = S(w) * 1.4 - .4;
        p.armRRotX = -S(w) * 1.4 - .4;
        p.legLRotX = -S(w) * .5;
        p.legRRotX = S(w) * .5;
        p.headRotX = .5;
        break;
      }
      case 'carried':
        p.armLRotX = -2.2; p.armLRotZ = .8;
        p.armRRotX = -2.2; p.armRRotZ = -.8;
        p.legLRotX = .3 + S(t * 3) * .15;
        p.legRRotX = .3 + S(t * 3 + 2) * .15;
        p.headRotZ = S(t * 2) * .1;
        break;
      case 'ride': {
        const w = t * 6;
        p.hipsY = -.18 + Math.abs(S(w)) * .05;
        p.legLRotX = -1.2; p.legRRotX = -1.2;
        p.armLRotX = -1.6; p.armLRotZ = .9;
        p.armRRotX = -1.6; p.armRRotZ = -.9;
        p.torsoRotX = S(w) * .12;
        break;
      }
    }
    return p;
  }

  _footstep(w) {
    // fire step sound once per stride
    const phase = Math.floor(w / Math.PI);
    if (this._lastStep !== phase) {
      this._lastStep = phase;
      this.onStep?.();
    }
  }
  _chew(isUp) {
    this._chewAcc += .016;
    if (isUp && !this._chewedThisCycle) {
      this._chewedThisCycle = true;
      this.onChew?.();
    }
    if (!isUp) this._chewedThisCycle = false;
    void this._chewAcc;
  }

  update(dt) {
    this.t += dt * this.speed;
    const rig = this.rig;
    const p = this._pose();
    // exponential damping toward target pose → smooth auto transitions
    const k = Math.min(1, dt * 14);
    // helper to damp a numeric
    const damp = (obj, key, target) => { obj[key] += (target - obj[key]) * k; };

    damp(rig.hips.position, 'y', .5 + p.hipsY);
    damp(rig.root.rotation, 'x', p.rootRotX);
    damp(rig.root.rotation, 'z', p.rootRotZ + p.leanZ);
    damp(rig.torso.rotation, 'x', p.torsoRotX);
    damp(rig.torso.rotation, 'z', p.torsoRotZ);
    damp(rig.torso.scale, 'y', p.torsoScaleY);
    damp(rig.head.rotation, 'x', p.headRotX);
    damp(rig.head.rotation, 'y', p.headRotY);
    damp(rig.head.rotation, 'z', p.headRotZ);
    damp(rig.armL.rotation, 'x', p.armLRotX);
    damp(rig.armL.rotation, 'z', p.armLRotZ);
    damp(rig.armR.rotation, 'x', p.armRRotX);
    damp(rig.armR.rotation, 'z', p.armRRotZ);
    damp(rig.legL.rotation, 'x', p.legLRotX);
    damp(rig.legR.rotation, 'x', p.legRRotX);
  }
}
