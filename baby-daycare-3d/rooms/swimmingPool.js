// rooms/swimmingPool.js — Baby Swimming Pool: animated 3D water, floats,
// collect floating toys, splash play, boat race vs a friend, supervisor NPC.
import * as THREE from 'three';
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, torus, cone, capsule, emojiSprite, textSprite, mat } from '../js/kit.js';
import { tween } from '../js/tween.js';

export class SwimmingPool extends RoomBase {
  static def = {
    id: 'swimmingPool', nameAr: 'المسبح', nameEn: 'Baby Swimming Pool', emoji: '🏊',
    color: '#26c6da', color2: '#4dd0e1', music: 'bath', sky: 'pool',
    fog: '#c9f2ff', fogNear: 16, fogFar: 45,
    hemi: { sky: '#cdf1ff', ground: '#7fd4d4', intensity: 1.05 },
    rewardCoins: 20, rewardStars: 2, stat: 'minigames',
  };

  build() {
    const g = this.group;
    // deck
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), mat(0xffe8c8, { rough: 1 }));
    deck.rotation.x = -Math.PI / 2;
    deck.receiveShadow = true;
    g.add(deck);

    // ---------- pool basin ----------
    const basin = grp(g, 0, 0, 0);
    put(basin, box(9, .5, .5, 0x4dd0e1), 0, .25, -3.3);
    put(basin, box(9, .5, .5, 0x4dd0e1), 0, .25, 3.3);
    put(basin, box(.5, .5, 6.1, 0x4dd0e1), -4.25, .25, 0);
    put(basin, box(.5, .5, 6.1, 0x4dd0e1), 4.25, .25, 0);
    put(basin, box(8.4, .1, 5.6, 0x0288d1), 0, .05, 0);  // bottom
    // animated water
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(8.2, 5.6, 26, 18),
      new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: .78, roughness: .1 })
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = .42;
    basin.add(this.water);

    // floats
    this._floaties = [];
    const floatDefs = [
      { kind: 'ring', x: -2.6, z: -1.2 }, { kind: 'ring', x: 2.8, z: 1.4 },
      { kind: 'duck', x: 0, z: -2 }, { kind: 'duck', x: 3, z: -1.8 }, { kind: 'duck', x: -3, z: 1.8 },
      { kind: 'boat', x: -2, z: 2.2, lane: 0 },
      { kind: 'boat', x: -2, z: .8, lane: 1, cpu: true },
    ];
    floatDefs.forEach((d, i) => {
      const m = this._float(d.kind);
      m.position.set(d.x, .45, d.z);
      basin.add(m);
      this._floaties.push({ mesh: m, def: d, phase: Math.random() * 6 });
      if (d.kind !== 'boat') {
        this.addHit(m, {
          label: 'لعبة عائمة (اجمعها!)',
          onClick: () => this._collect(i),
        });
      }
    });
    this._boatRace = null;

    // fountain
    this.fountain = grp(g, 0, 0, 0);
    put(this.fountain, cyl(.3, .4, .5, 0xffffff), 0, .6, 0);
    put(this.fountain, cyl(.12, .16, .9, 0xb3e5fc), 0, 1, 0);
    this._fountainT = 0;
    this.addHit(this.fountain, {
      label: 'النافورة',
      onClick: () => {
        this.game.audio.sfx('splash');
        for (let i = 0; i < 14; i++)
          this.game.fx.splash({ x: (Math.random() - .5) * .5, y: 1.5, z: (Math.random() - .5) * .5 }, 6);
        this.game.activeBaby.ai.apply({ happiness: 5 });
      },
    });

    // beach balls on deck
    for (let i = 0; i < 3; i++) {
      const ball = sph(.28, [0xff7043, 0xffca28, 0x66bb6a][i]);
      ball.position.set(-6 - i * .7, .28, 1 + i);
      g.add(ball);
      this.addHit(ball, {
        label: 'كرة شاطئ',
        onClick: () => {
          this.game.audio.sfx('boing');
          ball.position.y = 1.2;
          setTimeout(() => ball.position.y = .28, 600);
          this.game.activeBaby.ai.apply({ happiness: 3 });
        },
      });
    }

    // ---------- supervisor NPC ----------
    const guard = this._guard();
    guard.position.set(5.6, 0, -4.4);
    guard.rotation.y = -.5;
    g.add(guard);

    // seats + umbrella
    const umbrella = grp(g, -6, 0, -3.6);
    put(umbrella, cyl(.05, .05, 2.2, 0x90a4ae), 0, 1.1, 0);
    put(umbrella, cone(1.6, .8, 0xff7043, { seg: 10 }), 0, 2.4, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      put(umbrella, box(1.5, .05, .16, i % 2 ? 0xffffff : 0xff7043), Math.cos(a) * .75, 2.1, Math.sin(a) * .75).rotation.y = -a;
    }
    for (let i = 0; i < 2; i++) {
      const chair = grp(g, -6.8 + i * 1.6, 0, -2.4);
      put(chair, box(.8, .1, 1.6, 0x4dd0e1), 0, .4, 0);
      put(chair, box(.8, .7, .12, 0x4dd0e1), 0, .8, -.7).rotation.x = -.3;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
        put(chair, cyl(.04, .04, .4, 0xffffff), sx * .32, .2, sz * .68);
    }

    const sign = textSprite('المسبح آمن مع المربية 🛟', { color: '#00838f', bg: 'rgba(255,255,255,.9)', fontPx: 46, height: .34 });
    sign.position.set(5.6, 2.6, -4.4);
    g.add(sign);

    this._collectedCount = 0;
    this.setSteps([
      { id: 'swim', icon: '🏊', label: 'اجلس الطفل في الماء' },
      { id: 'collect', icon: '🦆', label: 'اجمع 3 ألعاب عائمة' },
      { id: 'race', icon: '🚤', label: 'اربح سباق القوارب' },
    ]);
  }

  enter() {
    const b = this.addBaby(0, 3.9, Math.PI, 'idle');
    this._resetCollected();
    this._enableSwim();
    this.hint('اضغط الماء لتسبح! ثم اجمع الألعاب العائمة 🦆');
  }

  _float(kind) {
    const g = new THREE.Group();
    if (kind === 'ring') {
      const ring = torus(.4, .16, 0xff7043);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    } else if (kind === 'duck') {
      const body = sph(.22, 0xffeb3b);
      body.scale.set(1.3, .8, 1);
      g.add(body);
      const head = sph(.14, 0xffeb3b);
      head.position.set(.22, .2, 0);
      g.add(head);
      const beak = cone(.05, .1, 0xff9800);
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(.38, .18, 0);
      g.add(beak);
      const eye = sph(.025, 0x333);
      eye.position.set(.28, .26, .08);
      g.add(eye);
    } else if (kind === 'boat') {
      const hull = box(.4, .16, .8, 0xe53935);
      g.add(hull);
      const mast = cyl(.02, .02, .5, 0x8d6e63);
      mast.position.y = .3;
      g.add(mast);
      const sail = cone(.18, .35, 0xffffff, { seg: 3 });
      sail.position.set(0, .35, .05);
      sail.rotation.y = Math.PI;
      g.add(sail);
    }
    return g;
  }

  _guard() {
    const g = new THREE.Group();
    put(g, cyl(.3, .38, 1.1, 0x29b6f6), 0, .55, 0);
    put(g, sph(.25, 0xffe0c2), 0, 1.35, 0);
    put(g, cyl(.27, .3, .18, 0xff5252), 0, 1.52, 0);   // cap
    put(g, cyl(.3, .3, .04, 0xff5252), 0, 1.44, .1);
    for (const sx of [-1, 1]) {
      const e = sph(.04, 0x263238);
      e.position.set(sx * .09, 1.38, .22);
      g.add(e);
      const arm = capsule(.06, .45, 0xffe0c2);
      arm.position.set(sx * .35, .9, 0);
      arm.rotation.z = sx * .4;
      g.add(arm);
    }
    const ring = torus(.25, .07, 0xffca28);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(.5, 1, .1);
    g.add(ring);
    return g;
  }

  _enableSwim() {
    this.addHit(this.water, {
      label: 'الماء (اضغط لتسبح هنا)',
      onClick: (pt) => {
        const b = this.game.activeBaby;
        b.position.set(Math.max(-3.8, Math.min(3.8, pt.x)), .35, Math.max(-2.5, Math.min(2.5, pt.z)));
        b.animator.play('swim');
        b.animLock = 'playing';
        b.ai.setBusy('playing');
        b.setExpression('excited');
        this.game.audio.sfx('splash');
        this.game.fx.splash({ x: b.position.x, y: .6, z: b.position.z }, 16);
        this.step('swim');
        this.hint('رائع! الآن اجمع 3 ألعاب عائمة 🦆');
      },
    });
  }

  _resetCollected() {
    this._collectedCount = 0;
    for (const f of this._floaties) {
      if (f.def.kind !== 'boat') { f.mesh.visible = true; f.collected = false; }
    }
  }

  _collect(i) {
    const f = this._floaties[i];
    if (!f || f.collected) return;
    f.collected = true;
    this.game.audio.sfx('bubble');
    this.game.fx.splash({ x: f.mesh.position.x, y: .6, z: f.mesh.position.z }, 10);
    f.mesh.visible = false;
    this._collectedCount++;
    this.game.activeBaby.ai.apply({ happiness: 4 });
    this.game.rewards.toast(`جمعت لعبة! (${this._collectedCount}/3) 🦆`, '🌊');
    if (this._collectedCount >= 3 && !this.isStepDone('collect')) {
      this.step('collect');
      this.hint('الآن السباق! اضغط قاربك الأحمر بسرعة! 🚤');
    }
  }

  _startRace() {
    if (this._boatRace) return;
    const boats = this._floaties.filter(f => f.def.kind === 'boat');
    const mine = boats.find(b => !b.def.cpu);
    const cpu = boats.find(b => b.def.cpu);
    this._boatRace = { mine, cpu, progress: { mine: 0, cpu: 0 } };
    this.game.audio.sfx('train');
    this.game.rewards.toast('انطلق! اضغط قاربك بسرعة! 🚤', '🏁');
    this.hint('اضغط على قاربك بسرعة للفوز! 🚤');
  }

  update(dt, time) {
    // water waves
    const pos = this.water.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sin(time * 2 + x * 1.4 + y * 1.1) * .045 + Math.sin(time * 3.1 + x * 2.7) * .02);
    }
    pos.needsUpdate = true;

    // floats bob
    for (const f of this._floaties) {
      if (!f.mesh.visible) continue;
      f.mesh.position.y = .45 + Math.sin(time * 1.8 + f.phase) * .05;
      f.mesh.rotation.z = Math.sin(time * 1.5 + f.phase) * .08;
    }

    // fountain spray
    this._fountainT += dt;
    if (this._fountainT > .18) {
      this._fountainT = 0;
      this.game.fx.splash({ x: 0, y: 1.5, z: 0 }, 3);
    }

    // boat race
    if (this._boatRace) {
      const r = this._boatRace;
      r.progress.cpu += dt * .22;
      r.mine.mesh.position.z = 2.2 - r.progress.mine * 4.4;
      r.cpu.mesh.position.z = .8 - r.progress.cpu * 4.4;
      r.mine.mesh.rotation.x = Math.sin(time * 10) * .06;
      if (r.progress.mine >= 1 || r.progress.cpu >= 1) {
        const won = r.progress.mine >= 1;
        this._boatRace = null;
        if (won) {
          this.game.audio.sfx('goal');
          this.game.fx.confetti(new THREE.Vector3(0, 1.5, -2), 24);
          this.game.rewards.celebrate('فزت بالسباق! 🚤🏆', '🏁');
          this.game.rewards.grant(15, 1);
          if (!this.isStepDone('race')) this.step('race');
        } else {
          this.game.audio.sfx('error');
          this.game.rewards.toast('خسرت السباق! حاول مرة أخرى 💪', '🚤');
        }
        r.mine.mesh.position.set(-2, .45, 2.2);
        r.cpu.mesh.position.set(-2, .45, .8);
      }
    }
  }
}
