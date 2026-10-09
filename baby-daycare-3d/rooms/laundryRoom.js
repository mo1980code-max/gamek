// rooms/laundryRoom.js — Laundry Room: collect dirty clothes, sort colors,
// load the washer, add detergent, watch the drum spin, hang to dry, fold.
import { RoomBase } from '../js/roomBase.js';
import * as THREE from 'three';
import { put, grp, box, cyl, sph, torus, emojiSprite, textSprite, shelfUnit, mat } from '../js/kit.js';
import { tween, wait } from '../js/tween.js';
import { binSort } from '../minigames/sorting.js';

export class LaundryRoom extends RoomBase {
  static def = {
    id: 'laundryRoom', nameAr: 'غرفة الغسيل', nameEn: 'Laundry Room', emoji: '🧺',
    color: '#26c6da', color2: '#26a69a', music: 'play', sky: 'indoor',
    rewardCoins: 18, rewardStars: 1, stat: 'laundry',
  };

  build() {
    const g = this.group;
    this.shell({ w: 10, d: 10, h: 4.4, floor: 0xdfe9ee, wall: 0xf0f6f8, wallLeft: 0xe8f1f5, wainscot: 0xb0bec5 });

    // ---------- washing machine ----------
    this.washer = grp(g, -3.2, 0, -3);
    put(this.washer, box(1.5, 1.7, 1.1, 0xffffff), 0, .85, 0);
    put(this.washer, box(1.5, .25, 1.12, 0x4dd0e1), 0, 1.55, 0);
    put(this.washer, cyl(.5, .5, .1, 0x263238), 0, .85, .56).rotation.x = Math.PI / 2;
    this.drum = new THREE.Mesh(new THREE.CircleGeometry(.42, 24), mat(0x81d4fa, { transparent: true, opacity: .8 }));
    this.drum.position.set(0, .85, .62);
    this.washer.add(this.drum);
    this._drumClothes = [];
    for (let i = 0; i < 4; i++) {
      const cloth = sph(.13, [0xef5350, 0xffca28, 0x66bb6a, 0x42a5f5][i], { shadow: false });
      cloth.position.set(Math.cos(i * 1.6) * .18, .85 + Math.sin(i * 1.6) * .18, .6);
      cloth.scale.z = .4;
      this.washer.add(cloth);
      cloth.visible = false;
      this._drumClothes.push(cloth);
    }
    this._knob = put(this.washer, cyl(.12, .12, .08, 0x90a4ae), .55, 1.45, .56).rotation.x = Math.PI / 2;
    put(this.washer, emojiSprite('🧺', { size: .3 }), -.4, 1.72, 0);
    this.addHit(this.washer, {
      label: 'الغسالة',
      onClick: () => this._washerAction(),
    });

    // ---------- laundry basket (collect here) ----------
    this.basket = grp(g, 2.4, 0, -3.2);
    put(this.basket, cyl(.55, .4, .7, 0xffca28, { seg: 12 }), 0, .35, 0);
    put(this.basket, torus(.53, .05, 0xffb300), 0, .7, 0).rotation.x = Math.PI / 2;
    put(this.basket, emojiSprite('🧺', { size: .4 }), 0, 1, 0);
    this._collected = 0;
    this.addHit(this.basket, {
      label: `سلة الغسيل (${this._collected}/4)`,
      onClick: () => {
        if (this._collected >= 4) this._loadWasher();
        else this.hint('اجمع كل الملابس المتسخة أولًا!');
      },
    });

    // ---------- dirty clothes around the floor ----------
    this._clothes = [];
    const cols = [0xef5350, 0xffca28, 0x66bb6a, 0x42a5f5];
    [[-1, 1.4], [.6, 2], [1.8, .8], [-2.2, 2.6]].forEach(([x, z], i) => {
      const cloth = grp(g, x, 0, z);
      const m = box(.5, .1, .45, cols[i]);
      m.rotation.y = Math.random();
      m.rotation.z = .08;
      cloth.add(m);
      put(cloth, emojiSprite('🧦', { size: .28 }), 0, .3, 0);
      this._clothes.push({ group: cloth, color: cols[i], collected: false });
      this.addHit(cloth, {
        label: 'ملابس متسخة (اضغط للجمع)',
        onClick: () => this._collect(cloth.userData.idx),
      });
      cloth.userData.idx = i;
    });

    // ---------- detergent ----------
    const det = grp(g, 3.8, 0, -3.4);
    put(det, box(.4, .6, .3, 0x7cb342), 0, .3, 0);
    put(det, box(.34, .12, .26, 0x33691e), 0, .64, 0);
    put(det, emojiSprite('🧴', { size: .34 }), 0, .95, 0);
    this.addHit(det, {
      label: 'مسحوق الغسيل',
      onClick: () => {
        if (!this._loaded) { this.game.audio.sfx('error'); this.hint('ضع الملابس في الغسالة أولًا!'); return; }
        if (this.isStepDone('detergent')) { this.game.audio.sfx('pop'); return; }
        this.game.audio.sfx('detergent');
        this.game.fx.sparkles({ x: -3.2, y: 1.4, z: -3 }, 8, [0xffffff, 0xaed581]);
        this.step('detergent');
        this.hint('الآن اضغط الغسالة لتشغيلها! ▶️');
      },
    });

    // ---------- clothes line ----------
    this.line = grp(g, 0, 0, 3.8);
    put(this.line, cyl(.03, .03, 6, 0x9e9e9e), 0, 2.2, 0).rotation.z = Math.PI / 2;
    for (const x of [-2.6, 0, 2.6]) put(this.line, cyl(.04, .04, 2.2, 0x8d6e63), x, 1.1, 0);
    this._hung = 0;

    // shelf + iron
    const sh = shelfUnit(1.6, 1.6, 0xffcc80, 2);
    sh.position.set(4.4, 0, 1);
    sh.rotation.y = -Math.PI / 2;
    g.add(sh);
    const iron = grp(sh, 0, .5, 0);
    put(iron, box(.3, .12, .14, 0x90caf9), 0, 0, 0);
    put(iron, sph(.07, 0x64b5f6), .18, -.02, 0);
    put(iron, box(.08, .12, .06, 0x1e88e5), -.12, .1, 0);
    this.addHit(iron, {
      label: 'المكواة (كرتونية)',
      onClick: () => {
        this.game.audio.sfx('iron');
        this.game.fx.steam({ x: 4.4, y: 1, z: 1 }, 4);
        this.game.rewards.toast('ملابس مكوية ومرتبة! 👕✨', '🧺');
      },
    });

    const sign = textSprite('مغسلة الحضانة 🧺', { color: '#00838f', bg: 'rgba(255,255,255,.92)', fontPx: 48, height: .34 });
    sign.position.set(0, 3.6, -5.4);
    g.add(sign);

    this._loaded = false;
    this._washing = false;

    this.setSteps([
      { id: 'collect', icon: '🧦', label: 'اجمع 4 ملابس متسخة' },
      { id: 'sort', icon: '🎨', label: 'فرّز الملابس حسب اللون' },
      { id: 'load', icon: '🫧', label: 'ضعها في الغسالة' },
      { id: 'detergent', icon: '🧴', label: 'أضف مسحوق الغسيل' },
      { id: 'wash', icon: '▶️', label: 'شغّل الغسالة' },
      { id: 'hang', icon: '👕', label: 'انشر الملابس النظيفة' },
    ]);
  }

