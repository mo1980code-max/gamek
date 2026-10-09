// rooms/playground.js — Outdoor Playground: swing with pendulum physics,
// slide with a real path, trampoline, football kick into the goal, sandbox
// digging, bubble wand, butterflies, birds & clouds.
import * as THREE from 'three';
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, cone, torus, emojiSprite, textSprite, toyBall, mat } from '../js/kit.js';
import { tween, wait } from '../js/tween.js';

export class Playground extends RoomBase {
  static def = {
    id: 'playground', nameAr: 'الحديقة الخارجية', nameEn: 'Outdoor Playground', emoji: '🌳',
    color: '#3ddc84', color2: '#7cb342', music: 'garden', sky: 'outdoor',
    fog: '#cfefff', fogNear: 18, fogFar: 55,
    hemi: { sky: '#bfe3ff', ground: '#79c267', intensity: 1 },
    sun: { color: '#fff2cc', intensity: 1.5, pos: [8, 14, 6] },
    rewardCoins: 20, rewardStars: 2, stat: 'minigames',
  };

  build() {
    const g = this.group;
    // grass ground (big, outdoor — no shell)
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), mat(0x7cc47f, { rough: 1 }));
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    g.add(grass);
    // lawn stripes
    for (let i = -2; i <= 2; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(30, 2.2), mat(i % 2 ? 0x74ba77 : 0x7cc47f, { rough: 1 }));
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, .005 + Math.abs(i) * .001, i * 2.6);
      stripe.receiveShadow = true;
      g.add(stripe);
    }

    // fence around
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      if (Math.sin(a) > .92 || Math.cos(a) > .95) continue; // leave gaps
      put(g, cyl(.09, .11, 1.2, 0xa1887f), Math.sin(a) * 13, .6, Math.cos(a) * 13);
    }

    // trees & flowers
    this._trees = [];
    [[-8, -6], [8, -5], [-9, 3], [9, 4], [-5, -9], [6, -9]].forEach(([x, z]) => {
      const t = this._tree();
      t.position.set(x, 0, z);
      g.add(t);
      this._trees.push(t);
    });
    const flowerCols = [0xff6b6b, 0xffd54f, 0xba68c8, 0xff8fab, 4 * 16 + 0x4b];
    for (let i = 0; i < 26; i++) {
      const f = this._flower(flowerCols[i % 5]);
      f.position.set((Math.random() - .5) * 22, 0, (Math.random() - .5) * 22);
      if (Math.hypot(f.position.x, f.position.z) < 5) continue;
      g.add(f);
    }

    // clouds
    this._clouds = [];
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const puff = sph(1 + Math.random(), 0xffffff, { shadow: false, mat: mat(0xffffff, { rough: 1 }) });
        puff.position.set(j * 1.2 - 1.8, Math.random() * .4, Math.random() * .8);
        c.add(puff);
      }
      c.position.set((Math.random() - .5) * 30, 8 + Math.random() * 4, (Math.random() - .5) * 30);
      g.add(c);
      this._clouds.push(c);
    }

    // butterflies
    this._butterflies = [];
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Group();
      const col = [0xff8fab, 0xffd54f, 0xb39ddb, 0x80d8ff][i];
      for (const sx of [-1, 1]) {
        const wing = sph(.1, col, { shadow: false, mat: mat(col, { emissive: col, emissiveIntensity: .2 }) });
        wing.scale.set(1.4, .4, .8);
        wing.position.x = sx * .09;
        b.add(wing);
      }
      g.add(b);
      this._butterflies.push({ mesh: b, a: Math.random() * 10, r: 3 + Math.random() * 4, h: 1.4 + Math.random() });
    }

    // ---------- swing with pendulum physics ----------
    const swing = grp(g, -3.6, 0, -2.2);
    put(swing, cyl(.09, .09, 2.6, 0xef5350), -1, 1.3, 0);
    put(swing, cyl(.09, .09, 2.6, 0xef5350), 1, 1.3, 0);
    put(swing, cyl(.09, .09, 2.2, 0xef5350), 0, 2.5, 0).rotation.z = Math.PI / 2;
    this.swingSeat = new THREE.Group();
    put(this.swingSeat, box(.8, .08, .35, 0xffca28), 0, 0, 0);
    put(this.swingSeat, cyl(.015, .015, 1.5, 0x90a4ae), -.35, .75, 0);
    put(this.swingSeat, cyl(.015, .015, 1.5, 0x90a4ae), .35, .75, 0);
    this.swingSeat.position.set(0, 1.5, 0);
    swing.add(this.swingSeat);
    this._swingAngle = 0;
    this._swingVel = 0;
    this._swingBaby = false;
    this.addHit(swing, {
      label: 'الأرجوحة (اضغط للدفع)',
      onClick: () => {
        if (!this._swingBaby) return this._mountSwing();
        this._swingVel += .9;
        this.game.audio.sfx('swing');
        this.game.fx.sparkles({ x: -3.6, y: 1.6, z: -2.2 }, 4);
        if (!this.isStepDone('swing')) this.step('swing');
      },
    });

    // ---------- slide ----------
    const slide = grp(g, 3.4, 0, -2.6);
    // ladder
    for (let i = 0; i < 4; i++) put(slide, cyl(.05, .05, .9, 0xff9800), -.55, .25 + i * .5, .55);
    put(slide, cyl(.07, .07, 1.1, 0xff9800), -.55, 2.1, .55);
    put(slide, cyl(.07, .07, 1.1, 0xff9800), .55, 2.1, .55);
    // slide surface: curved ramp
    const rampPts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      rampPts.push(new THREE.Vector3(0, 2.05 - t * t * 1.75, .55 + t * 2.6));
    }
    const rampCurve = new THREE.CatmullRomCurve3(rampPts);
    const ramp = new THREE.Mesh(new THREE.TubeGeometry(rampCurve, 16, .38, 10), mat(0x4fc3f7, { rough: .4 }));
    ramp.scale.z = .45;
    slide.add(ramp);
    this._rampCurve = rampCurve;
    this._slideGroup = slide;
    this.addHit(ramp, {
      label: 'الزحليقة (اضغط للانزلاق)',
      onClick: () => this._rideSlide(),
    });

    // ---------- trampoline ----------
    const tram = grp(g, 0, 0, 2.8);
    put(tram, cyl(1, 1.05, .35, 0x37474f), 0, .2, 0);
    const mat0 = new THREE.Mesh(new THREE.CircleGeometry(.95, 24), mat(0x263238, { rough: .9 }));
    mat0.rotation.x = -Math.PI / 2;
    mat0.position.y = .4;
    tram.add(mat0);
    this._trampMat = mat0;
    this.addHit(tram, {
      label: 'الترامبولين (اقفز!)',
      onClick: () => this._bounce(),
    });

    // ---------- football + goal ----------
    const goal = grp(g, -4.4, 0, 3.2);
    put(goal, cyl(.06, .06, 1.6, 0xffffff), -.8, .8, 0);
    put(goal, cyl(.06, .06, 1.6, 0xffffff), .8, .8, 0);
    put(goal, cyl(.06, .06, 1.7, 0xffffff), 0, 1.55, 0).rotation.z = Math.PI / 2;
    const net = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), mat(0xffffff, { transparent: true, opacity: .35 }));
    net.position.set(0, .8, -.3);
    goal.add(net);
    this._goalPos = new THREE.Vector3(-4.4, .8, 2.95);
    this.football = toyBall(.3, 0xffffff);
    this.football.position.set(-1.4, .3, 3.6);
    g.add(this.football);
    this._ballVel = new THREE.Vector3();
    this.addHit(this.football, {
      label: 'كرة القدم (اضغط للركل)',
      onClick: () => this._kick(),
    });
    this.addHit(goal.children[3], {
      label: 'المرمى',
      onClick: () => this._kick(),
    });

    // ---------- sandbox ----------
    const sand = grp(g, 4.4, 0, 2.8);
    put(sand, box(2.4, .25, 2.4, 0x8d6e63), 0, .12, 0);
    put(sand, box(2.1, .22, 2.1, 0xffe0b2), 0, .14, 0);
    this._digSpots = [];
    for (let i = 0; i < 3; i++) {
      const star = grp(sand, -.7 + i * .7, .28, (i - 1) * .5);
      const s = emojiSprite('⭐', { size: .35 });
      s.visible = false;
      star.add(s);
      const mound = sph(.2, 0xffd180, { shadow: false });
      star.add(mound);
      this._digSpots.push({ group: star, star: s, mound, found: false });
      this.addHit(star, {
        label: 'حفر في الرمل',
        onClick: () => this._dig(star.userData.idx),
      });
      star.userData.idx = i;
    }
    this.addHit(sand, { label: 'صندوق الرمل', onClick: () => this.hint('اضغط على التلال الرملية للبحث عن نجوم! ⭐') });

    // ---------- bubble wand ----------
    const wand = grp(g, -1.6, 0, 4.4);
    put(wand, cyl(.025, .025, .6, 0xba68c8), 0, .3, 0);
    put(wand, torus(.12, .02, 0xf48fb1), 0, .65, 0);
    put(wand, emojiSprite('🫧', { size: .3 }), 0, .95, 0);
    this.addHit(wand, {
      label: 'عصا الفقاعات',
      onClick: () => {
        this.game.audio.sfx('bubble');
        for (let i = 0; i < 12; i++)
          this.game.fx.bubbles({ x: -1.6 + (Math.random() - .5) * .8, y: .8, z: 4.4 + (Math.random() - .5) * .8 }, 2, .6);
        this.game.activeBaby.ai.apply({ happiness: 4 });
      },
    });

    // picnic table + caretaker seat
    const bench = grp(g, 6.5, 0, 4.4);
    put(bench, box(1.8, .08, .9, 0xa1887f), 0, .55, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      put(bench, cyl(.05, .05, .55, 0x8d6e63), sx * .75, .28, sz * .35);

    const sign = textSprite('حديقة اللعب ☀️', { color: '#2e7d32', bg: 'rgba(255,255,255,.85)', fontPx: 52, height: .38 });
    sign.position.set(0, 3.2, -7);
    g.add(sign);

    this._bounces = 0;
    this._goals = 0;
    this._slideRiding = false;

    this.setSteps([
      { id: 'swing', icon: '🌬️', label: 'أرجح الطفل على الأرجوحة' },
      { id: 'slide', icon: '🛝', label: 'انزلق من الزحليقة' },
      { id: 'dig', icon: '⭐', label: 'ابحث عن 3 نجوم في الرمل' },
      { id: 'goal', icon: '⚽', label: 'سدد هدفًا' },
    ]);
  }

  enter() {
    this.addBaby(-1.2, 1.2, -.6, 'idle');
    this.addNPCBaby('nono', 1.8, 3.6, 2.4, 'play');
    this.hint('أرجوحة وزحليقة وكرة ونجوم مدفونة! 🌳');
    this.game.audio.startLoop('birds');
  }

  exit() {
    this.game.audio.stopLoop('birds');
    super.exit();
  }

  _tree() {
    const t = new THREE.Group();
    put(t, cyl(.22, .3, 1.6, 0x8d6e63), 0, .8, 0);
    const crown = new THREE.Group();
    put(crown, sph(.9, 0x66bb6a, { flat: true }), 0, 2, 0);
    put(crown, sph(.7, 0x81c784, { flat: true }), .7, 1.7, .3);
    put(crown, sph(.65, 0x4caf50, { flat: true }), -.6, 1.75, -.2);
    put(crown, sph(.5, 0x66bb6a, { flat: true }), .1, 2.5, .2);
    t.add(crown);
    // red apples
    for (let i = 0; i < 3; i++) {
      const apple = sph(.09, 0xe53935, { shadow: false });
      apple.position.set(Math.sin(i * 2.4) * .7, 1.9 + Math.cos(i * 1.7) * .5, Math.sin(i * 3.1) * .6);
      t.add(apple);
    }
    return t;
  }

  _flower(color) {
    const f = new THREE.Group();
    put(f, cyl(.02, .02, .4, 0x81c784), 0, .2, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const p = sph(.06, color, { shadow: false });
      p.position.set(Math.cos(a) * .07, .42, Math.sin(a) * .07);
      f.add(p);
    }
    put(f, sph(.045, 0xffd54f, { shadow: false }), 0, .44, 0);
    return f;
  }

  /* ---------- swing ---------- */
  _mountSwing() {
    const b = this.game.activeBaby;
    this._swingBaby = true;
    b.animLock = 'playing';
    b.ai.setBusy('playing');
    b.animator.play('sit');
    this.game.audio.sfx('pop');
    this.hint('اضغط الأرجوحة مرة أخرى للدفع! 🌬️');
  }
  _dismountSwing() {
    const b = this.game.activeBaby;
    this._swingBaby = false;
    b.animLock = null;
    b.ai.setBusy(null);
    b.animator.play('idle');
    b.position.set(-2.6, 0, -1);
    b.rotation.set(0, 0, 0);
    b.ai.apply({ happiness: 8, energy: -3 });
  }

  /* ---------- slide ---------- */
  _rideSlide() {
    if (this._slideRiding) return;
    const b = this.game.activeBaby;
    this._slideRiding = true;
    b.animLock = 'playing';
    b.ai.setBusy('playing');
    const start = new THREE.Vector3(3.4, 0, -3.6);
    b.position.copy(start);
    b.animator.play('walk');
    this.game.audio.sfx('step');
    const top = new THREE.Vector3(3.4 + .55 * 0, 2.15, -2.05 + .55);
    // climb: walk to ladder then up
    tween(b.position, { x: 3.4 - .55, z: -2.05 }, {
      dur: .6,
      onDone: () => {
        tween(b.position, { y: top.y, z: top.z, x: 3.4 }, {
          dur: .8,
          onDone: () => {
            b.animator.play('sit');
            this.game.audio.sfx('slide');
            // slide down the real curve
            const state = { t: 0 };
            tween(state, { t: 1 }, {
              dur: 1.1,
              onUpdate: () => {
                const p = this._rampCurve.getPoint(state.t);
                b.position.set(3.4 + p.x, p.y + .35, -2.6 + p.z * .45);
                b.rotation.x = -state.t * .8;
              },
              onDone: () => {
                b.rotation.x = 0;
                b.position.set(3.4, 0, .6);
                b.animator.play('laugh', { loop: false, onDone: () => b.animator.play('idle') });
                this.game.audio.sfx('giggle');
                this.game.fx.hearts({ x: 3.4, y: 1.4, z: .6 }, 6);
                b.animLock = null;
                b.ai.setBusy(null);
                this._slideRiding = false;
                b.ai.apply({ happiness: 10 });
                this.step('slide');
              },
            });
          },
        });
      },
    });
  }

  /* ---------- trampoline ---------- */
  _bounce() {
    const b = this.game.activeBaby;
    this._bounces++;
    b.animLock = 'playing';
    const startY = b.position.y;
    const state = { t: 0 };
    b.animator.play('jump');
    this.game.audio.sfx('boing');
    tween(state, { t: 1 }, {
      dur: .8,
      onUpdate: () => {
        b.position.y = Math.sin(state.t * Math.PI) * 1.6;
        b.rotation.z = Math.sin(state.t * Math.PI * 2) * .2;
      },
      onDone: () => {
        b.position.y = 0;
        b.rotation.z = 0;
        b.animLock = null;
        b.animator.play('idle');
        if (this._bounces >= 3 && !this.isStepDone('bounce')) {
          this.step('bounce');
          this.game.fx.burstStars({ x: 0, y: 1.6, z: 2.8 }, 12);
        }
      },
    });
    b.ai.apply({ happiness: 4, energy: -1.5 });
  }

  /* ---------- football ---------- */
  _kick() {
    const ball = this.football;
    if (this._ballMoving) return;
    this._ballMoving = true;
    const dir = new THREE.Vector3(-4.4 - ball.position.x, 0, 3.2 - ball.position.z).normalize();
    const spread = (Math.random() - .5) * .5;
    this._ballVel.set(dir.x + spread, 3.2, dir.z + spread * .3);
    this.game.audio.sfx('boing');
    const b = this.game.activeBaby;
    b.animator.play('play');
    setTimeout(() => b.animator.play('idle'), 800);
  }

  _dig(i) {
    const spot = this._digSpots[i];
    if (!spot || spot.found) { this.game.audio.sfx('drop'); return; }
    spot.found = true;
    spot.mound.visible = false;
    spot.star.visible = true;
    this.game.audio.sfx('star');
    this.game.fx.burstStars({ x: spot.group.getWorldPosition(new THREE.Vector3()).x, y: .8, z: spot.group.getWorldPosition(new THREE.Vector3()).z }, 8);
    const b = this.game.activeBaby;
    b.ai.apply({ happiness: 3 });
    const found = this._digSpots.filter(s => s.found).length;
    if (found >= 3 && !this.isStepDone('dig')) {
      this.step('dig');
      this.game.rewards.toast('وجدت 3 نجوم مدفونة! ⭐⭐⭐', '🌟', 'gold');
      this.hint('الآن اركل الكرة نحو المرمى! ⚽');
    }
  }

  onAllStepsDone() {
    this.game.rewards.celebrate('يوم رائع في الحديقة! 🌳⚽', '🎉');
  }

  update(dt, time) {
    // swing pendulum physics
    if (this._swingBaby) {
      // gravity-driven pendulum, pushes add velocity
      this._swingVel += -Math.sin(this._swingAngle) * 6 * dt;
      this._swingVel *= (1 - dt * .35);
      this._swingAngle += this._swingVel * dt;
      const swingPivot = new THREE.Vector3(-3.6, 2.5, -2.2);
      this.swingSeat.position.y = swingPivot.y - Math.cos(this._swingAngle) * 1.5 - 1.0;
      void swingPivot;
      this.swingSeat.position.set(-3.6 + Math.sin(this._swingAngle) * 1.5, 2.5 - Math.cos(this._swingAngle) * 1.5, -2.2);
      this.swingSeat.rotation.z = this._swingAngle;
      const b = this.game.activeBaby;
      b.position.set(this.swingSeat.position.x, this.swingSeat.position.y + .1, this.swingSeat.position.z);
      b.rotation.z = this._swingAngle * .5;
      if (Math.abs(this._swingVel) < .01 && Math.abs(this._swingAngle) < .02) this._dismountSwing();
    }
    // football physics
    const ball = this.football;
    if (this._ballVel.lengthSq() > .01) {
      ball.position.addScaledVector(this._ballVel, dt);
      this._ballVel.y -= 9.8 * dt;
      if (ball.position.y < .3) {
        ball.position.y = .3;
        this._ballVel.y *= -.4;
        this._ballVel.x *= .8; this._ballVel.z *= .8;
        if (Math.abs(this._ballVel.y) < .4) this._ballVel.set(0, 0, 0);
      }
      ball.rotation.x -= this._ballVel.z * dt * 3;
      // goal check
      if (ball.position.z < 3.05 && Math.abs(ball.position.x + 4.4) < .85 && ball.position.y < 1.5) {
        this._goals++;
        this.game.audio.sfx('goal');
        this.game.fx.confetti(new THREE.Vector3(-4.4, 1.5, 3), 20);
        this.game.rewards.toast('جووول! ⚽🥅', '⚽', 'gold');
        this._ballVel.set(0, 0, 0);
        if (this._goals >= 1 && !this.isStepDone('goal')) {
          this.step('goal');
          this.game.activeBaby.ai.apply({ happiness: 10 });
        }
        setTimeout(() => { ball.position.set(-1.4, .3, 3.6); this._ballMoving = false; }, 800);
      } else if (ball.position.length() > 20) {
        ball.position.set(-1.4, .3, 3.6);
        this._ballVel.set(0, 0, 0);
        this._ballMoving = false;
      }
      if (this._ballVel.lengthSq() < .01 && ball.position.y <= .31) this._ballMoving = false;
    }
    // clouds drift
    this._clouds.forEach((c, i) => {
      c.position.x += dt * (.25 + i * .06);
      if (c.position.x > 20) c.position.x = -20;
    });
    // butterflies
    this._butterflies.forEach(b => {
      b.a += dt * .6;
      b.mesh.position.set(Math.cos(b.a) * b.r, b.h + Math.sin(b.a * 3) * .25, Math.sin(b.a * 1.3) * b.r);
      b.mesh.rotation.y = -b.a;
      b.mesh.children.forEach((w, wi) => { w.rotation.y = wi === 0 ? -Math.sin(time * 20) * .6 : Math.sin(time * 20) * .6; });
    });
    // trees sway
    this._trees.forEach((t, i) => { t.rotation.z = Math.sin(time * .8 + i) * .02; });
    // trampoline membrane
    this._trampMat.scale.setScalar(1 + Math.sin(time * 6) * .012);
  }
}
