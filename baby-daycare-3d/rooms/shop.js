// rooms/shop.js — Baby Shop: four isles (clothes, toys, food, decor).
// Coins earned from activities buy real items that appear in other rooms.
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, shelfUnit, teddy, toyBall, block, emojiSprite, textSprite, mat, doorMesh } from '../js/kit.js';

// shop catalog — `effect` describes where the item appears once owned
export const SHOP_ITEMS = [
  { id: 'balloons',  cat: 'decor', emoji: '🎈', ar: 'حزمة بالونات',   desc: 'تظهر في الصالة وغرفة العيد', cost: 30 },
  { id: 'plantDecor',cat: 'decor', emoji: '🪴', ar: 'نبتة كبيرة',     desc: 'تزين صالة الحضانة', cost: 25 },
  { id: 'starLights',cat: 'decor', emoji: '✨', ar: 'أضواء النجوم',   desc: 'نجوم مضيئة في غرفة النوم', cost: 35 },
  { id: 'toybox',    cat: 'toys',  emoji: '🧸', ar: 'صندوق ألعاب',    desc: 'ألعاب إضافية في غرفة الألعاب', cost: 40 },
  { id: 'duckFleet', cat: 'toys',  emoji: '🦆', ar: 'أسطول البطّ', desc: 'بطات إضافية في المسبح', cost: 30 },
  { id: 'premiumDress', cat: 'clothes', emoji: '👗', ar: 'فستان الأميرات', desc: 'يفتح أزياء مميزة في الملابس', cost: 60 },
  { id: 'partyPack', cat: 'decor', emoji: '🎉', ar: 'عدة احتفال',     desc: 'زينة إضافية لغرفة أعياد الميلاد', cost: 45 },
  { id: 'cookieJar', cat: 'food',  emoji: '🍪', ar: 'براد كوكيز',     desc: 'وصفة بسكويت إضافية بالمطبخ', cost: 35 },
  { id: 'petToys',   cat: 'toys',  emoji: '🎾', ar: 'ألعاب الحيوانات', desc: 'كرات لعب لغرفة الحيوانات', cost: 30 },
];

export class Shop extends RoomBase {
  static def = {
    id: 'shop', nameAr: 'متجر الأطفال', nameEn: 'Baby Shop', emoji: '🛒',
    color: '#ffb300', color2: '#ff7043', music: 'menu', sky: 'indoor',
    rewardCoins: 5, rewardStars: 0,
  };

