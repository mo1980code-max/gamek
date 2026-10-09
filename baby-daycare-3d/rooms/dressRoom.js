// rooms/dressRoom.js — Baby Dress Up Room: wardrobe with 30 shirts, 20 pants,
// 20 dresses, 15 hats, 20 shoes, 15 glasses, 10 hair accessories, 10 pajamas
// and 10 costumes. 360° turntable + photo camera. Clothes really change the 3D mesh.
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, cone, torus, mirror, emojiSprite, textSprite, rug, ceilingLamp, mat, shelfUnit } from '../js/kit.js';
import { BABIES } from '../js/baby.js';

const C30 = [0xef5350, 0xf06292, 0xba68c8, 0x9575cd, 0x7986cb, 0x64b5f6, 0x4fc3f7, 0x4db6ac, 0x81c784, 0xaed581,
  0xdce775, 0xffd54f, 0xffb74d, 0xff8a65, 0xff8fab, 0xf48fb1, 0xce93d8, 0xb39ddb, 0x90caf9, 0x81d4fa,
  0x80cbc4, 0xa5d6a7, 0xc5e1a5, 0xfff59d, 0xffcc80, 0xffab91, 0xbcaaa4, 0xb0bec5, 0xe6ee9c, 0xff7043];
const C20 = [0xe53935, 0xd81b60, 0x8e24aa, 0x5e35b1, 0x3949ab, 0x1e88e5, 0x039be5, 0x00acc1, 0x43a047, 0x7cb342,
  0xc0ca33, 0xfdd835, 0xffb300, 0xfb8c00, 0xf4511e, 0x6d4c41, 0x546e7a, 0x26a69a, 0xec407a, 0xffca28];
const HAT_KINDS = ['cap', 'beanie', 'bow', 'crown', 'party', 'bunny', 'cowboy', 'nightcap'];
const HAT_COLORS = [0xef5350, 0xffd54f, 0x42a5f5, 0x66bb6a, 0xf06292, 0xff9800, 0x9c27b0, 0xffffff];
const GL_COLORS = [0xef5350, 0xffd54f, 0x42a5f5, 0x66bb6a, 0xff9800, 0x9c27b0, 0x37474f];

