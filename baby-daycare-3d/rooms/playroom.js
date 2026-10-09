// rooms/playroom.js — Toy Playroom with REAL playable mini-games:
// block tower stacking, ball toss into the basket, shape sorter, train ride,
// rocking horse, robot dance — plus shop decorations (extra toy box).
import * as THREE from 'three';
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, cone, torus, block, teddy, toyBall, emojiSprite, textSprite, rug, ceilingLamp, shelfUnit, mat, windowPane } from '../js/kit.js';
import { tween, wait } from '../js/tween.js';

export class Playroom extends RoomBase {
  static def = {
    id: 'playroom', nameAr: 'غرفة الألعاب', nameEn: 'Toy Playroom', emoji: '🧸',
    color: '#3ddc84', color2: '#26c6da', music: 'play', sky: 'indoor',
    rewardCoins: 20, rewardStars: 2, stat: 'minigames',
  };

  build() {
    const g = this.group;
    this.shell({ w: 11, d: 11, h: 4.6, floor: 0xd9f6d9, wall: 0xeafbe7, wallLeft: 0xe7f6ff, wainscot: 0x90caf9 });

    for (const [x, ry] of [[-2.2, 0], [2.2, 0]]) {
      const w = windowPane(1.4, 1.3);
      w.position.set(x, 2.5, -5.44);
      g.add(w);
    }

    // ---------- toy shelves ----------
    const shelf = shelfUnit(2.2, 2.2, 0xffb74d, 3);
    shelf.position.set(4.7, 0, -1.4);
    shelf.rotation.y = -Math.PI / 2;
    g.add(shelf);
    put(shelf, teddy(0xb0713c), 0, 1.9, 0);
    put(shelf, toyBall(.16, 0x42a5f5), .6, 1.35, 0);
    put(shelf, block(.2, 0xef5350, 'A'), -.5, 1.3, 0);
    put(shelf, block(.2, 0xffca28, 'B'), -.2, 1.3, .1);
    this.addHit(shelf, { label: 'رف الألعاب', onClick: () => this.game.audio.sfx('belltoy') });

    // ---------- GAME 1: block tower ----------
    this.tower = grp(g, -3.2, 0, 1.8);
    put(this.tower, cyl(.9, 1, .1, 0xffe0b2), 0, .05, 0);
    this._towerBlocks = [];
    this._towerH = 0;
    const bcols = [0xef5350, 0xffca28, 0x42a5f5, 0x66bb6a, 0xab47bc];
    bcols.forEach((c, i) => {
      const b = block(.36, c, String(i + 1));
      b.position.set(-3.2 + (i - 2) * .85, .18, 3.6);
      b.rotation.y = Math.random();
      g.add(b);
      this._towerBlocks.push(b);
      this.addHit(b, {
        label: `مكعب ${i + 1} (اضغط للبناء)`,
        onClick: () => this._stackBlock(b),
      });
    });
    const towerSign = textSprite('ابنِ برجًا! 🏗️', { color: '#e65100', bg: 'rgba(255,255,255,.85)', fontPx: 44, height: .28 });
    towerSign.position.set(-3.2, 1.4, 1.8);
    g.add(towerSign);

    // ---------- GAME 2: ball toss ----------
    this.basket = grp(g, 3.4, 0, 1.8);
    put(this.basket, cyl(.55, .4, .7, 0xff9800), 0, .35, 0);
    put(this.basket, torus(.52, .05, 0xffcc80), 0, .7, 0).rotation.x = Math.PI / 2;
    this._balls = [];
    [0xff7043, 0x42a5f5, 0x66bb6a].forEach((c, i) => {
      const ball = toyBall(.22, c);
      ball.position.set(2 + i * .7, .22, 3.9);
      g.add(ball);
      this._balls.push({ mesh: ball, used: false });
      this.addHit(ball, {
        label: 'كرة (اضغط لتسديد)',
        onClick: () => this._throwBall(ball, i),
      });
    });
    const goalSign = textSprite('سدد في السلة! 🏀', { color: '#1b5e20', bg: 'rgba(255,255,255,.85)', fontPx: 44, height: .28 });
    goalSign.position.set(3.4, 1.4, 1.8);
    g.add(goalSign);

    // ---------- GAME 3: shape sorter ----------
    this.shapes = grp(g, 0, 0, -3.4);
    const sorterBox = box(1.4, 1.1, 1.1, 0x80d8ff);
    put(this.shapes, sorterBox, 0, .55, 0);
    // holes
    put(this.shapes, box(.44, .44, .05, 0x0277bd), -.35, .8, -.56);
    put(this.shapes, cyl(.26, .26, .05, 0x0277bd), .35, .8, -.56).rotation.x = Math.PI / 2;
    put(this.shapes, cone(.3, .05, 0x0277bd), 0, 1.13, 0);
    this._shapePieces = [];
    const defs = [
      { kind: 'box', art: '🔺', mk: () => box(.4, .4, .4, 0xffca28), hole: 'square' },
      { kind: 'ball', art: '🔵', mk: () => sph(.24, 0xff7043), hole: 'round' },
      { kind: 'cone', art: '🟡', mk: () => cone(.24, .45, 0x66bb6a), hole: 'triangle' },
    ];
    defs.forEach((d, i) => {
      const m = d.mk();
      m.position.set(-1.6 + i * .8, .3, -1.6);
      this.shapes.add(m);
      this._shapePieces.push({ mesh: m, def: d, done: false });
      this.addHit(m, {
        label: 'شكل (اضغط لإدخاله)',
        onClick: () => this._sortShape(this._shapePieces[i]),
      });
    });
    this.addHit(this.shapes, {
      label: 'صندوق الأشكال',
      onClick: () => this.hint('اضغط كل شكل ليذهب إلى مكانه في الصندوق!'),
    });

    // ---------- train on an oval track ----------
    const track = grp(g, 0, 0, 2.2);
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push([Math.sin(a) * 2.6, Math.cos(a) * 1.8]);
    }
    for (const [x, z] of pts) put(track, box(.34, .06, .14, 0x8d6e63), x, .03, z);
    this._trackPts = pts;
    this.train = grp(g, 0, 0, 2.2);
    put(this.train, box(.5, .3, .34, 0xe53935), 0, .22, 0);
    put(this.train, cyl(.12, .12, .5, 0x546e7a), 0, .48, 0).rotation.x = Math.PI / 2;
    put(this.train, cone(.1, .2, 0xffca28), .0, .68, 0);
    for (const sx of [-.18, .18]) for (const sz of [-.12, .12])
      put(this.train, cyl(.07, .07, .05, 0x212121), sx, .07, sz).rotation.z = Math.PI / 2;
    this._trainT = 0;
    this._trainOn = false;
    this.addHit(this.train, {
      label: 'القطار',
      onClick: () => {
        this._trainOn = !this._trainOn;
        this.game.audio.sfx('train');
        if (this._trainOn) this.game.rewards.toast('انطلق القطار! ووه ووه 🚂', '🚂');
      },
    });

