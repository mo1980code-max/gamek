// rooms/hospital.js — Baby Hospital: thermometer, stethoscope, ear check,
// bandage, vitamin spoon, sticker rewards. Playful & educational, no real
// medical advice — just caring magic.
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, torus, cone, emojiSprite, textSprite, rug, ceilingLamp, windowPane, starDecor, mat } from '../js/kit.js';
import { tween } from '../js/tween.js';

export class Hospital extends RoomBase {
  static def = {
    id: 'hospital', nameAr: 'غرفة الطبيب', nameEn: 'Baby Hospital', emoji: '🩺',
    color: '#ef5350', color2: '#ffffff', music: 'learning', sky: 'indoor',
    rewardCoins: 18, rewardStars: 1, stat: 'doctor',
  };

  build() {
    const g = this.group;
    this.shell({ w: 10, d: 10, h: 4.5, floor: 0xe3f2fd, wall: 0xf1f8ff, wallLeft: 0xe8f5e9, wainscot: 0x90caf9 });

    // ---------- exam bed ----------
    this.bed = grp(g, -1.6, 0, -1.6);
    put(this.bed, box(1.4, .55, 2, 0xffffff), 0, .32, 0);
    put(this.bed, box(1.3, .12, 1.9, 0x80d8ff), 0, .63, 0);
    put(this.bed, box(1.4, .5, .12, 0x4fc3f7), 0, .9, -1);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      put(this.bed, cyl(.05, .05, .4, 0xb0bec5), sx * .6, .2, sz * .85);
    this.addHit(this.bed, {
      label: 'سرير الفحص (اسحب الطفل هنا)',
      onClick: () => this._layBaby(),
    });

    // ---------- tools tray ----------
    const tray = grp(g, 2.6, 0, -.4);
    put(tray, box(1.6, .1, 2.6, 0xb0bec5), 0, .8, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      put(tray, cyl(.04, .04, .8, 0x78909c), sx * .7, .4, sz * 1.2);

    // thermometer
    this.thermo = grp(tray, 0, .95, -1);
    put(this.thermo, cyl(.04, .04, .45, 0xffffff), 0, 0, 0).rotation.z = Math.PI / 2;
    put(this.thermo, sph(.055, 0xef5350), .25, 0, 0);
    put(this.thermo, emojiSprite('🌡️', { size: .32 }), 0, .3, 0);
    this.addHit(this.thermo, { label: 'ميزان الحرارة', onClick: () => this._thermometer() });

    // stethoscope
    this.steth = grp(tray, 0, .92, -.2);
    put(this.steth, torus(.16, .03, 0x37474f, { arc: Math.PI * 1.4 }), 0, 0, 0).rotation.x = 1.2;
    put(this.steth, cyl(.09, .09, .04, 0xdedede), .14, -.08, 0).rotation.x = Math.PI / 2;
    put(this.steth, emojiSprite('🩺', { size: .3 }), 0, .26, 0);
    this.addHit(this.steth, { label: 'سماعة الطبيب', onClick: () => this._stethoscope() });

    // otoscope (ear check)
    this.otoscope = grp(tray, 0, .95, .55);
    put(this.otoscope, cyl(.05, .06, .35, 0xffffff), 0, 0, 0);
    put(this.otoscope, cone(.06, .12, 0x90caf9), 0, .23, 0);
    put(this.otoscope, emojiSprite('👂', { size: .3 }), 0, .42, 0);
    this.addHit(this.otoscope, { label: 'فحص الأذن', onClick: () => this._earCheck() });

    // bandage
    this.bandage = grp(tray, 0, .92, 1);
    put(this.bandage, box(.3, .06, .14, 0xffcdd2), 0, 0, 0);
    put(this.bandage, box(.14, .065, .13, 0xef9a9a), 0, .002, 0);
    put(this.bandage, emojiSprite('🩹', { size: .3 }), 0, .26, 0);
    this.addHit(this.bandage, { label: 'ضمادة لطيفة', onClick: () => this._bandage() });

    // vitamin spoon
    this.vitamin = grp(tray, 0, .95, -.75);
    put(this.vitamin, box(.04, .02, .3, 0xb0bec5), 0, 0, .1);
    put(this.vitamin, sph(.07, 0xffd54f), 0, .01, -.08).scale.set(1, .4, 1.3);
    put(this.vitamin, emojiSprite('🍯', { size: .3 }), 0, .26, 0);
    this.addHit(this.vitamin, { label: 'ملعقة الفيتامين', onClick: () => this._vitamin() });

    // ---------- sticker chart ----------
    const chart = grp(g, 3.4, 2.6, -4.9);
    put(chart, box(1.6, 1.2, .06, 0xffffff), 0, 0, 0);
    put(chart, box(1.5, 1.1, .04, 0xfffde7), 0, 0, .04);
    for (let i = 0; i < 6; i++) {
      const st = starDecor(i < this._stickers ? 0xffd54f : 0xdedede);
      st.position.set(-.5 + (i % 3) * .5, .2 - Math.floor(i / 3) * .45, .07);
      chart.add(st);
    }
    this._chart = chart;
    this.addHit(chart, { label: 'لوحة الملصقات', onClick: () => this.game.rewards.toast('كل فحص يمنحك ملصقة نجمة! ⭐', '🌟') });

    // ---------- xray (cartoon) ----------
    const xray = grp(g, -3.4, 2.6, -4.9);
    put(xray, box(1.2, 1.5, .06, 0x263238), 0, 0, 0);
    put(xray, emojiSprite('🦴', { size: .8 }), 0, .1, .06);
    this.addHit(xray, { label: 'جهاز الأشعة الكرتوني', onClick: () => { this.game.audio.sfx('beep'); this.game.rewards.toast('عظام قوية مثل البطاطس! 🦴😄', '🩻'); } });

    // first aid bag
    const bag = grp(g, 3.6, 0, 2.6);
    put(bag, box(.7, .5, .4, 0xe53935), 0, .3, 0);
    put(bag, box(.24, .14, .05, 0xffffff), 0, .38, .21);
    put(bag, box(.1, .3, .36, 0xb71c1c), 0, .6, 0);
    this.addHit(bag, { label: 'حقيبة الإسعافات', onClick: () => { this.game.audio.sfx('pop'); this.game.rewards.toast('كل الأدوات في مكانها! 🧰', '💼'); } });

    put(g, rug(3, 2.2, 0xe1f5fe, { inner: 0xf1f8ff }), -1.6, 0, 1.4);
    put(g, ceilingLamp(0x90caf9), 0, 4.5, 0);
    const sign = textSprite('عيادة الحضانة 🩺', { color: '#0277bd', bg: 'rgba(255,255,255,.92)', fontPx: 50, height: .36 });
    sign.position.set(0, 3.7, -4.92);
    g.add(sign);

    this._laying = false;
    this._stickers = 0;
    this.setSteps([
      { id: 'lay', icon: '🛏️', label: 'اجلس الطفل على سرير الفحص' },
      { id: 'temp', icon: '🌡️', label: 'قِس درجة الحرارة' },
      { id: 'heart', icon: '🩺', label: 'اسمع نبض القلب' },
      { id: 'ear', icon: '👂', label: 'افحص الأذن' },
      { id: 'band', icon: '🩹', label: 'ضع ضمادة لطيفة' },
      { id: 'vit', icon: '🍯', label: 'أعطه ملعقة الفيتامين' },
    ]);
  }

  enter() {
    this.addBaby(1.4, 2.4, Math.PI, 'idle');
    this.hint('ضع الطفل على سرير الفحص وابدأ الفحص اللطيف 🩺');
  }

  _layBaby() {
    const b = this.game.activeBaby;
    this._laying = true;
    b.position.set(-1.6, .7, -1.6);
    b.rotation.set(-Math.PI / 2 * .96, 0, 0);
    b.animator.play('sleep');
    b.setExpression('surprised');
    this.game.audio.sfx('boing');
    this.step('lay');
    this.hint('ممتاز! جرّب الأدوات على الطاولة 🌡️🩺');
  }

  _needLay() {
    if (!this._laying) {
      this.game.audio.sfx('error');
      this.hint('ضع الطفل على سرير الفحص أولًا 🛏️');
      return true;
    }
    return false;
  }

  _thermometer() {
    if (this._needLay()) return;
    this.game.audio.sfx('beep');
    const temp = (36.4 + Math.random() * .8).toFixed(1);
    this.game.rewards.toast(`الحرارة ${temp}° — ممتاز! 🌡️`, '✅', 'green');
    this.game.fx.sparkles({ x: -1.6, y: 1.6, z: -1.6 }, 6);
    this.game.activeBaby.ai.apply({ health: 6, comfort: 3 });
    this.step('temp');
  }

  _stethoscope() {
    if (this._needLay()) return;
    this.game.audio.sfx('heart');
    setTimeout(() => this.game.audio.sfx('heart'), 600);
    this.game.fx.hearts({ x: -1.6, y: 1.4, z: -1.3 }, 5);
    this.game.rewards.toast('قلب قوي يدق: بووم بووم! ❤️', '🩺', 'green');
    this.game.activeBaby.ai.apply({ health: 6, happiness: 3 });
    this.step('heart');
  }

  _earCheck() {
    if (this._needLay()) return;
    this.game.audio.sfx('beep');
    this.game.fx.sparkles({ x: -1.6, y: 1.9, z: -1.6 }, 4);
    this.game.rewards.toast('الأذن نظيفة والسمع رائع! 👂✨', '✅');
    this.game.activeBaby.ai.apply({ health: 5 });
    this.step('ear');
  }

  _bandage() {
    if (this._needLay()) return;
    this.game.audio.sfx('bandage');
    const b = this.game.activeBaby;
    // little bandage appears on the leg
    if (!this._legBand) {
      this._legBand = grp(b.legL, 0, -.2, .06);
      put(this._legBand, box(.16, .1, .04, 0xffcdd2), 0, 0, 0);
      put(this._legBand, box(.08, .1, .045, 0xef9a9a), 0, 0, .002);
    }
    this._legBand.visible = true;
    this.game.fx.hearts({ x: -1.6, y: 1.2, z: -1.6 }, 4);
    this.game.rewards.toast('ضمادة بلون القلب! لا يؤلم أبدًا 🩹💖', '💪', 'green');
    b.ai.apply({ health: 8, comfort: 5 });
    this._addSticker();
    this.step('band');
  }

  _vitamin() {
    if (this._needLay()) return;
    const b = this.game.activeBaby;
    this.game.audio.sfx('drink');
    b.setExpression('happy', true);
    this.game.rewards.toast('فيتامين بطعم العسل! لذيذ 🍯', '😋', 'green');
    b.ai.apply({ health: 12, happiness: 6 });
    this._addSticker();
    this.step('vit');
    setTimeout(() => {
      b.setExpression('laughing');
      this.game.audio.sfx('giggle');
      setTimeout(() => b.setExpression('happy'), 1000);
    }, 700);
  }

  _addSticker() {
    this._stickers = Math.min(6, this._stickers + 1);
    // refresh chart stars
    const chart = this._chart;
    chart.children.filter(c => c.geometry?.type === 'ShapeGeometry').forEach((st, i) => {
      st.material = mat(i < this._stickers ? 0xffd54f : 0xdedede, { emissive: i < this._stickers ? 0xffd54f : 0, emissiveIntensity: .8 });
    });
    this.game.audio.sfx('star');
  }

  onAllStepsDone() {
    const b = this.game.activeBaby;
    b.setExpression('happy');
    b.ai.apply({ health: 15, happiness: 8, comfort: 8 });
    this.game.fx.burstStars({ x: -1.6, y: 2, z: -1.6 }, 18);
    this.game.rewards.toast('الفحص اكتمل — الطفل بصحة ممتازة! 💯', '🩺', 'gold');
  }
}
