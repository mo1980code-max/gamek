// particles.js — pooled, additive point-sprite particle effects.
// One emitter = one THREE.Points with a fixed-size buffer (object pooling).
import * as THREE from 'three';
import { makeCanvasTexture } from './kit.js';

const TEX = {};
function particleTexture(kind) {
  if (TEX[kind]) return TEX[kind];
  const draw = {
    circle: (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(.55, 'rgba(255,255,255,.85)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    },
    star: (c, w, h) => {
      c.translate(w / 2, h / 2);
      c.fillStyle = '#fff';
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? w * .48 : w * .18;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        i === 0 ? c.moveTo(Math.cos(a) * r, Math.sin(a) * r) : c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath(); c.fill();
    },
    bubble: (c, w, h) => {
      c.strokeStyle = '#fff'; c.lineWidth = w * .1;
      c.beginPath(); c.arc(w / 2, h / 2, w * .36, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(w * .38, h * .38, w * .1, 0, Math.PI * 2);
      c.fillStyle = 'rgba(255,255,255,.9)'; c.fill();
    },
    heart: (c, w, h) => {
      c.fillStyle = '#fff';
      c.beginPath();
      const x = w / 2, y = h * .32, s = w * .5;
      c.moveTo(x, y + s * .55);
      c.bezierCurveTo(x - s, y - s * .15, x - s * .5, y - s * .75, x, y - s * .25);
      c.bezierCurveTo(x + s * .5, y - s * .75, x + s, y - s * .15, x, y + s * .55);
      c.fill();
    },
    drop: (c, w, h) => {
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(w / 2, h / 2, w * .3, 0, Math.PI * 2); c.fill();
      c.beginPath();
      c.moveTo(w / 2, h * .04);
      c.quadraticCurveTo(w * .82, h * .5, w / 2, h * .5);
      c.quadraticCurveTo(w * .18, h * .5, w / 2, h * .04);
      c.fill();
    },
    zzz: (c, w, h) => {
      c.fillStyle = '#fff';
      c.font = `900 ${w * .8}px sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('Z', w / 2, h / 2 + w * .05);
    },
    confetti: (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(w * .2, h * .2, w * .6, h * .6); },
  }[kind] || (() => {});
  const tex = makeCanvasTexture(64, 64, draw);
  TEX[kind] = tex;
  return tex;
}

const PRESETS = {
  stars:     { tex: 'star', gravity: -0.4, drag: .96, additive: true },
  sparkles:  { tex: 'circle', gravity: 0.4, drag: .95, additive: true },
  bubbles:   { tex: 'bubble', gravity: 0.55, drag: .985, additive: true, wobble: true },
  hearts:    { tex: 'heart', gravity: 0.8, drag: .97, additive: true },
  zzz:       { tex: 'zzz', gravity: 0.5, drag: .99, additive: false },
  splash:    { tex: 'drop', gravity: -5.5, drag: .99, additive: false },
  tears:     { tex: 'drop', gravity: -3.2, drag: .995, additive: false },
  confetti:  { tex: 'confetti', gravity: -1.6, drag: .99, additive: false },
  steam:     { tex: 'circle', gravity: 0.9, drag: .96, additive: false, grow: 1.6 },
  smoke:     { tex: 'circle', gravity: 0.8, drag: .95, additive: false, grow: 1.8 },
};

export class Emitter {
  // scene: THREE.Object3D to attach into. kind: preset name. max: pool size.
  constructor(scene, kind = 'stars', o = {}) {
    const p = { ...PRESETS[kind], ...o };
    this.preset = p;
    this.max = o.max ?? 160;
    this.pos = new Float32Array(this.max * 3);
    this.col = new Float32Array(this.max * 3);      // final color (base * fade)
    this.base = new Float32Array(this.max * 3);     // per-particle base color
    this.vel = new Float32Array(this.max * 3);
    this.life = new Float32Array(this.max);         // remaining seconds
    this.life0 = new Float32Array(this.max);
    this.phase = new Float32Array(this.max);
    this.head = 0;
    this.scale = o.scale ?? 1;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mat = new THREE.PointsMaterial({
      size: (o.size ?? .16) * this.scale,
      map: particleTexture(p.tex),
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: p.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this._c = new THREE.Color();
  }

  spawn(o = {}) {
    const count = o.count ?? 8;
    const p = o.pos || { x: 0, y: 1, z: 0 };
    const jit = o.jitter ?? .15;
    const spd = o.speed ?? 1;
    const vel = o.vel || { x: 0, y: 1, z: 0 };
    const vj = o.velJitter ?? .4;
    const life = o.life ?? 1.2;
    const size = (o.size ?? .16) * this.scale;
    const colors = o.colors || [0xffffff];
    for (let n = 0; n < count; n++) {
      const i = this.head;
      this.head = (this.head + 1) % this.max;
      this.pos[i * 3] = p.x + (Math.random() - .5) * jit;
      this.pos[i * 3 + 1] = p.y + (Math.random() - .5) * jit;
      this.pos[i * 3 + 2] = p.z + (Math.random() - .5) * jit;
      this.vel[i * 3] = (vel.x + (Math.random() - .5) * vj) * spd;
      this.vel[i * 3 + 1] = (vel.y + (Math.random() - .5) * vj) * spd;
      this.vel[i * 3 + 2] = (vel.z + (Math.random() - .5) * vj) * spd;
      this.life[i] = this.life0[i] = life * (0.7 + Math.random() * .6);
      this._c.set(colors[(Math.random() * colors.length) | 0]);
      this.base[i * 3] = this._c.r; this.base[i * 3 + 1] = this._c.g; this.base[i * 3 + 2] = this._c.b;
      this.phase[i] = Math.random() * Math.PI * 2;
    }
  }

  update(dt, time) {
    const p = this.preset;
    const drag = p.drag ?? .97;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0; continue; }
      this.life[i] -= dt;
      const damp = Math.pow(drag, dt * 60);
      this.vel[i * 3] *= damp;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * damp + (p.gravity ?? 0) * dt;
      this.vel[i * 3 + 2] *= damp;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (p.wobble) this.pos[i * 3] += Math.sin(time * 3 + this.phase[i]) * dt * .35;
      const f = Math.max(0, this.life[i] / this.life0[i]);
      const fade = p.additive ? f : Math.min(1, f * 1.6);
      this.col[i * 3] = this.base[i * 3] * fade;
      this.col[i * 3 + 1] = this.base[i * 3 + 1] * fade;
      this.col[i * 3 + 2] = this.base[i * 3 + 2] * fade;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
  clear() { this.life.fill(0); this.col.fill(0); }
  dispose() {
    this.points.geometry.dispose();
    this.mat.dispose();
    this.points.parent?.remove(this.points);
  }
}
export class ParticleFX {
  constructor(scene) {
    this.scene = scene;
    this.emitters = new Map();
    this.time = 0;
  }
  get(kind, o = {}) {
    if (!this.emitters.has(kind)) {
      const holder = new THREE.Group();
      this.scene.add(holder);
      this.emitters.set(kind, new Emitter(holder, kind, o));
    }
    return this.emitters.get(kind);
  }
  // ---- convenience one-shot helpers ----
  burstStars(pos, n = 14, colors = [0xffd54f, 0xff8fab, 0x80d8ff, 0xb9f6ca]) {
    this.get('stars').spawn({ pos, count: n, vel: { x: 0, y: 2.4, z: 0 }, velJitter: 2.2, speed: 1, life: .9, size: .2, colors, jitter: .3 });
  }
  hearts(pos, n = 6) {
    this.get('hearts').spawn({ pos, count: n, vel: { x: 0, y: .9, z: 0 }, velJitter: .5, life: 1.4, size: .2, colors: [0xff6fb5, 0xff9fce], jitter: .3 });
  }
  zzz(pos) {
    this.get('zzz').spawn({ pos, count: 1, vel: { x: .18, y: .55, z: 0 }, velJitter: .12, life: 2.2, size: .22, colors: [0xffffff], jitter: .05 });
  }
  bubbles(pos, n = 10, area = .8) {
    this.get('bubbles').spawn({ pos, count: n, jitter: area, vel: { x: 0, y: .7, z: 0 }, velJitter: .35, life: 2.4, size: .13, colors: [0xb3e5fc, 0xe1f5fe, 0xffffff] });
  }
  splash(pos, n = 16) {
    this.get('splash').spawn({ pos, count: n, vel: { x: 0, y: 3, z: 0 }, velJitter: 2.4, life: .8, size: .12, colors: [0x81d4fa, 0xe1f5fe], jitter: .15 });
  }
  tears(pos) {
    this.get('tears').spawn({ pos, count: 2, jitter: .22, vel: { x: 0, y: -.4, z: .1 }, velJitter: .3, life: .8, size: .09, colors: [0x81d4fa] });
  }
  confetti(pos, n = 26) {
    this.get('confetti').spawn({ pos, count: n, jitter: 1.2, vel: { x: 0, y: 3.6, z: 0 }, velJitter: 2, life: 2.2, size: .16, colors: [0xff6b6b, 0xffd54f, 0x42a5f5, 0x66bb6a, 0xba68c8] });
  }
  sparkles(pos, n = 10) {
    this.get('sparkles').spawn({ pos, count: n, jitter: .5, vel: { x: 0, y: .6, z: 0 }, velJitter: .8, life: 1, size: .12, colors: [0xfff176, 0xffffff, 0xff8a80] });
  }
  steam(pos, n = 5) {
    this.get('steam').spawn({ pos, count: n, jitter: .25, vel: { x: 0, y: .8, z: 0 }, velJitter: .2, life: 1.6, size: .2, colors: [0xeceff1, 0xcfd8dc] });
  }
  update(dt) {
    this.time += dt;
    for (const e of this.emitters.values()) e.update(dt, this.time);
  }
  dispose() {
    for (const e of this.emitters.values()) e.dispose();
    this.emitters.clear();
  }
}