    // ---------- rocking horse ----------
    this.horse = grp(g, -3.6, 0, -2.6);
    put(this.horse, box(.7, .4, .25, 0xfdd835), 0, .6, 0);
    const head = box(.3, .3, .22, 0xfdd835);
    head.position.set(.38, .85, 0); head.rotation.z = -.5;
    this.horse.add(head);
    put(this.horse, cyl(.05, .3, .05, 0x6d4c41), .55, .75, 0).rotation.z = 1.2;
    for (const sx of [-.3, .3]) {
      const rocker = torus(.7, .035, 0x8d6e63, { arc: Math.PI * .8 });
      rocker.rotation.y = Math.PI / 2;
      rocker.rotation.z = Math.PI + Math.PI * .1;
      rocker.position.set(sx, .35, 0);
      this.horse.add(rocker);
    }
    this._horseOn = false;
    this.addHit(this.horse, {
      label: 'حصان هزاز',
      onClick: () => {
        if (this._horseOn) return;
        this._horseOn = true;
        const b = this.game.activeBaby;
        b.position.set(-3.6, .95, -2.6);
        b.rotation.y = Math.PI / 2;
        b.animator.play('ride');
        b.animLock = 'playing';
        b.ai.setBusy('playing');
        this.game.audio.sfx('belltoy');
        this.hint('واااو! هز الحصان 🐴 (اضغط مرة أخرى للنزول)');
        this._horseRide = true;
      },
    });