function buildWardrobe() {
  const items = [];
  // 30 shirts
  C30.forEach((c, i) => items.push({ id: `sh${i}`, cat: 'shirt', art: '👕', name: `قميص ${i + 1}`, patch: { top: c, dress: false }, cost: 0 }));
  // 20 pants
  C20.forEach((c, i) => items.push({ id: `pa${i}`, cat: 'pants', art: '👖', name: `بنطال ${i + 1}`, patch: { bottom: c, dress: false }, cost: 0 }));
  // 20 dresses
  C30.slice(0, 20).forEach((c, i) => items.push({ id: `dr${i}`, cat: 'dress', art: '👗', name: `فستان ${i + 1}`, patch: { dress: true, top: c, bottom: C20[(i + 7) % 20] }, cost: 0 }));
  // 15 hats
  for (let i = 0; i < 15; i++) {
    const kind = HAT_KINDS[i % HAT_KINDS.length];
    const color = HAT_COLORS[i % HAT_COLORS.length];
    items.push({ id: `ha${i}`, cat: 'hat', art: '🧢', name: 'قبعة', patch: { hat: kind, hatColor: color }, cost: i >= 8 ? 25 : 0 });
  }
  // 20 shoes
  C20.forEach((c, i) => items.push({ id: `sho${i}`, cat: 'shoes', art: '👟', name: `حذاء ${i + 1}`, patch: { shoes: c }, cost: 0 }));
  // 15 glasses
  for (let i = 0; i < 15; i++) {
    items.push({
      id: `gl${i}`, cat: 'glasses', art: i % 2 ? '🕶️' : '👓', name: i % 2 ? 'نظارة شمسية' : 'نظارة',
      patch: { glasses: i % 2 ? 'sun' : 'round' }, cost: i >= 10 ? 20 : 0,
    });
  }
  // 10 hair accessories (bows)
  C30.slice(0, 10).forEach((c, i) => items.push({ id: `hr${i}`, cat: 'hair', art: '🎀', name: 'فيونكة', patch: { hat: 'bow', hatColor: c }, cost: 0 }));
  // 10 pajamas
  for (let i = 0; i < 10; i++) {
    items.push({
      id: `pj${i}`, cat: 'pajamas', art: '🩳', name: 'بيجامة نوم',
      patch: { top: C30[i + 8], bottom: C20[(i + 3) % 20], dress: false, hat: i % 2 ? 'nightcap' : 'none', hatColor: C30[i + 12], shoes: 0xdddddd },
      cost: i >= 5 ? 20 : 0,
    });
  }
  // 10 costumes
  const costumes = [
    { art: '🐰', name: 'أرنب', patch: { hat: 'bunny', hatColor: 0xffffff, top: 0xffffff, bottom: 0xffcdd2, dress: false, cape: null } },
    { art: '🦸', name: 'بطل خارق', patch: { cape: true, capeColor: 0xe53935, top: 0x1e88e5, bottom: 0x0d47a1, dress: false, glasses: 'sun' } },
    { art: '🤡', name: 'مهرج', patch: { hat: 'party', hatColor: 0xf4511e, top: 0xffd54f, bottom: 0x8e24aa, dress: false } },
    { art: '🤠', name: 'راعي البقر', patch: { hat: 'cowboy', hatColor: 0x8d6e63, top: 0x795548, bottom: 0x4e342e, dress: false } },
    { art: '👑', name: 'أمير/أميرة', patch: { hat: 'crown', dress: true, top: 0xf48fb1, bottom: 0xce93d8, cape: true, capeColor: 0xffd54f } },
    { art: '🧚', name: 'جنية', patch: { dress: true, top: 0xb2ff59, bottom: 0x64dd17, cape: true, capeColor: 0xb9f6ca, hat: 'bow', hatColor: 0xffd740 } },
    { art: '🐝', name: 'نحلة', patch: { top: 0xffd600, bottom: 0x212121, dress: false, hat: 'bunny', hatColor: 0x212121 } },
    { art: '🎃', name: 'قرع حلوى', patch: { top: 0xff6f00, bottom: 0xe65100, dress: false, hat: 'party', hatColor: 0x33691e } },
    { art: '🧜', name: 'حورية/عفريت البحر', patch: { dress: true, top: 0x4dd0e1, bottom: 0x00acc1, cape: null, hat: 'star' === 'x' ? 'bow' : 'none' } },
    { art: '🦸‍♀️', name: 'بطلة خارقة', patch: { cape: true, capeColor: 0xd500f9, dress: true, top: 0x7c4dff, bottom: 0x651fff, glasses: 'sun' } },
  ];
  costumes.forEach((c, i) => items.push({ id: `co${i}`, cat: 'costume', art: c.art, name: c.name, patch: c.patch, cost: 40 + i * 5 }));
  return items;
}

const CATS = [
  { id: 'shirt', ar: 'قمصان', emoji: '👕' },
  { id: 'pants', ar: 'بناطيل', emoji: '👖' },
  { id: 'dress', ar: 'فساتين', emoji: '👗' },
  { id: 'hat', ar: 'قبعات', emoji: '🧢' },
  { id: 'shoes', ar: 'أحذية', emoji: '👟' },
  { id: 'glasses', ar: 'نظارات', emoji: '👓' },
  { id: 'hair', ar: 'إكسسوار الشعر', emoji: '🎀' },
  { id: 'pajamas', ar: 'ملابس نوم', emoji: '🌙' },
  { id: 'costume', ar: 'أزياء تنكرية', emoji: '🦸' },
];

export class DressRoom extends RoomBase {
  static def = {
    id: 'dressRoom', nameAr: 'غرفة الملابس', nameEn: 'Dress Up Room', emoji: '👕',
    color: '#ff6b6b', color2: '#ff6fb5', music: 'play', sky: 'indoor',
    rewardCoins: 12, rewardStars: 1,
  };

