// rooms/bathroom.js — Baby Bathroom: fill the tub, temperature, soap bubbles
// scrubbing (drag the sponge over the baby), shower rinse, towel dry, comb.
import * as THREE from 'three';
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, torus, cone, windowPane, curtain, mirror, emojiSprite, textSprite, mat, rug } from '../js/kit.js';
import { tween, wait } from '../js/tween.js';

export class Bathroom extends RoomBase {
  static def = {
    id: 'bathroom', nameAr: 'غرفة الاستحمام', nameEn: 'Baby Bathroom', emoji: '🛁',
    color: '#26c6da', color2: '#4dd0e1', music: 'bath', sky: 'indoor',
    rewardCoins: 15, rewardStars: 1, stat: 'baths',
  };

  build() {
    const g = this.group;
    this.shell({ w: 10, d: 10, h: 4.4, floor: 0xd4f4f7, wall: 0xe2f8fb, wallLeft: 0xd0ecff, wainscot: 0x80deea, trim: 0xffffff });

    // tiles accent
    for (let i = 0; i < 8; i++) {
      put(g, box(.5, .5, .02, i % 2 ? 0xb2ebf2 : 0x80deea, { shadow: false }), -3 + i, 2.9, -4.97);
    }

    // window
    const w = windowPane(1.5, 1.3, 0xffffff, 0xb3e5fc);
    w.position.set(2.6, 2.5, -4.94);
    g.add(w);
    const c = curtain(1.8, 1.6, 0x80deea);
    c.position.set(2.6, 3.4, -4.86);
    g.add(c);

    // ---------- bathtub ----------
    const tub = grp(g, 0, 0, -2.2);
    const shellOut = box(2.6, .8, 1.5, 0xffffff);
    put(tub, shellOut, 0, .4, 0);
    const inner = box(2.3, .7, 1.2, 0xe0f7fa);
    put(tub, inner, 0, .46, 0);
    // water plane (rises when filling)
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(2.24, 1.14, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: .75, roughness: .15 })
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(0, .5, 0);
    tub.add(this.water);
    this._waterLevel = 0;
    // feet
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      put(tub, sph(.12, 0xffd54f), sx * 1.1, .08, sz * .55);
    // tap
    const tap = cyl(.05, .05, .5, 0xb0bec5);
    put(tub, tap, 0, 1.0, -.75).rotation.x = Math.PI / 2.6;
    this._tapStream = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, 1, 8),
      new THREE.MeshStandardMaterial({ color: 0x81d4fa, transparent: true, opacity: .7 }));
    this._tapStream.position.set(0, .8, -.55);
    this._tapStream.visible = false;
    tub.add(this._tapStream);
    this.addHit(tub, { label: 'حوض الاستحمام', onClick: () => this._toggleWater() });

    // temperature knob
    this.tempKnob = grp(g, 1.7, 1.15, -3.2);
    put(this.tempKnob, cyl(.22, .22, .1, 0xffffff), 0, 0, 0).rotation.x = Math.PI / 2;
    this._tempArrow = put(this.tempKnob, box(.05, .18, .04, 0x29b6f6), 0, .08, .06);
    this._temp = 0; // -1 cold, 0 warm, 1 hot
    this.addHit(this.tempKnob, {
      label: 'درجة الحرارة',
      onClick: () => {
        this._temp = this._temp === 0 ? 1 : this._temp === 1 ? -1 : 0;
        this._tempArrow.material = mat(this._temp === 1 ? 0xef5350 : this._temp === -1 ? 0x29b6f6 : 0x9ccc65);
        this.game.audio.sfx('toggle');
        const names = { 1: 'ماء دافئ 🌡️ مثالي!', [-1]: 'ماء بارد ❄️', 0: 'ماء فاتر' };
        this.game.rewards.toast(names[this._temp], '🌡️');
        if (this._temp === 1 && !this.isStepDone('warm')) this.step('warm');
      },
    });

    // ---------- tools on a shelf ----------
    const shelf = grp(g, -4.4, 0, 0);
    shelf.rotation.y = Math.PI / 2;
    put(shelf, box(.5, .08, 3.4, 0xffffff), 0, 1.2, 0);
    put(shelf, box(.5, .08, 3.4, 0xffffff), 0, 1.9, 0);

    // soap
    this.soap = grp(shelf, 0, 1.32, -1.2);
    put(this.soap, box(.3, .14, .2, 0xff80ab), 0, 0, 0);
    put(this.soap, emojiSprite('🧼', { size: .34 }), 0, .3, 0);
    this.addHit(this.soap, {
      label: 'الصابون',
      onClick: () => this._useSoap(),
    });

    // shampoo bottle
    this.shampoo = grp(shelf, 0, 1.32, -.4);
    put(this.shampoo, cyl(.1, .12, .35, 0x40c4ff), 0, 0, 0);
    put(this.shampoo, cyl(.04, .04, .1, 0xffd54f), 0, .22, 0);
    this.addHit(this.shampoo, {
      label: 'الشامبو',
      onClick: () => this._useShampoo(),
    });

    // sponge (draggable)
    this.sponge = grp(g, -3.2, 1.28, .2);
    put(this.sponge, box(.34, .16, .24, 0xffee58), 0, 0, 0);
    put(this.sponge, emojiSprite('🧽', { size: .36 }), 0, .3, 0);
    this.addHit(this.sponge, {
      label: 'الإسفنجة (اسحبها فوق الطفل)',
      dragY: 1.0,
      onDragStart: () => this.game.audio.sfx('pop'),
      onDragMove: (pt) => {
        this.sponge.position.set(pt.x, 1.0, pt.z);
        this._scrubCheck(pt);
      },
      onDrop: () => {
        tween(this.sponge.position, { x: -3.2, y: 1.28, z: .2 }, { dur: .4 });
      },
    });

    // shower head
    this.shower = grp(g, 0, 2.6, -1.2);
    put(this.shower, cyl(.05, .05, .5, 0xb0bec5), 0, .2, 0);
    put(this.shower, cone(.2, .18, 0xb0bec5), 0, -.1, 0);
    this.addHit(this.shower, {
      label: 'الدش (اشطف الصابون)',
      onClick: () => this._rinse(),
    });

    // towel
    this.towel = grp(g, -4.35, 1.4, 1.2);
    this.towel.rotation.y = Math.PI / 2;
    put(this.towel, box(.08, .7, .6, 0xffab91), 0, 0, 0);
    put(this.towel, emojiSprite('🧺', { size: .3 }), 0, .55, 0);
    this.addHit(this.towel, {
      label: 'المنشفة (جفف الطفل)',
      onClick: () => this._dry(),
    });

    // comb
    this.comb = grp(g, -4.35, 1.5, -.2);
    this.comb.rotation.y = Math.PI / 2;
    put(this.comb, box(.08, .05, .4, 0x8d6e63), 0, 0, 0);
    for (let i = 0; i < 6; i++) put(this.comb, box(.05, .12, .02, 0x8d6e63), 0, -.07, -.16 + i * .065);
    this.addHit(this.comb, {
      label: 'المشط',
      onClick: () => this._comb(),
    });

    // mirror + sink
    const mir = mirror(1.4, 1.1);
    mir.position.set(0, 2.6, -4.9);
    g.add(mir);
    const sink = grp(g, 2.6, 0, 4);
    put(sink, cyl(.4, .3, .3, 0xffffff), 0, .6, 0);
    put(sink, cyl(.3, .3, .06, 0xe0f7fa), 0, .76, 0);
    put(sink, cyl(.03, .03, .4, 0xb0bec5), 0, 1, -.15).rotation.x = .5;
    this.addHit(sink, { label: 'المغسلة', onClick: () => { this.game.audio.sfx('water'); this.game.fx.splash({ x: 2.6, y: .9, z: 4 }, 8); } });
    // hair dryer
    const dryer = grp(g, -2.6, 0, 4);
    put(dryer, box(.5, .2, .2, 0xce93d8), 0, .8, 0);
    put(dryer, cyl(.1, .14, .2, 0xba68c8), .3, .8, 0).rotation.z = Math.PI / 2;
    put(dryer, cyl(.05, .05, .3, 0xba68c8), -.3, .8, 0);
    this.addHit(dryer, {
      label: 'مجفف الشعر',
      onClick: () => {
        this.game.audio.sfx('shaver');
        this.game.fx.sparkles({ x: this.game.activeBaby.position.x, y: 1.8, z: this.game.activeBaby.position.z }, 8);
        this.game.rewards.toast('شعر ناعم وجاف! 💨', '💨');
        this.game.activeBaby.ai.apply({ comfort: 6, happiness: 4 });
      },
    });

    // rubber ducks
    for (let i = 0; i < 3; i++) {
      const duck = this._duck();
      duck.position.set(-3.4 + i * .5, 1.32, -4.2);
      g.add(duck);
      this.addHit(duck, {
        label: 'بطة مطاطية',
        onClick: () => { this.game.audio.sfx('bubble'); this.game.fx.bubbles({ x: duck.position.x, y: 1.6, z: duck.position.z }, 5, .3); },
      });
    }

    put(g, rug(2.6, 1.8, 0xb2ebf2, { inner: 0xe0f7fa }), 0, 0, 1.6);

    this._inTub = false;
    this._soaped = false;
    this._scrubCount = 0;
    this._rinsed = false;

    this.setSteps([
      { id: 'fill', icon: '🚿', label: 'املأ الحوض بالماء الدافئ' },
      { id: 'baby', icon: '👶', label: 'اسحب الطفل إلى الحوض' },
      { id: 'soap', icon: '🧼', label: 'أضف الصابون والشامبو' },
      { id: 'scrub', icon: '🧽', label: 'افرك بالإسفنجة (اسحبها)' },
      { id: 'rinse', icon: '🚿', label: 'اشطفه بالدش' },
      { id: 'dry', icon: '🧺', label: 'جففه بالمنشفة' },
    ]);
  }

  enter() {
    const baby = this.addBaby(0, 1.8, 0, 'idle');
    this._enableBabyDrag();
    this._resetWater();
    this.hint('اضغط الحوض لملائه بالماء ثم اضبط الحرارة 🌡️');
  }

  exit() { super.exit(); }

  _duck() {
    const d = new THREE.Group();
    const body = sph(.14, 0xffeb3b);
    body.scale.set(1.3, .9, 1);
    d.add(body);
    const head = sph(.1, 0xffeb3b);
    head.position.set(.12, .14, 0);
    d.add(head);
    const beak = cone(.04, .08, 0xff9800);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(.24, .13, 0);
    d.add(beak);
    return d;
  }

  _enableBabyDrag() {
    this.addHit(this.game.activeBaby, {
      label: 'اسحب الطفل إلى الحوض',
      dragY: 0,
      onDragStart: () => this.game.activeBaby.animator.play('carried'),
      onDragMove: (pt) => {
        const b = this.game.activeBaby;
        b.position.set(THREEclamp(pt.x, -4, 4), .45, THREEclamp(pt.z, -3.6, 3.8));
      },
      onDrop: () => {
        const b = this.game.activeBaby;
        if (Math.hypot(b.position.x, b.position.z + 2.2) < 1.4 && this._waterLevel > .7) {
          this._placeInTub();
        } else {
          tween(b.position, { y: 0 }, { dur: .2 });
          b.animator.play('idle');
          if (Math.hypot(b.position.x, b.position.z + 2.2) < 1.4 && this._waterLevel <= .7)
            this.hint('املأ الحوض بالماء أولًا 🚿');
        }
      },
    });
  }

  _toggleWater() {
    if (this._filling) return;
    if (this._waterLevel >= 1) { this.game.audio.sfx('error'); return; }
    this._filling = true;
    this._tapStream.visible = true;
    this.game.audio.sfx('splash');
    this.game.audio.startLoop('water');
    const from = this._waterLevel;
    tween(this, { _waterLevel: 1 }, {
      dur: 2.2,
      onUpdate: () => { this.water.position.y = .48 + this._waterLevel * .16; },
      onDone: () => {
        this._tapStream.visible = false;
        this.game.audio.stopLoop('water');
        this._filling = false;
        this.game.audio.sfx('pop');
        this.step('fill');
        this.hint('الآن اسحب الطفل إلى الحوض 👶');
      },
    });
    this.water.position.y = .48 + from * .16;
  }

  _resetWater() {
    this._waterLevel = 0;
    this.water.position.y = .48;
    this._inTub = false;
    this._soaped = false;
    this._scrubCount = 0;
    this._rinsed = false;
  }

  _placeInTub() {
    const b = this.game.activeBaby;
    this._inTub = true;
    b.position.set(0, .62, -2.2);
    b.rotation.y = 0;
    b.animator.play('bath');
    b.animLock = 'bathing';
    b.ai.setBusy('bathing');
    b.setExpression('excited');
    this.game.audio.sfx('splash');
    this.game.fx.splash({ x: 0, y: .9, z: -2.2 }, 20);
    this.step('baby');
    this.hint('أضف الصابون 🧼 ثم الشامبو');
    for (let i = 0; i < 8; i++)
      this.game.fx.bubbles({ x: (Math.random() - .5) * 1.6, y: .95, z: -2.2 + (Math.random() - .5) * .8 }, 3, .5);
  }

  _useSoap() {
    if (!this._inTub) { this.game.audio.sfx('error'); this.hint('ضع الطفل في الحوض أولًا!'); return; }
    this.game.audio.sfx('pour');
    this._soaped = true;
    const b = this.game.activeBaby;
    b.ai.apply({ hygiene: 8 });
    for (let i = 0; i < 12; i++)
      this.game.fx.bubbles({ x: (Math.random() - .5) * 1.6, y: .9, z: -2.2 + (Math.random() - .5) * .8 }, 4, .6);
    this.game.rewards.toast('صابون لطيف ورغوة كثيرة! 🫧', '🧼');
    if (this.isStepDone('baby')) { this.step('soap'); this.hint('اسحب الإسفنجة وفرك جسم الطفل! 🧽'); }
  }

  _useShampoo() {
    if (!this._inTub) { this.game.audio.sfx('error'); this.hint('ضع الطفل في الحوض أولًا!'); return; }
    this.game.audio.sfx('pour');
    const b = this.game.activeBaby;
    for (let i = 0; i < 8; i++)
      this.game.fx.bubbles({ x: b.position.x + (Math.random() - .5) * .5, y: 1.85, z: b.position.z }, 4, .3);
    this.game.rewards.toast('شامبو برائحة اللوز 🍬', '🧴');
    b.ai.apply({ hygiene: 5, comfort: 4 });
  }

  _scrubCheck(pt) {
    if (!this._inTub || !this._soaped || this.isStepDone('scrub')) return;
    const b = this.game.activeBaby;
    if (Math.hypot(pt.x - b.position.x, pt.z - b.position.z) < .8) {
      this._scrubCount++;
      if (this._scrubCount % 14 === 0) {
        this.game.audio.sfx('bubble');
        this.game.fx.bubbles({ x: b.position.x + (Math.random() - .5), y: 1.2, z: b.position.z + (Math.random() - .5) }, 6, .5);
        b.ai.apply({ hygiene: 7, happiness: 2 });
        b.setExpression('laughing');
        this.game.audio.sfx('giggle');
        setTimeout(() => b.setExpression('happy'), 900);
        if (this._scrubCount >= 56) {
          this.step('scrub');
          this.hint('رائع! اضغط الدش للشطف 🚿');
        }
      }
    }
  }

  _rinse() {
    if (!this.isStepDone('scrub')) { this.game.audio.sfx('error'); this.hint('افرك بالصابون أولًا 🧽'); return; }
    if (this._rinsed) return;
    this._rinsed = true;
    this.game.audio.sfx('splash');
    this.game.audio.startLoop('shower');
    const b = this.game.activeBaby;
    let n = 0;
    const rain = setInterval(() => {
      this.game.fx.splash({ x: b.position.x + (Math.random() - .5) * .7, y: 2.1, z: b.position.z + (Math.random() - .5) * .5 }, 6);
      if (++n > 10) {
        clearInterval(rain);
        this.game.audio.stopLoop('shower');
        this.step('rinse');
        b.ai.apply({ hygiene: 30 });
        this.hint('الآن جففه بالمنشفة 🧺');
      }
    }, 220);
  }

  _dry() {
    if (!this.isStepDone('rinse')) { this.game.audio.sfx('error'); this.hint('اشطفه أولًا 🚿'); return; }
    const b = this.game.activeBaby;
    b.animator.play('idle');
    b.animLock = null;
    b.ai.setBusy(null);
    b.rotation.x = 0;
    tween(b.position, { x: 0, y: 0, z: 1.6 }, { dur: .7 });
    this.game.audio.sfx('flip');
    this.game.fx.sparkles({ x: 0, y: 1.4, z: 1.6 }, 12);
    b.setExpression('happy');
    b.ai.apply({ hygiene: 45, comfort: 12, happiness: 10 });
    this.step('dry');
    this.game.rewards.toast('طفل نظيف ورائحته فواحة! 🌸', '✨', 'green');
    this.hint(null);
  }

  _comb() {
    const b = this.game.activeBaby;
    this.game.audio.sfx('comb');
    this.game.fx.sparkles({ x: b.position.x, y: 1.9, z: b.position.z }, 8);
    b.ai.apply({ comfort: 6, happiness: 3 });
    this.game.rewards.toast('شعر مرتب وتسريحة جميلة! 💇', '✨');
  }

  update(dt, time) {
    // gentle water ripple
    const pos = this.water.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sin(time * 2.2 + x * 4 + y * 3) * .018 * this._waterLevel);
    }
    pos.needsUpdate = true;
  }
}

function THREEclamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