    // ---------- robot ----------
    this.robot = grp(g, 4.2, 0, -3.6);
    put(this.robot, box(.5, .5, .4, 0x90a4ae), 0, .5, 0);
    put(this.robot, box(.36, .3, .3, 0xb0bec5), 0, .95, 0);
    put(this.robot, sph(.06, 0xff5252, { mat: mat(0xff5252, { emissive: 0xff5252, emissiveIntensity: 1.4 }) }), -.08, 1, .16);
    put(this.robot, sph(.06, 0xff5252, { mat: mat(0xff5252, { emissive: 0xff5252, emissiveIntensity: 1.4 }) }), .08, 1, .16);
    for (const sx of [-1, 1]) put(this.robot, box(.12, .4, .12, 0x78909c), sx * .34, .5, 0);
    this._robotDancing = false;
    this.addHit(this.robot, {
      label: 'الروبوت الراقص',
      onClick: () => {
        this._robotDancing = !this._robotDancing;
        this.game.audio.sfx('boing');
        if (this._robotDancing) {
          this.game.rewards.toast('الروبوت يرقص! 🤖💃', '🤖');
          if (!this.isStepDone('robot')) { this.step('robot'); }
        }
      },
    });

    // ---------- decor ----------
    put(g, rug(4, 3, 0xb2dfdb, { inner: 0xe0f2f1, dots: true }), 0, 0, .4);
    put(g, ceilingLamp(0x80cbc4), 0, 4.55, 0);
    this._decorRefs = {};
    this.refreshDecor();

    this._tossGoals = 0;
    this._sorted = 0;
    this._stacked = 0;