  constructor(game) {
    super(game);
    this.items = buildWardrobe();
  }

  build() {
    const g = this.group;
    this.shell({ w: 10, d: 10, h: 4.6, floor: 0xffd9e2, wall: 0xfff0f5, wallLeft: 0xfde8f0, wainscot: 0xffa8c5 });

    // wardrobe furniture
    const wardrobe = grp(g, -4.5, 0, -1);
    wardrobe.rotation.y = Math.PI / 2;
    put(wardrobe, box(3.4, 3.2, .6, 0xf06292), 0, 1.6, 0);
    for (let i = 0; i < 3; i++) {
      put(wardrobe, box(1.55, 1, .05, 0xf8bbd0), -.85, 2.1 - i * 1.05, .33);
      put(wardrobe, box(1.55, 1, .05, 0xf8bbd0), .85, 2.1 - i * 1.05, .33);
      put(wardrobe, sph(.05, 0xffd54f), -.15, 2.1 - i * 1.05, .37);
      put(wardrobe, sph(.05, 0xffd54f), .15, 2.1 - i * 1.05, .37);
    }
    this.addHit(wardrobe, { label: 'خزانة الملابس', onClick: () => this.openWardrobe() });

    // open shelf with folded clothes
    const sh = shelfUnit(1.8, 1.8, 0xffb74d, 3);
    sh.position.set(4.4, 0, -.6);
    sh.rotation.y = -Math.PI / 2;
    g.add(sh);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      put(sh, box(.55, .18, .4, C30[(r * 2 + c) % C30.length]), -.4 + c * .8, .35 + r * .6, 0);
    }
    this.addHit(sh, { label: 'ملابس مطوية', onClick: () => this.openWardrobe() });

    // turntable platform
    this.platform = grp(g, 0, 0, 0);
    put(this.platform, cyl(1.5, 1.6, .18, 0xffffff), 0, .09, 0);
    put(this.platform, cyl(1.2, 1.3, .2, 0xff8fab), 0, .1, 0);
    this.addHit(this.platform, {
      label: 'منصة الدوران (اسحب للتدوير)',
      dragY: null,
      onDragStart: () => {},
      onDragMove: (pt, dx) => this._rotate(dx),
      onDrop: () => { if (!this.isStepDone('spin') && Math.abs(this._spinAcc) > 3) { this.step('spin'); this.hint('الآن التقط صورة تذكارية 📸'); } },
    });

    // camera prop
    const cam = grp(g, 3.2, 0, 3.4);
    put(cam, box(.5, .34, .3, 0x546e7a), 0, 1, 0);
    put(cam, cyl(.12, .14, .18, 0x263238), 0, 1, .22).rotation.x = Math.PI / 2;
    put(cam, sph(.06, 0xff5252, { mat: mat(0xff5252, { emissive: 0xff5252, emissiveIntensity: 1 }) }), .18, 1.2, .1);
    put(cam, cyl(.06, .08, .5, 0x78909c), 0, .7, 0);
    this.addHit(cam, {
      label: 'كاميرا التصوير',
      onClick: () => this._photo(),
    });

    // mirror + decor
    const mir = mirror(1.5, 2, 0xffc1e3);
    mir.position.set(-2.9, 2.1, 4.6);
    g.add(mir);
    put(g, rug(3.4, 3, 0xffc1e3, { inner: 0xffe4f1 }), 0, 0, 0);
    put(g, ceilingLamp(0xf48fb1), 0, 4.55, 0);
    const sign = textSprite('أزياء الحضانة 👗', { color: '#c2185b', bg: 'rgba(255,255,255,.92)', fontPx: 54, height: .4 });
    sign.position.set(0, 3.6, -4.93);
    g.add(sign);

