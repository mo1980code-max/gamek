// baby.js — procedural 3D baby characters: body, expressive face, outfits.
// Original cartoon design built entirely from primitives (no external models).
import * as THREE from 'three';
import { grp, put, sph, capsule, torus, cone, box, cyl, emojiSprite, textSprite, shadowBlob, mat } from './kit.js';
import { BabyAnimator } from './babyAnimations.js';
import { BabyAI, Needs } from './babyAI.js';
import { babyJini } from '../characters/babyJini.js';
import { babyMimi } from '../characters/babyMimi.js';
import { babyToto } from '../characters/babyToto.js';
import { babyLulu } from '../characters/babyLulu.js';
import { babyCoco } from '../characters/babyCoco.js';
import { babyNono } from '../characters/babyNono.js';

export const BABIES = [babyJini, babyMimi, babyToto, babyLulu, babyCoco, babyNono];

/* ------------- face expression table ------------- */
const EXPRESSIONS = {
  neutral:  { eyes: 1, browA: 0, mouth: 'smile', cheeks: .25 },
  happy:    { eyes: .8, browA: -.15, mouth: 'bigSmile', cheeks: .8 },
  excited:  { eyes: 1.15, browA: -.3, mouth: 'bigSmile', cheeks: .9 },
  laughing: { eyes: .25, browA: -.3, mouth: 'bigSmile', cheeks: 1 },
  sad:      { eyes: .9, browA: .45, mouth: 'sad', cheeks: .1 },
  crying:   { eyes: .15, browA: .55, mouth: 'sad', cheeks: .4, tears: true },
  hungry:   { eyes: .9, browA: .3, mouth: 'o', cheeks: .2 },
  sleepy:   { eyes: .35, browA: .3, mouth: 'flat', cheeks: .3, sleepy: true },
  sleep:    { eyes: 0, browA: .2, mouth: 'flat', cheeks: .3 },
  surprised:{ eyes: 1.35, browA: -.35, mouth: 'o', cheeks: .4 },
  scared:   { eyes: 1.25, browA: .5, mouth: 'o', cheeks: .2 },
  sick:     { eyes: .7, browA: .4, mouth: 'flat', cheeks: .15, dizzy: true },
  annoyed:  { eyes: .8, browA: .5, mouth: 'flat', cheeks: .2 },
  angry:    { eyes: .75, browA: .65, mouth: 'flat', cheeks: .5 },
};

/* ------------- outfit hats / extras ------------- */
function buildHat(kind, color) {
  const g = new THREE.Group();
  const m = (c) => mat(c, { rough: .85 });
  switch (kind) {
    case 'cap': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(.34, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), m(color));
      dome.position.y = .3; g.add(dome);
      const brim = cyl(.3, .3, .04, color); brim.position.set(0, .3, .3); g.add(brim);
      const btn = sph(.05, 0xffffff); btn.position.y = .64; g.add(btn);
      break;
    }
    case 'beanie': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(.36, 18, 12, 0, Math.PI * 2, 0, Math.PI / 1.7), m(color));
      dome.position.y = .3; g.add(dome);
      const band = torus(.35, .05, 0xffffff); band.rotation.x = Math.PI / 2; band.position.y = .3; g.add(band);
      const pom = sph(.09, 0xffffff); pom.position.y = .66; g.add(pom);
      break;
    }
    case 'bow': {
      const c1 = box(.16, .12, .06, color); c1.rotation.z = .4; c1.position.set(-.12, .62, .18); g.add(c1);
      const c2 = box(.16, .12, .06, color); c2.rotation.z = -.4; c2.position.set(.12, .62, .18); g.add(c2);
      const k = sph(.05, color); k.position.set(0, .62, .19); g.add(k);
      break;
    }
    case 'crown': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = cone(.07, .22, 0xffd700);
        spike.position.set(Math.cos(a) * .3, .62, Math.sin(a) * .3);
        g.add(spike);
      }
      const band = cyl(.32, .32, .12, 0xffd700); band.position.y = .52; g.add(band);
      const gem = sph(.06, 0xe91e63, { mat: mat(0xe91e63, { emissive: 0xe91e63, emissiveIntensity: .6 }) });
      gem.position.set(0, .58, .32); g.add(gem);
      break;
    }
    case 'party': {
      const hat = cone(.22, .45, color); hat.position.y = .62; g.add(hat);
      const pom = sph(.07, 0xffffff); pom.position.y = .86; g.add(pom);
      break;
    }
    case 'bunny': {
      for (const sx of [-1, 1]) {
        const ear = capsule(.07, .35, color);
        ear.position.set(sx * .16, .78, 0); ear.rotation.z = sx * .15; g.add(ear);
        const inner = capsule(.035, .25, 0xffcdd2);
        inner.position.set(sx * .16, .78, .05); inner.rotation.z = sx * .15; g.add(inner);
      }
      break;
    }
    case 'cowboy': {
      const brim = cyl(.45, .45, .05, color); brim.position.y = .42; g.add(brim);
      const dome = cyl(.26, .3, .25, color); dome.position.y = .56; g.add(dome);
      const band = cyl(.31, .31, .07, 0x5d4037); band.position.y = .47; g.add(band);
      break;
    }
    case 'nightcap': {
      const hat = cone(.3, .55, color);
      hat.position.y = .58; hat.rotation.z = .35; g.add(hat);
      const pom = sph(.08, 0xffffff); pom.position.set(.18, .82, 0); g.add(pom);
      break;
    }
  }
  return g;
}

