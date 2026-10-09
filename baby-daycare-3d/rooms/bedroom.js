// rooms/bedroom.js — Baby Bedroom: 6 cribs, carry the baby to bed, blanket,
// pillow, lullaby music box, lights out, real sleep that restores energy.
import { RoomBase } from '../js/roomBase.js';
import * as THREE from 'three';
import { put, grp, box, cyl, sph, cone, crib, pillowCushion, curtain, windowPane, starDecor, teddy, ceilingLamp, emojiSprite, wallPicture, rug, mat, block } from '../js/kit.js';
import { tween } from '../js/tween.js';
import { BABIES } from '../js/baby.js';

export class Bedroom extends RoomBase {
  static def = {
    id: 'bedroom', nameAr: 'غرفة نوم الأطفال', nameEn: 'Baby Bedroom', emoji: '🛏️',
    color: '#5c6bc0', color2: '#7986cb', music: 'sleep', sky: 'indoor',
    rewardCoins: 15, rewardStars: 1, stat: 'sleeps',
  };

  build() {
    const g = this.group;
    this.shell({ w: 11, d: 11, h: 4.5, floor: 0xd7ccf2, wall: 0xece5ff, wallLeft: 0xe3f0ff, wainscot: 0xb3c2f0 });

    // windows + curtains
    for (const [x, z, ry] of [[2.5, -5.44, 0], [-2.5, -5.44, 0]]) {
      const w = windowPane(1.6, 1.5, 0xffffff, 0x9ecfff);
      w.position.set(x, 2.4, z);
      g.add(w);
      const c = curtain(1.9, 1.8, 0xb39ddb);
      c.position.set(x, 3.3, z + .06);
      g.add(c);
    }

    // six cribs around the walls
    this.cribs = [];
    const spots = [
      [-3.8, -3.6, 0], [0, -3.6, 0], [3.8, -3.6, 0],
      [-3.8, 3.8, Math.PI], [0, 3.8, Math.PI], [3.8, 3.8, Math.PI],
    ];
    const cribColors = [0xff8fab, 0x80d8ff, 0xaed581, 0xffd54f, 0xce93d8, 0xffab91];
    spots.forEach((s, i) => {
      const c = crib(cribColors[i]);
      c.position.set(s[0], 0, s[1]);
      c.rotation.y = s[2];
      g.add(c);
      // pillow + blanket per crib
      const pillow = pillowCushion(0xffffff);
      pillow.position.set(s[0] - Math.sin(s[2]) * 0, .72, s[1]);
      pillow.position.x += Math.cos(s[2]) * -.55 * 0; // keep simple
      pillow.position.z += s[2] === 0 ? -.2 : .2;
      g.add(pillow);
      const blanket = box(1.3, .1, .8, cribColors[(i + 2) % 6]);
      blanket.position.set(s[0], .74, s[1] + (s[2] === 0 ? .22 : -.22));
      g.add(blanket);
      const rec = { pos: new THREE.Vector3(s[0], .78, s[1]), ry: s[2], pillow, blanket, crib: c };
      this.cribs.push(rec);
      // plushie beside each crib
      put(g, teddy([0xb0713c, 0xf48fb1, 0x90caf9, 0xa5d6a7, 0xffcc80, 0xb39ddb][i]), s[0] + 1.05, 0, s[1] + .8, Math.random() * 3);
    });

    // interactive blanket & pillow belong to crib 1 (the "active" bed flow)
    this.addHit(this.cribs[1].blanket, {
      label: 'البطانية',
      onClick: () => this._toggleBlanket(),
    });
    this.addHit(this.cribs[1].pillow, {
      label: 'الوسادة',
      onClick: () => this._cyclePillow(),
    });

    // night lamps on a shelf
    const shelf = grp(g, 4.9, 0, 0);
    shelf.rotation.y = -Math.PI / 2;
    put(shelf, box(.4, 1.1, 2.6, 0xffcc80), 0, .55, 0);
    this.musicBox = grp(shelf, 0, 1.25, -.8);
    put(this.musicBox, box(.34, .24, .24, 0xf06292), 0, 0, 0);
    put(this.musicBox, cyl(.02, .02, .18, 0xffd54f), 0, .2, 0);
    const note = emojiSprite('🎵', { size: .3 });
    note.position.set(0, .42, 0);
    this.musicBox.add(note);
    this._musicOn = false;
    this.addHit(this.musicBox, {
      label: 'موسيقى النوم',
      onClick: () => this._toggleLullaby(),
    });

    this.lightSwitch = grp(shelf, 0, 1.35, .8);
    put(this.lightSwitch, box(.12, .2, .06, 0xffffff), 0, 0, 0);
    this._switchNub = put(this.lightSwitch, box(.05, .1, .04, 0xff5252), 0, .04, .05);
    this.addHit(this.lightSwitch, {
      label: 'مفتاح الإضاءة',
      onClick: () => this._toggleLights(),
    });

    // glowing wall stars (light up when dark)
    this.wallStars = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const st = starDecor([0xfff176, 0xffd54f, 0xb3e5fc][i % 3]);
      st.position.set(Math.sin(i * 2.1) * 4.6, 2.6 + Math.cos(i * 1.3) * 1.2, -5.46);
      st.scale.setScalar(.9 + (i % 3) * .4);
      this.wallStars.add(st);
    }
    g.add(this.wallStars);
    this.wallStars.visible = false;