    this._spinAcc = 0;
    this._worn = 0;
    this.setSteps([
      { id: 'wear', icon: '👕', label: 'البس 3 قطع من الخزانة' },
      { id: 'spin', icon: '🔄', label: 'أدر الشخصية 360°' },
      { id: 'photo', icon: '📸', label: 'التقط صورة' },
    ]);
  }

  enter() {
    const baby = this.addBaby(0, 0, 0, 'idle');
    baby.position.y = .19; // stand on the platform
    this.hint('افتح الخزانة الوردية واختر أزياء رائعة! 👗');
  }

  _rotate(dx) {
    const baby = this.game.activeBaby;
    baby.rotation.y += dx * .012;
    this.platform.rotation.y += dx * .004;
    this._spinAcc += dx * .012;
  }

  openWardrobe() {
    const g = this.game;
    let cat = 'shirt';
    const wrap = document.createElement('div');
    const catsRow = document.createElement('div');
    catsRow.className = 'wd-cats';
    const itemsRow = document.createElement('div');
    itemsRow.className = 'wd-items';
    wrap.append(catsRow, itemsRow);

    const owned = g.save.data.wardrobeUnlocked;
    const render = () => {
      catsRow.innerHTML = '';
      for (const c of CATS) {
        const b = document.createElement('button');
        b.className = 'wd-cat' + (c.id === cat ? ' sel' : '');
        b.textContent = `${c.emoji} ${c.ar}`;
        b.onclick = () => { cat = c.id; g.audio.sfx('click'); render(); };
        catsRow.appendChild(b);
      }
      itemsRow.innerHTML = '';
      for (const it of this.items.filter(i => i.cat === cat)) {
        const locked = it.cost > 0 && !owned[it.id];
        const d = document.createElement('button');
        d.className = 'wd-item' + (locked ? ' locked' : '');
        d.innerHTML = `<div class="wi-art">${it.art}</div><div class="wi-name">${locked ? `🔒 ${it.cost}🪙` : it.name}</div>`;
        const sw = it.patch.top ?? it.patch.bottom ?? it.patch.hatColor ?? it.patch.shoes;
        if (sw !== undefined) d.querySelector('.wi-art').style.textShadow = `0 0 6px #${sw.toString(16).padStart(6, '0')}`;
        d.onclick = () => {
          if (locked) {
            if (g.rewards.spend(it.cost)) {
              owned[it.id] = true;
              g.rewards.toast(`اشتريت ${it.name}! ${it.art}`, '🛍️', 'gold');
              this._apply(it);
              render();
            }
            return;
          }
          this._apply(it);
          render();
        };
        itemsRow.appendChild(d);
      }
    };
    render();
    g.ui.modal({ title: `خزانة ${this.game.activeBaby.cfg.nameAr} 👚`, icon: '👕', body: wrap, wide: true });
  }

  _apply(item) {
    const baby = this.game.activeBaby;
    Object.assign(baby.outfit, JSON.parse(JSON.stringify(item.patch)));
    if (item.patch.cape === null) baby.outfit.cape = null;
    baby.applyOutfit();
    // persist
    this.game.save.data.outfits[baby.babyId] = { ...baby.outfit };
    this.game.save.save();
    this.game.audio.sfx('magic');
    this.game.fx.sparkles({ x: baby.position.x, y: 1.4, z: baby.position.z }, 12);
    baby.setExpression('excited');
    baby.ai.apply({ happiness: 5, comfort: 3 });
    this._worn++;
    if (this._worn >= 3 && !this.isStepDone('wear')) {
      this.step('wear');
      this.hint('اسحب أفقيًا لتدوير الشخصية 360° 🔄');
    }
  }

  _photo() {
    const baby = this.game.activeBaby;
    baby.animator.play('clap', { loop: false, onDone: () => baby.animator.play('idle') });
    this.game.audio.sfx('camera');
    setTimeout(() => {
      const url = this.game.scenes.snapshot();
      this.game.ui.photoModal(url, `أزياء ${baby.cfg.nameAr}`);
      this.step('photo');
      this.game.rewards.confetti();
    }, 350);
  }

  onAllStepsDone() {
    this.game.rewards.toast('إطلالة رائعة! أنيق جدًا 👑', '✨', 'gold');
  }
}