function buildGlasses(kind) {
  const g = new THREE.Group();
  const frame = kind === 'sun' ? mat(0x37474f, { rough: .4 }) : mat(0xff7043, { rough: .5 });
  for (const sx of [-1, 1]) {
    const ring = torus(.11, .022, kind === 'sun' ? 0x37474f : 0xff7043, { mat: frame });
    ring.position.set(sx * .17, .24, .40);
    g.add(ring);
    if (kind === 'sun') {
      const lens = new THREE.Mesh(new THREE.CircleGeometry(.1, 16), mat(0x263238, { rough: .2, metal: .3 }));
      lens.position.set(sx * .17, .24, .41);
      g.add(lens);
    }
  }
  const bridge = box(.1, .025, .025, 0x8d6e63); bridge.position.set(0, .26, .41); g.add(bridge);
  return g;
}

export class Baby extends THREE.Group {
  constructor(cfg, game) {
    super();
    this.cfg = cfg;
    this.game = game;
    this.isBaby = true;
    this.babyId = cfg.id;
    this.userData.keep = true;   // never disposed by room teardown

    // ---- saved state ----
    const sv = game?.save?.data;
    this.needs = new Needs(sv?.needs?.[cfg.id]);
    this.outfit = { top: cfg.outfit.top, bottom: cfg.outfit.bottom, dress: cfg.outfit.type === 'dress', hat: 'none', hatColor: 0xff7043, glasses: 'none', cape: null, ...(sv?.outfits?.[cfg.id] || {}) };

    this.ai = new BabyAI(cfg, this.needs);
    this.ai.onStateChange = (s) => this._onState(s);

    this.expression = 'neutral';
    this.expressionLock = null;   // set during activities (laugh/cry/eat…)
    this._blinkT = 2 + Math.random() * 3;
    this._bubbleT = 0;
    this._selected = false;

    this._buildBody();
    this.rig = {
      root: this, hips: this.hips, torso: this.torso, head: this.head,
      armL: this.armL, armR: this.armR, legL: this.legL, legR: this.legR,
    };
    this.animator = new BabyAnimator(this.rig);
    this.animator.onStep = () => game?.audio?.sfx('step');
    this.animator.onChew = () => game?.audio?.sfx('munch');

    this._buildFace();
    this.applyOutfit();
    this._applyExpression();

    // mood bubble + name + selection ring
    this.bubbleSprite = emojiSprite('😊', { size: .5, bg: '#ffffff' });
    this.bubbleSprite.position.set(0, 2.35, 0);
    this.bubbleSprite.visible = false;
    this.add(this.bubbleSprite);

    this.nameSprite = textSprite(cfg.nameAr, { color: '#5b2bd6', bg: 'rgba(255,255,255,.92)', fontPx: 56, height: .3 });
    this.nameSprite.position.set(0, 2.75, 0);
    this.nameSprite.visible = false;
    this.add(this.nameSprite);

    const ring = torus(.45, .045, 0xffd54f, { mat: mat(0xffd54f, { emissive: 0xffd54f, emissiveIntensity: .8 }) });
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .03;
    ring.visible = false;
    this.selectRing = ring;
    this.add(ring);

    const blob = shadowBlob(.42);
    this.blob = blob;
    this.add(blob);
  }