  build() {
    const g = this.group;
    this.shell({ w: 11, d: 10, h: 4.6, floor: 0xffe0b2, wall: 0xfff3e0, wallLeft: 0xfff8ee, wainscot: 0xffcc80 });

    // counter + cashier
    const counter = grp(g, 3.4, 0, -3.4);
    put(counter, box(2.2, 1, .9, 0xffb74d), 0, .5, 0);
    put(counter, box(2.3, .08, 1, 0xffcc80), 0, 1.03, 0);
    put(counter, emojiSprite('💵', { size: .34 }), -.6, 1.25, 0);
    this.addHit(counter, { label: 'الكاشير', onClick: () => this._openShop() });

    // four isles
    const isleData = [
      { cat: 'clothes', emoji: '👕', x: -3.4, z: -2.6, color: 0xf06292 },
      { cat: 'toys', emoji: '🧸', x: 0, z: -2.6, color: 0x4fc3f7 },
      { cat: 'food', emoji: '🍎', x: -3.4, z: 1.6, color: 0xffca28 },
      { cat: 'decor', emoji: '🎈', x: 0, z: 1.6, color: 0xba68c8 },
    ];
    for (const isle of isleData) {
      const unit = grp(g, isle.x, 0, isle.z);
      put(unit, box(1.8, 1.5, .9, 0x90a4ae), 0, .75, 0);
      put(unit, box(1.9, .06, 1, 0xb0bec5), 0, .8, 0);
      put(unit, box(1.9, .06, 1, 0xb0bec5), 0, 1.5, 0);
      const sign = emojiSprite(isle.emoji, { size: .5 });
      sign.position.set(0, 2, 0);
      unit.add(sign);
      // sample goods
      if (isle.cat === 'toys') {
        put(unit, teddy(0xf48fb1), -.4, .95, 0);
        put(unit, toyBall(.15, 0x66bb6a), .4, 1, 0);
        put(unit, block(.24, 0xffca28, 'S'), 0, 1.65, 0);
      } else if (isle.cat === 'food') {
        put(unit, emojiSprite('🍪', { size: .34 }), -.4, 1.68, 0);
        put(unit, emojiSprite('🧃', { size: .34 }), .4, 1.68, 0);
      } else if (isle.cat === 'decor') {
        put(unit, emojiSprite('🎈', { size: .36 }), -.4, 1.68, 0);
        put(unit, emojiSprite('✨', { size: .34 }), .4, 1.68, 0);
      } else {
        put(unit, emojiSprite('👗', { size: .36 }), -.4, 1.68, 0);
        put(unit, emojiSprite('🧢', { size: .34 }), .4, 1.68, 0);
      }
      this.addHit(unit, {
        label: `قسم ${isle.cat === 'clothes' ? 'الملابس' : isle.cat === 'toys' ? 'الألعاب' : isle.cat === 'food' ? 'الطعام' : 'الديكور'}`,
        onClick: () => this._openShop(isle.cat),
      });
    }

    // exit door
    const door = doorMesh(0x80cbc4, 1.2, 2.2, '🚪');
    door.position.set(0, 0, 4.9);
    g.add(door);
    this.addHit(door, {
      label: 'العودة للصالة',
      onClick: () => { this.game.audio.sfx('doorClose'); this.game.gotoHall(); },
    });

    const sign = textSprite('متجر الحضانة 🛒', { color: '#e65100', bg: 'rgba(255,255,255,.92)', fontPx: 52, height: .38 });
    sign.position.set(0, 3.7, -5.4);
    g.add(sign);
    put(g, sph(.3, 0xffca28, { mat: mat(0xffca28, { emissive: 0xffca28, emissiveIntensity: .3 }) }), -4.6, 2.8, 3.8);
    put(g, textSprite('🪙', { fontPx: 80, height: .5 }), -4.6, 3.4, 3.8);

    this.setSteps([
      { id: 'buy', icon: '🛍️', label: 'اشترِ أي عنصر بالعملات' },
    ]);
  }

  enter() {
    this.addBaby(1.4, 2.6, Math.PI, 'idle');
    this.hint('اجمع العملات من الأنشطة ثم اشترِ الأشياء هنا! 🪙');
    if (this.game.save.data.coins >= 25) this.step('buy');
  }

  _openShop(cat = null) {
    const g = this.game;
    const owned = g.save.data.owned;
    const wrap = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    const render = () => {
      grid.innerHTML = '';
      for (const it of SHOP_ITEMS) {
        if (cat && it.cat !== cat) continue;
        const card = document.createElement('div');
        card.className = 'shop-card';
        const isOwned = owned[it.id];
        card.innerHTML = `
          <span class="s-emoji">${it.emoji}</span>
          <span class="s-name">${it.ar}</span>
          <span class="s-desc">${it.desc}</span>`;
        const btn = document.createElement('button');
        btn.className = 'buy-btn' + (isOwned ? ' owned' : '');
        btn.textContent = isOwned ? '✔ تملكه' : `${it.cost} 🪙`;
        btn.onclick = () => {
          if (isOwned) return;
          if (g.rewards.spend(it.cost)) {
            owned[it.id] = true;
            g.save.save();
            g.audio.sfx('unlock');
            g.rewards.confetti();
            g.rewards.toast(`تم الشراء: ${it.ar}! ${it.emoji}`, '🛍️', 'gold');
            // apply decorations live
            const hall = g._roomCache.get('mainHall');
            if (hall?._built) hall.refreshDecor();
            const play = g._roomCache.get('playroom');
            if (play?._built) play.refreshDecor();
            this.step('buy');
            render();
          }
        };
        card.appendChild(btn);
        grid.appendChild(card);
      }
    };
    render();
    const note = document.createElement('div');
    note.style.cssText = 'margin-top:10px;text-align:center;font-weight:800;color:#8a6fc0';
    note.textContent = 'كل العملات مكتسبة من اللعب — لا مشتريات حقيقية 💛';
    wrap.append(grid, note);
    g.ui.modal({ title: `متجر الحضانة — لديك ${g.save.data.coins} 🪙`, icon: '🛒', body: wrap, wide: true });
  }
}