  enter() {
    this.addBaby(0, .6, .4, 'idle');
    this.hint('اجمع الملابس المتسخة من الأرض! 🧦');
  }

  _collect(i) {
    const rec = this._clothes[i];
    if (!rec || rec.collected) return;
    rec.collected = true;
    this._collected++;
    this.game.audio.sfx('drop');
    tween(rec.group.position, { x: 2.4, y: .5, z: -3.2 }, {
      dur: .45,
      onDone: () => {
        rec.group.visible = false;
        this.game.fx.sparkles({ x: 2.4, y: .8, z: -3.2 }, 4);
        if (this._collected >= 4 && !this.isStepDone('collect')) {
          this.step('collect');
          this.hint('الآن فرّز الألوان! اضغط السلة 🧺');
        }
      },
    });
  }

  _sortGame() {
    const g = this.game;
    const holder = document.createElement('div');
    const close = g.ui.modal({ title: 'فرز الملابس 🎨', icon: '🧺', body: holder });
    binSort(holder, {
      title: 'الفتيات/الألوان: الأبيض مع الأبيض والملوّن مع الملوّن!',
      items: [
        { t: '👕', bin: 'white' }, { t: '🧦', bin: 'white' }, { t: '👗', bin: 'color' },
        { t: '👖', bin: 'color' }, { t: '🧣', bin: 'color' }, { t: '🩳', bin: 'white' },
      ],
      bins: [
        { id: 'white', ar: 'أبيض', color: '#90a4ae', emoji: '⚪' },
        { id: 'color', ar: 'ملوّن', color: '#ec407a', emoji: '🌈' },
      ],
      onDone: () => setTimeout(() => {
        close();
        this.step('sort');
        this.hint('اضغط السلة لتحميل الغسالة! 🫧');
      }, 400),
    });
  }