  /* ================= body ================= */
  _buildBody() {
    const skinM = mat(this.cfg.skin, { rough: .75 });
    this.skinMat = skinM;

    this.hips = grp(this, 0, .52, 0);

    // legs (pivot at hip)
    this.shoeMats = {};
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? -1 : 1;
      const pivot = grp(this.hips, sx * .15, -.06, 0);
      const leg = capsule(.085, .2, this.cfg.outfit.bottom);
      this.legMats = this.legMats || {};
      leg.material = new THREE.MeshStandardMaterial({ color: this.cfg.outfit.bottom, roughness: .9 });
      this.legMats[side] = leg.material;
      leg.position.y = -.19;
      pivot.add(leg);
      const foot = sph(.095, 0xffffff);
      foot.material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7 });
      foot.position.set(0, -.36, .04);
      pivot.add(foot);
      this.shoeMats[side] = foot.material;
      this[`leg${side}`] = pivot;
    }

    // torso
    this.torso = grp(this.hips, 0, .06, 0);
    const body = capsule(.3, .3, this.cfg.outfit.top);
    this.torsoMat = new THREE.MeshStandardMaterial({ color: this.cfg.outfit.top, roughness: .9 });
    body.material = this.torsoMat;
    body.position.y = .34;
    this.torso.add(body);
    this.torsoMesh = body;

    // diaper peeking below shirt — always adorable
    const diaper = sph(.26, 0xffffff);
    diaper.scale.set(1, .55, .9);
    diaper.position.y = .06;
    this.torso.add(diaper);

    // arms (pivot at shoulder)
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? -1 : 1;
      const pivot = grp(this.torso, sx * .32, .5, 0);
      const sleeve = capsule(.075, .1, this.cfg.outfit.top);
      sleeve.material = this.torsoMat;
      sleeve.position.y = -.06;
      pivot.add(sleeve);
      const arm = capsule(.065, .14, this.cfg.skin);
      arm.material = skinM;
      arm.position.y = -.22;
      pivot.add(arm);
      const hand = sph(.085, this.cfg.skin);
      hand.material = skinM;
      hand.position.y = -.33;
      pivot.add(hand);
      this[`arm${side}`] = pivot;
    }

    // dress skirt (toggled by outfit)
    this.skirt = cone(.42, .45, this.cfg.outfit.bottom);
    this.skirt.material = new THREE.MeshStandardMaterial({ color: this.cfg.outfit.bottom, roughness: .92 });
    this.skirt.position.y = .12;
    this.skirt.visible = this.outfit.dress;
    this.torso.add(this.skirt);
    this.skirtMat = this.skirt.material;

    // head (pivot at neck)
    this.head = grp(this.torso, 0, .78, 0);
    const skull = sph(.42, this.cfg.skin, { ws: 24, hs: 18 });
    skull.material = skinM;
    skull.scale.set(1, .96, .95);
    skull.position.y = .2;
    this.head.add(skull);
    this.skull = skull;

    // ears
    for (const sx of [-1, 1]) {
      const ear = sph(.09, this.cfg.skin);
      ear.material = skinM;
      ear.position.set(sx * .41, .18, 0);
      ear.scale.set(.5, 1, .8);
      this.head.add(ear);
    }
  }

  _buildFace() {
    const white = mat(0xffffff, { rough: .3 });
    const pupilM = mat(this.cfg.pupil, { rough: .3 });
    this.eyeParts = [];
    for (const sx of [-1, 1]) {
      const eg = grp(this.head, sx * .165, .26, .345);
      const white_ = sph(.105, 0xffffff, { shadow: false });
      white_.material = white;
      white_.scale.set(1, 1.15, .55);
      eg.add(white_);
      const pupil = sph(.055, this.cfg.pupil, { shadow: false });
      pupil.material = pupilM;
      pupil.position.set(0, -.01, .075);
      eg.add(pupil);
      const hl = sph(.02, 0xffffff, { shadow: false });
      hl.material = white;
      hl.position.set(.025, .03, .12);
      eg.add(hl);
      // closed-eyelid line
      const lid = box(.2, .03, .02, 0x5d4037, { shadow: false });
      lid.position.set(0, 0, .1);
      eg.add(lid);
      this.eyeParts.push({ group: eg, white: white_, pupil, lid });
      // brow
      const brow = box(.16, .035, .03, this.cfg.hair.color, { shadow: false });
      brow.position.set(sx * .17, .45, .38);
      this.head.add(brow);
      this.eyeParts[this.eyeParts.length - 1].brow = brow;
      // cheek
      const cheek = sph(.075, this.cfg.cheek, { shadow: false });
      cheek.material = mat(this.cfg.cheek, { rough: .9, transparent: true, opacity: .0 });
      cheek.position.set(sx * .3, .1, .3);
      cheek.scale.set(1, .7, .4);
      this.head.add(cheek);
      this.eyeParts[this.eyeParts.length - 1].cheek = cheek;
    }
    // mouth variants
    this.mouths = {};
    const mk = (name, mesh) => { mesh.visible = false; this.head.add(mesh); this.mouths[name] = mesh; };
    const smile = torus(.09, .022, 0xb71c1c, { arc: Math.PI, seg: 8, seg2: 12 });
    smile.rotation.z = Math.PI;
    smile.position.set(0, .12, .385);
    mk('smile', smile);
    const bigSmile = new THREE.Mesh(new THREE.SphereGeometry(.085, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x8e2430, { rough: .6 }));
    bigSmile.rotation.x = Math.PI / 2.4;
    bigSmile.position.set(0, .1, .38);
    mk('bigSmile', bigSmile);
    const sad = torus(.075, .02, 0xb71c1c, { arc: Math.PI, seg: 8, seg2: 12 });
    sad.rotation.z = 0;
    sad.position.set(0, .0, .385);
    mk('sad', sad);
    const o = torus(.05, .022, 0x8e2430, { seg: 8, seg2: 14 });
    o.position.set(0, .07, .39);
    mk('o', o);
    const flat = box(.12, .025, .02, 0xb71c1c, { shadow: false });
    flat.position.set(0, .07, .385);
    mk('flat', flat);
    // tongue for bigSmile
    const tongue = sph(.045, 0xf48fb1, { shadow: false });
    tongue.scale.set(1, .5, .6);
    tongue.position.set(0, .055, .40);
    tongue.visible = false;
    this.head.add(tongue);
    this.mouths.tongue = tongue;
  }

  /* ================= expression ================= */
  setExpression(name, lock = false) {
    if (!EXPRESSIONS[name]) name = 'neutral';
    this.expression = name;
    this.expressionLock = lock ? name : null;
    this._applyExpression();
  }
  _applyExpression() {
    const e = EXPRESSIONS[this.expression] || EXPRESSIONS.neutral;
    for (const p of this.eyeParts) {
      p.white.visible = e.eyes > .05;
      p.white.scale.y = 1.15 * e.eyes;
      p.pupil.visible = e.eyes > .25;
      p.lid.visible = e.eyes <= .25;
      p.brow.rotation.z = e.browA * (p.brow.position.x < 0 ? -1 : 1);
      p.brow.position.y = .45 - Math.abs(e.browA) * .06;
      p.cheek.material.opacity = e.cheeks * .75;
    }
    for (const k of ['smile', 'bigSmile', 'sad', 'o', 'flat']) this.mouths[k].visible = false;
    if (this.mouths[e.mouth]) this.mouths[e.mouth].visible = true;
    this.mouths.tongue.visible = e.mouth === 'bigSmile';
    this._tears = !!e.tears;
    this._dizzy = !!e.dizzy;
  }

  /* ================= outfit ================= */
  applyOutfit() {
    const o = this.outfit;
    this.torsoMat.color.setHex(o.top);
    if (!o.dress) {
      this.legMats.L.color.setHex(o.bottom);
      this.legMats.R.color.setHex(o.bottom);
    } else {
      this.legMats.L.color.setHex(this.cfg.skin);
      this.legMats.R.color.setHex(this.cfg.skin);
    }
    this.skirtMat.color.setHex(o.bottom);
    this.skirt.visible = !!o.dress;
    // cape
    if (this.cape) { this.cape.parent?.remove(this.cape); this.cape = null; }
    if (o.cape) {
      this.cape = box(.42, .55, .04, o.capeColor ?? 0xe53935);
      this.cape.position.set(0, .42, -.28);
      this.cape.rotation.x = .18;
      this.torso.add(this.cape);
    }
    // hat
    if (this.hat) { this.hat.parent?.remove(this.hat); this.hat = null; }
    if (o.hat && o.hat !== 'none') {
      this.hat = buildHat(o.hat, o.hatColor ?? 0xff7043);
      this.head.add(this.hat);
    }
    // glasses
    if (this.glassesMesh) { this.glassesMesh.parent?.remove(this.glassesMesh); this.glassesMesh = null; }
    if (o.glasses && o.glasses !== 'none') {
      this.glassesMesh = buildGlasses(o.glasses);
      this.head.add(this.glassesMesh);
    }
  }

  /* ================= selection & bubbles ================= */
  setSelected(v) {
    this._selected = v;
    this.selectRing.visible = v;
    this.nameSprite.visible = v;
  }
  showBubble(emoji, secs = 2.2) {
    if (!emoji) return;
    const map = emojiSprite(emoji, { size: 1, bg: '#ffffff' }).material.map;
    if (this.bubbleSprite.material.map !== map) {
      this.bubbleSprite.material.map = map;
      this.bubbleSprite.material.needsUpdate = true;
    }
    this.bubbleSprite.visible = true;
    this._bubbleT = secs;
  }
  _onState(state) {
    if (this.game?.bus) this.game.bus.emit('baby:state', { baby: this, state });
    const em = this.ai.bubbleEmoji();
    if (em) this.showBubble(em, 3);
    if (!this.expressionLock) {
      this.setExpression(this.ai.moodFace());
      // match animation to state transitions (unless room controls the anim)
      if (!this.animLock) {
        if (state === 'crying') this.animator.play('cry');
        else if (state === 'sleepy') this.animator.play('idle');
        else if (this.animator.name === 'cry') this.animator.play('idle');
      }
    }
  }
  playAnim(name, opts) { this.animator.play(name, opts); }

  /* ================= per-frame ================= */
  update(dt, time, active = true) {
    if (active) {
      this.ai.update(dt, (ev) => this.game?.audio?.sfx(ev));
      this.animator.update(dt, time);
    } else {
      // offscreen: needs decay slowly, no sounds or animation churn
      this.needs.tick(dt * .12, this.cfg.decay || {});
      return;
    }

    // blink
    if (this.expression !== 'sleep' && this.expression !== 'crying') {
      this._blinkT -= dt;
      if (this._blinkT <= 0) {
        this._blinkT = 2.2 + Math.random() * 3.2;
        this._blinkAnim = .22;
      }
    }
    if (this._blinkAnim > 0) {
      this._blinkAnim -= dt;
      const closed = this._blinkAnim > .11;
      for (const p of this.eyeParts) {
        p.white.visible = !closed && EXPRESSIONS[this.expression].eyes > .05;
        p.pupil.visible = !closed && EXPRESSIONS[this.expression].eyes > .25;
        p.lid.visible = closed;
      }
    }

    // tears while crying
    if (this._tears && this.game?.fx && Math.random() < dt * 6) {
      this.game.fx.tears({ x: this.position.x + (Math.random() - .5) * .3, y: this.position.y + 1.45, z: this.position.z + .35 });
    }
    // dizzy stars
    if (this._dizzy && this.game?.fx && Math.random() < dt * 2) {
      this.game.fx.sparkles({ x: this.position.x, y: this.position.y + 2.1, z: this.position.z }, 2);
    }

    // bubble timer
    if (this._bubbleT > 0) {
      this._bubbleT -= dt;
      this.bubbleSprite.position.y = 2.35 + Math.sin(time * 3) * .06;
      if (this._bubbleT <= 0) this.bubbleSprite.visible = false;
    }
    if (this._selected) this.selectRing.rotation.z += dt * 2;
    void time;
  }

  dispose() {
    this.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && !o.material._shared) o.material.dispose?.();
    });
  }
}

// lazy factory the game keeps per-baby instances in
export function createBabyRegistry(game) {
  const reg = new Map();
  return {
    get(id) {
      if (!reg.has(id)) {
        const cfg = BABIES.find(b => b.id === id) || BABIES[0];
        reg.set(id, new Baby(cfg, game));
      }
      return reg.get(id);
    },
    all() { return BABIES.map(b => this.get(b.id)); },
    configs: BABIES,
  };
}