    // decorations
    put(g, rug(3.4, 2.4, 0xc5cae9, { inner: 0xe8eaf6 }), 0, 0, 0);
    put(g, ceilingLamp(0xb39ddb), 0, 4.5, 0);
    put(g, wallPicture('🌙', .7, .55, 0x9575cd), -1.5, 3.1, -5.44);
    put(g, block(.3, 0x9575cd, 'Z'), -4.6, .15, 2.2);
    put(g, block(.26, 0xffd54f, 'z'), -4.2, .13, 2.5);

    // carry-to-bed interactive crib zone marker
    this._activeBed = null;
    this._sleeping = false;
    this._lightsOff = false;

    this.setSteps([
      { id: 'place', icon: '🛏️', label: 'اسحب طفلك إلى السرير' },
      { id: 'blanket', icon: '🧣', label: 'غطِّه بالبطانية' },
      { id: 'music', icon: '🎵', label: 'شغّل موسيقى النوم' },
      { id: 'light', icon: '🔅', label: 'أطفئ الأنوار' },
    ]);
  }

  enter() {
    const baby = this.addBaby(0, 1.6, 0, 'idle');
    // other babies are already asleep in their cribs
    const others = BABIES.filter(b => b.id !== this.game.save.data.selectedBaby);
    others.forEach((cfg, i) => {
      const b = this.addNPCBaby(cfg.id, this.cribs[[0, 2, 3, 4, 5][i]].pos.x, this.cribs[[0, 2, 3, 4, 5][i]].pos.z, this.cribs[[0, 2, 3, 4, 5][i]].ry, 'sleep');
      b.setExpression('sleep', true);
      b.rotation.x = -Math.PI / 2 * .94;
    });
    this.hint('اسحب الطفل إلى السرير الوسطى حتى ينام 💤');
    this.game.rig.minDist = 3.5;
  }

  /* ---------- drag the baby into the crib ---------- */
  _enableBabyDrag() {
    this.addHit(this.game.activeBaby, {
      label: 'الطفل (اسحبني للسرير)',
      dragY: 0,
      onDragStart: () => {
        if (this._sleeping) return false;
        this.game.activeBaby.animator.play('carried');
        this.game.audio.sfx('babble');
      },
      onDragMove: (pt) => {
        const b = this.game.activeBaby;
        b.position.x = THREEclamp(pt.x, -4.8, 4.8);
        b.position.z = THREEclamp(pt.z, -4.4, 4.4);
        b.position.y = .45;
      },
      onDrop: (pt) => {
        const b = this.game.activeBaby;
        b.position.y = 0;
        // near the middle crib?
        const bed = this.cribs[1].pos;
        if (Math.hypot(b.position.x - bed.x, b.position.z - bed.z) < 1.35 && !this.isStepDone('place')) {
          b.position.set(bed.x, .78, bed.z);
          b.rotation.y = this.cribs[1].ry;
          this._startSleep();
        } else {
          b.animator.play('idle');
          tween(b.position, { y: 0 }, { dur: .2 });
        }
      },
    });
  }

  _startSleep() {
    const baby = this.game.activeBaby;
    this._sleeping = true;
    baby.rotation.x = -Math.PI / 2 * .94;
    baby.animator.play('sleep');
    baby.setExpression('sleep', true);
    baby.animLock = 'sleep';
    this.game.audio.sfx('yawn');
    this.step('place');
    this.hint('الآن غطِّه بالبطانية 🧣');
    // restore energy gradually while asleep
    this._energyTimer = setInterval(() => {
      if (!this._sleeping) return clearInterval(this._energyTimer);
      baby.needs.apply({ energy: 3, comfort: 1 });
      this.game.fx.zzz({ x: baby.position.x + .3, y: baby.position.y + 1.35, z: baby.position.z });
      if (this._musicOn && Math.random() < .5) this.game.audio.sfx('snore');
    }, 1600);
    this._startZZZ();
  }

  _startZZZ() {
    const loop = () => {
      if (!this._sleeping || this.roomClosed) return;
      const baby = this.game.activeBaby;
      this.game.fx.zzz({ x: baby.position.x + .2, y: 1.3, z: baby.position.z + .1 });
      this.later(1500, loop);
    };
    loop();
  }

  _toggleBlanket() {
    if (!this.isStepDone('place')) { this.game.audio.sfx('error'); this.hint('ضع الطفل في السرير أولًا!'); return; }
    const baby = this.game.activeBaby;
    const bl = this.cribs[1].blanket;
    const on = bl.position.y > .76;
    tween(bl.position, { y: on ? .72 : .84 }, { dur: .3 });
    this.game.audio.sfx('flip');
    if (!on) {
      this.game.fx.hearts({ x: baby.position.x, y: 1.6, z: baby.position.z }, 5);
      this.step('blanket');
      this.hint('شغّل صندوق الموسيقى 🎵');
      baby.ai.apply({ comfort: 12 });
    }
  }

  _cyclePillow() {
    const cols = [0xffffff, 0xfff9c4, 0xb3e5fc, 0xffcdd2, 0xc8e6c9];
    const p = this.cribs[1].pillow;
    const cur = cols.findIndex(c => p.children[0].material.color.getHex() === c);
    p.children[0].material = mat(cols[(cur + 1) % cols.length], { rough: 1 });
    this.game.audio.sfx('pop');
    this.game.fx.sparkles({ x: p.position.x, y: 1, z: p.position.z }, 6);
  }

  _toggleLullaby() {
    this._musicOn = !this._musicOn;
    this.game.audio.sfx('toggle');
    if (this._musicOn) {
      this.game.audio.playMusic('sleep');
      this.game.rewards.toast('تهويدة هادئة 🎵', '🎵');
      if (this.isStepDone('place')) {
        this.step('music');
        this.hint('أطفئ الأنوار لي النوم عميقًا 🔅');
      }
    }
  }

  _toggleLights() {
    this._lightsOff = !this._lightsOff;
    this.game.audio.sfx('switch');
    this._switchNub.position.y = this._lightsOff ? -.04 : .04;
    const env = this._lightsOff
      ? { hemi: { sky: '#3b4a8f', ground: '#1a2350', intensity: .35 }, sun: { intensity: .1 } }
      : { hemi: { sky: '#ffffff', ground: '#cae4ff', intensity: .95 }, sun: { intensity: 1.2 } };
    this.game.scenes.setEnvironment({ sky: this._lightsOff ? 'night' : 'indoor', ...env });
    this.wallStars.visible = this._lightsOff;
    if (this._lightsOff && this.isStepDone('place')) {
      this.step('light');
      this.hint('نائم بسكينة… اتركه حتى يمتلئ مساحته ⚡ ثم اضغط عليه لإيقاظه');
      this._wakeEnabled = true;
    }
  }

  _wake() {
    if (!this._sleeping || !this._wakeEnabled) return;
    const baby = this.game.activeBaby;
    this._sleeping = false;
    this._wakeEnabled = false;
    clearInterval(this._energyTimer);
    baby.rotation.x = 0;
    baby.position.set(this.cribs[1].pos.x, 0, this.cribs[1].pos.z + 1.2);
    baby.animLock = null;
    baby.setExpression('happy');
    baby.animator.play('stretch' in {} ? 'idle' : 'laugh', { loop: false, onDone: () => baby.animator.play('idle') });
    this.game.audio.sfx('giggle');
    this.game.fx.hearts({ x: baby.position.x, y: 1.6, z: baby.position.z }, 8);
    baby.ai.apply({ energy: 40, comfort: 10, happiness: 8 });
    if (this.doneSteps.size >= this.stepDefs.length) {
      this.hint('اكتمل روتين النوم! 🌙 أعدت ملء طاقة الطفل');
      this.game.rewards.toast('الطفل استيقظ نشيطًا وسعيدًا! ⚡', '🌅', 'green');
    }
  }

  onAllStepsDone() {
    this.hint('روتين النوم اكتمل 🌙 الطفل يشعر بالراحة!');
    setTimeout(() => this.hint(null), 4200);
  }

  update(dt, time) {
    if (this._lightsOff) {
      this.wallStars.children.forEach((s, i) => {
        s.scale.setScalar(.8 + Math.sin(time * 2 + i) * .25);
      });
    }
  }
}

function THREEclamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