    this.setSteps([
      { id: 'tower', icon: '🏗️', label: 'ابنِ برجًا من 4 مكعبات' },
      { id: 'toss', icon: '🏀', label: 'أسدد كرتين في السلة' },
      { id: 'sort', icon: '🔷', label: 'رتّب 3 أشكال' },
      { id: 'robot', icon: '🤖', label: 'شغّل الروبوت الراقص' },
    ]);
  }

  enter() {
    this.addBaby(0, 4.4, Math.PI, 'idle');
    this.addNPCBaby('nono', -2.2, 4.6, 0, 'play');
    this.hint('ثلاث ألعاب حقيقية: البرج، السلة، والأشكال! 🎯');
    if (this._horseRide) this._dismountHorse();
  }

  exit() {
    if (this._horseRide) this._dismountHorse();
    super.exit();
  }

  refreshDecor() {
    const owned = this.game.save.data.owned;
    if (owned.toybox && !this._decorRefs.toybox) {
      const tb = grp(this.group, -4.6, 0, 4.2);
      put(tb, box(1, .6, .7, 0xff7043), 0, .3, 0);
      put(tb, box(1, .12, .7, 0xffab91), 0, .65, -.3).rotation.x = -.9;
      put(tb, toyBall(.14, 0xab47bc), -.3, .75, .1);
      put(tb, teddy(0xf48fb1), .25, .7, 0);
      this._decorRefs.toybox = tb;
      this.addHit(tb, { label: 'صندوق ألعاب', onClick: () => { this.game.audio.sfx('belltoy'); this.game.rewards.toast('ألعاب جديدة! 🧸', '🎁'); } });
    }
  }

  /* ---------- game 1: tower ---------- */
  _stackBlock(b) {
    if (this._towerH >= 4) return;
    const i = this._towerH;
    const jitter = i === 0 ? 0 : (Math.random() - .5) * .1;
    tween(b.position, { x: -3.2 + jitter, y: .1 + .37 * (i + 1), z: 1.8 }, {
      dur: .5,
      ease: t => 1 - Math.pow(1 - t, 3),
      onDone: () => {
        this.game.audio.sfx('pop');
        this.game.fx.sparkles({ x: b.position.x, y: b.position.y + .3, z: b.position.z }, 4);
        this._towerH++;
        if (this._towerH >= 4 && !this.isStepDone('tower')) {
          this.step('tower');
          this.game.fx.burstStars({ x: -3.2, y: 1.8, z: 1.8 }, 16);
          this.game.rewards.toast('برج رائع! 🏗️', '🏗️', 'green');
          this.hint('الآن اسدد الكرات في السلة 🏀');
        }
      },
    });
  }

  /* ---------- game 2: ball toss ---------- */
  _throwBall(mesh, idx) {
    const rec = this._balls[idx];
    if (rec.used) return;
    rec.used = true;
    const from = mesh.position.clone();
    const target = new THREE.Vector3(3.4 + (Math.random() - .5) * .5, .75, 1.8);
    const ctrl = from.clone().lerp(target, .5); ctrl.y = 2.6;
    const state = { t: 0 };
    const quad = (a, b, c, t) => new THREE.Vector3().copy(a).multiplyScalar((1 - t) * (1 - t))
      .add(b.clone().multiplyScalar(2 * t * (1 - t))).add(c.clone().multiplyScalar(t * t));
    tween(state, { t: 1 }, {
      dur: .8,
      onUpdate: () => { mesh.position.copy(quad(from, ctrl, target, state.t)); },
      onDone: () => {
        const hit = Math.random() < .62;
        if (hit) {
          this.game.audio.sfx('goal');
          this.game.fx.burstStars({ x: 3.4, y: 1, z: 1.8 }, 14, [0xffd54f, 0xff9800]);
          this._tossGoals++;
          mesh.position.set(3.4, .3, 1.8);
          mesh.scale.setScalar(.9);
          if (this._tossGoals >= 2 && !this.isStepDone('toss')) {
            this.step('toss');
            this.game.rewards.toast('تسديدتان رائعتان! 🏀', '🥇', 'green');
            this.hint('رتّب الأشكال في الصندوق 🔷');
          }
        } else {
          this.game.audio.sfx('drop');
          mesh.position.set(target.x, .22, 1.4);
          // ball becomes retryable
          setTimeout(() => { rec.used = false; mesh.scale.setScalar(1); }, 900);
        }
      },
    });
  }

  /* ---------- game 3: shape sorter ---------- */
  _sortShape(rec) {
    if (rec.done) return;
    rec.done = true;
    const holes = { square: [-.35, .8, -.56], round: [.35, .8, -.56], triangle: [0, 1.13, 0] };
    const h = holes[rec.def.hole];
    tween(rec.mesh.position, { x: h[0], y: h[1], z: h[2] }, {
      dur: .45,
      onDone: () => {
        this.game.audio.sfx('match');
        rec.mesh.visible = false;
        this._sorted++;
        this.game.fx.sparkles({ x: h[0], y: h[1], z: h[2] - .5 }, 6);
        if (this._sorted >= 3 && !this.isStepDone('sort')) {
          this.step('sort');
          this.game.rewards.toast('رتبت كل الأشكال! 🔷', '🧩', 'green');
        }
      },
    });
  }

  _dismountHorse() {
    this._horseRide = false;
    this._horseOn = false;
    const b = this.game.activeBaby;
    b.animLock = null;
    b.ai.setBusy(null);
    b.animator.play('idle');
    b.position.set(-2.8, 0, -1.8);
    b.rotation.set(0, 0, 0);
  }

  onAllStepsDone() {
    this.game.rewards.celebrate('أتقنت غرفة الألعاب! 🏆', '🧸');
    const b = this.game.activeBaby;
    b.animator.play('dance');
    setTimeout(() => b.animator.play('idle'), 3000);
  }

  update(dt, time) {
    // train motion
    if (this._trainOn) {
      this._trainT += dt * .12;
      const i = Math.floor(this._trainT) % this._trackPts.length;
      const j = (i + 1) % this._trackPts.length;
      const f = this._trainT % 1;
      const x = this._trackPts[i][0] * (1 - f) + this._trackPts[j][0] * f;
      const z = this._trackPts[i][1] * (1 - f) + this._trackPts[j][1] * f;
      this.train.position.set(x, .06, z + 2.2);
      this.train.rotation.y = Math.atan2(this._trackPts[j][0] - this._trackPts[i][0], this._trackPts[j][1] - this._trackPts[i][1]);
      if (Math.random() < dt * 2) this.game.fx.steam({ x: this.train.position.x, y: 1, z: this.train.position.z }, 1);
    }
    // rocking horse
    if (this._horseOn) {
      this.horse.rotation.z = Math.sin(time * 4) * .22;
      const b = this.game.activeBaby;
      if (b.animLock === 'playing' && b.parent === this.group) {
        b.rotation.z = Math.sin(time * 4) * .22;
        if (Math.random() < dt * .5) this.game.audio.sfx('giggle');
      }
      if (Math.random() < dt * 1.2) this.game.audio.sfx('swing');
    } else if (this.horse.rotation.z !== 0) {
      this.horse.rotation.z *= (1 - dt * 4);
    }
    // robot dance
    if (this._robotDancing) {
      this.robot.rotation.z = Math.sin(time * 8) * .18;
      this.robot.position.y = Math.abs(Math.sin(time * 8)) * .1;
      if (Math.random() < dt) this.game.audio.sfx('click');
    } else {
      this.robot.rotation.z = 0;
      this.robot.position.y = 0;
    }
  }
}