  _loadWasher() {
    if (!this.isStepDone('collect')) { this.game.audio.sfx('error'); return; }
    if (!this.isStepDone('sort')) { this._sortGame(); return; }
    if (this._loaded) { this.game.audio.sfx('pop'); return; }
    this._loaded = true;
    this.game.audio.sfx('splash');
    this._drumClothes.forEach((c, i) => {
      setTimeout(() => { c.visible = true; this.game.audio.sfx('drop'); }, i * 250);
    });
    this.step('load');
    this.hint('أضف مسحوق الغسيل 🧴');
  }

  _washerAction() {
    if (!this._loaded) { this.game.audio.sfx('click'); this.game.rewards.toast('غسالة كبيرة وجاهزة! ضع الملابس أولًا 🧺', '🌀'); return; }
    if (!this.isStepDone('detergent')) { this.hint('أضف المسحوق أولًا 🧴'); this.game.audio.sfx('error'); return; }
    if (this.isStepDone('wash')) { this._hang(); return; }
    // start washing
    this._washing = true;
    this.step('wash');
    this.game.audio.sfx('washer');
    this.game.audio.startLoop('washer');
    this.hint('الغسالة تعمل… دوران ممتع! 🌀 (انتظر قليلًا)');
    setTimeout(() => {
      this._washing = false;
      this.game.audio.stopLoop('washer');
      this.game.audio.sfx('washerDone');
      this.game.rewards.toast('انتهى الغسيل! الملابس نظيفة ✨', '🫧', 'green');
      this.hint('اضغط الغسالة مجددًا لنشر الملابس 👕');
      this._washed = true;
    }, 4200);
  }

  _hang() {
    if (!this._washed || this.isStepDone('hang')) return;
    this._drumClothes.forEach((c) => c.visible = false);
    const cols = [0xef5350, 0xffca28, 0x66bb6a, 0x42a5f5];
    cols.forEach((c, i) => {
      setTimeout(() => {
        const cloth = box(.55, .5, .05, c);
        cloth.position.set(-2 + i * 1.3, 1.85, 3.8);
        this.group.add(cloth);
        this._hungCloth = this._hungCloth || [];
        this._hungCloth.push(cloth);
        this.game.audio.sfx('flip');
        this.game.fx.sparkles({ x: -2 + i * 1.3, y: 2.1, z: 3.8 }, 5);
        this._hung = i + 1;
        if (this._hung >= 4 && !this.isStepDone('hang')) {
          this.step('hang');
          this.game.rewards.celebrate('غسيل كامل منظم! 🧺✨', '🧺');
        }
      }, i * 350);
    });
  }
}
