// rooms/diningRoom.js — Baby Dining Room: sit the baby in a high chair,
// pick foods, feed with a spoon (chewing animation), give milk, wipe mouth.
import { RoomBase } from '../js/roomBase.js';
import * as THREE from 'three';
import { put, grp, box, cyl, sph, cone, torus, emojiSprite, textSprite, tableLow, smallChair, wallPicture, rug, ceilingLamp, mat } from '../js/kit.js';
import { tween, wait } from '../js/tween.js';

export const FOODS = [
  { id: 'banana',  emoji: '🍌', ar: 'موز',       bites: 3, hunger: 9 },
  { id: 'apple',   emoji: '🍎', ar: 'تفاح',      bites: 3, hunger: 9 },
  { id: 'strawb',  emoji: '🍓', ar: 'فراولة',    bites: 2, hunger: 7 },
  { id: 'soup',    emoji: '🍲', ar: 'شوربة',     bites: 4, hunger: 12 },
  { id: 'porr',    emoji: '🥣', ar: 'عصيدة',     bites: 4, hunger: 12 },
  { id: 'milk',    emoji: '🍼', ar: 'حليب',      bites: 1, hunger: 8, drink: true },
  { id: 'juice',   emoji: '🧃', ar: 'عصير',      bites: 1, hunger: 5, drink: true },
  { id: 'mash',    emoji: '🥔', ar: 'بطاطس مهروسة', bites: 3, hunger: 11 },
];

export class DiningRoom extends RoomBase {
  static def = {
    id: 'diningRoom', nameAr: 'غرفة الطعام', nameEn: 'Baby Dining Room', emoji: '🍽️',
    color: '#ff9f43', color2: '#ffc93c', music: 'kitchen', sky: 'indoor',
    rewardCoins: 15, rewardStars: 1, stat: 'feedings',
  };

  build() {
    const g = this.group;
    this.shell({ w: 10.5, d: 10.5, h: 4.5, floor: 0xffe0b2, wall: 0xfff3e0, wallLeft: 0xffe8d6, wainscot: 0xffcc80 });

    // two high chairs + a low table
    this.chair1 = this._highChair(0xff8fab);
    this.chair1.position.set(-1.3, 0, -.6);
    g.add(this.chair1);
    this.chair2 = this._highChair(0x80d8ff);
    this.chair2.position.set(1.3, 0, -.6);
    g.add(this.chair2);
    this.addHit(this.chair1, { label: 'كرسي الطعام', onClick: () => this._sitBaby() });

    const table = tableLow(2.6, 1.1, .55, 0xffb74d);
    table.position.set(0, 0, .9);
    g.add(table);
    // plates & cutlery on the table
    for (const x of [-.7, 0, .7]) {
      const plate = cyl(.26, .26, .03, 0xffffff);
      put(table, plate, x, .6, 0);
      const spoon = box(.05, .02, .25, 0xb0bec5);
      put(table, spoon, x + .3, .62, .2).rotation.y = .4;
    }
    put(table, cyl(.1, .12, .25, 0x81d4fa), 0, .73, -.25);   // water glass
    put(table, box(.3, .04, .3, 0xfff59f), -.35, .62, .3);   // napkins

    // food shelf with labeled jars
    const shelf = grp(g, 0, 2.2, -5.15);
    put(shelf, box(4.6, .1, .5, 0xffcc80), 0, 0, 0);
    FOODS.forEach((f, i) => {
      const jar = grp(shelf, -2 + i * .58, .45, 0);
      put(jar, cyl(.14, .16, .3, 0xfff8e1), 0, 0, 0);
      put(jar, emojiSprite(f.emoji, { size: .34 }), 0, .32, 0);
    });
    this.addHit(shelf, {
      label: 'رف الطعام',
      onClick: () => this._openFoodMenu(),
    });

    // decorations
    put(g, rug(3.6, 2.6, 0xffe0b2, { inner: 0xfff3e0 }), 0, 0, 1.4);
    put(g, wallPicture('🍎', .6, .5, 0xff8a65), -2.6, 3.1, -5.2);
    put(g, wallPicture('🥕', .6, .5, 0xffb74d), -1.6, 3.1, -5.2);
    put(g, wallPicture('🥦', .6, .5, 0x8bc34a), 1.6, 3.1, -5.2);
    put(g, ceilingLamp(0xffcc80), 0, 4.5, 0);
    const fridgeSign = textSprite('صحة وأمانة 🌟', { color: '#e65100', bg: 'rgba(255,255,255,.9)', fontPx: 48, height: .34 });
    fridgeSign.position.set(2.6, 3, -5.2);
    g.add(fridgeSign);

    // NPC baby already eating in chair 2
    this._npcFed = false;

    // spoon (flies to the baby's mouth)
    this.spoon = new THREE.Group();
    put(this.spoon, box(.05, .02, .3, 0xb0bec5), 0, 0, .12);
    put(this.spoon, sph(.07, 0xcfd8dc), 0, .01, -.05).scale.set(1, .4, 1.4);
    this.spoon.visible = false;
    g.add(this.spoon);

    this._seated = false;
    this._fedCount = 0;
    this._drank = false;
    this._wiped = false;

    this.setSteps([
      { id: 'sit', icon: '🪑', label: 'اجلس الطفل على كرسي الطعام' },
      { id: 'feed', icon: '🍎', label: 'أطعمه 3 لقمات' },
      { id: 'drink', icon: '🍼', label: 'أعطه الحليب أو العصير' },
      { id: 'wipe', icon: '🧻', label: 'امسح فمه بالمنديل' },
    ]);
  }

  enter() {
    this.addBaby(1.6, 2.2, Math.PI, 'idle');
    this._enableBabyDrag();
    const npc = this.addNPCBaby('toto', 1.3, -.6, Math.PI, 'eat');
    npc.setExpression('happy');
    this.hint('اضغط الكرسي الوردي لجلس الطفل 🪑');
  }

  _highChair(color) {
    const g = new THREE.Group();
    put(g, box(.55, .08, .55, color), 0, .55, 0);
    put(g, box(.55, .6, .08, color), 0, .85, -.26);
    put(g, box(.6, .07, .12, 0xffffff), 0, .75, .22);          // tray
    put(g, box(.55, .07, .12, 0xffffff), 0, .78, -.02);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      put(g, cyl(.04, .04, .55, 0x8d6e63), sx * .22, .28, sz * .22);
    return g;
  }

  _enableBabyDrag() {
    this.addHit(this.game.activeBaby, {
      label: 'اسحب الطفل إلى الكرسي',
      dragY: 0,
      onDragStart: () => this.game.activeBaby.animator.play('carried'),
      onDragMove: (pt) => this.game.activeBaby.position.set(
        Math.max(-4, Math.min(4, pt.x)), .45, Math.max(-4, Math.min(4.4, pt.z))),
      onDrop: () => {
        const b = this.game.activeBaby;
        if (Math.hypot(b.position.x + 1.3, b.position.z + .6) < 1) this._sitBaby();
        else { tween(b.position, { y: 0 }, { dur: .2 }); b.animator.play('idle'); }
      },
    });
  }

  _sitBaby() {
    if (this._seated) return;
    const b = this.game.activeBaby;
    this._seated = true;
    b.position.set(-1.3, .62, -.6);
    b.rotation.y = 0;
    b.animLock = 'eating';
    b.ai.setBusy('eating');
    b.animator.play('sit');
    b.setExpression('excited');
    this.game.audio.sfx('pop');
    this.game.fx.hearts({ x: -1.3, y: 1.8, z: -.6 }, 4);
    this.step('sit');
    this.hint('اضغط رف الطعام واختر أطعمة لذيذة 🍎');
    // sitting babies chew idle: little food bubble
    b.showBubble('😋', 2);
  }

  _openFoodMenu() {
    if (!this._seated) { this.game.audio.sfx('error'); this.hint('اجلس الطفل على الكرسي أولًا 🪑'); return; }
    const g = this.game;
    const grid = document.createElement('div');
    grid.className = 'map-grid';
    grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    for (const f of FOODS) {
      const btn = document.createElement('button');
      btn.className = 'room-card';
      btn.style.background = f.drink ? 'linear-gradient(135deg,#4fc3f7,#81d4fa)' : 'linear-gradient(135deg,#ffb74d,#ffcc80)';
      btn.innerHTML = `<span class="rc-emoji">${f.emoji}</span><span>${f.ar}</span>`;
      btn.onclick = () => { g.audio.sfx('click'); close(); this._feed(f); };
      grid.appendChild(btn);
    }
    const close = g.ui.modal({ title: 'اختر طعامًا 🍽️', icon: '🍽️', body: grid });
  }

  _feed(food) {
    const b = this.game.activeBaby;
    if (food.drink) {
      if (this.isStepDone('drink')) { this.game.audio.sfx('pop'); return; }
      // bottle drinking
      this._drank = true;
      b.animator.play('drink');
      b.setExpression('happy', true);
      this.game.audio.sfx('drink');
      const bottle = emojiSprite(food.emoji, { size: .5 });
      bottle.position.set(b.position.x + .35, b.position.y + 1.35, b.position.z + .4);
      this.group.add(bottle);
      tween(bottle.position, { x: b.position.x + .18, y: b.position.y + 1.5, z: b.position.z + .32 }, { dur: .5 });
      setTimeout(() => this.group.remove(bottle), 1600);
      b.ai.apply({ hunger: food.hunger, happiness: 4 });
      this.game.fx.hearts({ x: b.position.x, y: 1.9, z: b.position.z }, 3);
      setTimeout(() => {
        b.animator.play('sit');
        this.step('drink');
        this.hint('أطعمه لقمات أخرى أو امسح فمه 🧻');
      }, 1500);
      return;
    }
    if (this.isStepDone('feed')) { this.game.audio.sfx('pop'); this.game.rewards.toast('شبع لحدود! 🌟', '😋'); return; }
    // spoon flies from table to mouth
    const start = { x: b.position.x + .9, y: .75, z: b.position.z + .5 };
    this.spoon.position.set(start.x, start.y, start.z);
    this.spoon.visible = true;
    const target = { x: b.position.x, y: b.position.y + 1.42, z: b.position.z + .42 };
    tween(this.spoon.position, { x: target.x, y: target.y + .3, z: target.z }, {
      dur: .35,
      onDone: () => tween(this.spoon.position, { x: target.x, y: target.y, z: target.z }, {
        dur: .2,
        onDone: () => {
          // bite!
          b.setExpression('happy', true);
          this.game.audio.sfx('munch');
          b.ai.apply({ hunger: food.hunger, happiness: 3, comfort: 2 });
          this._fedCount++;
          this.game.fx.hearts({ x: b.position.x, y: 1.8, z: b.position.z }, 2);
          // chew wobble
          tween(b.animator, { t: b.animator.t }, { dur: .01 });
          setTimeout(() => {
            this.spoon.visible = false;
            b.setExpression('excited');
          }, 500);
          if (this._fedCount >= 3) {
            this.step('feed');
            this.hint('الآن أعطه الحليب 🍼 من قائمة الطعام');
          }
        },
      }),
    });
  }

  _wipe() {
    const b = this.game.activeBaby;
    this.game.audio.sfx('flip');
    this.game.fx.sparkles({ x: b.position.x, y: 1.45, z: b.position.z + .3 }, 6);
    b.setExpression('happy');
    b.ai.apply({ hygiene: 8, comfort: 4 });
    this.step('wipe');
    this.game.rewards.toast('وجه نظيف وأكياس ممتلئة! 😊', '🧻', 'green');
    b.animLock = null;
    b.ai.setBusy(null);
    setTimeout(() => { b.animator.play('laugh', { loop: false, onDone: () => b.animator.play('idle') }); this.game.audio.sfx('laugh'); }, 600);
  }

  // wire wipe via a napkin on the table
  _addWipeHit() {}

  onAllStepsDone() {
    this.hint('وجبة شهية اكتملت! 🍽️ الطفل شبعان وسعيد');
    setTimeout(() => this.hint(null), 4000);
  }

  update(dt, time) {
    // napkin interaction: allow wiping whenever feed+drink done
    if (this.isStepDone('feed') && !this.isStepDone('wipe') && !this._wipeHit) {
      const napkin = put(this.group, box(.34, .05, .34, 0xffffff), -.35, .68, .9);
      const sign = emojiSprite('🧻', { size: .4 });
      sign.position.set(-.35, 1, .9);
      this.group.add(sign);
      this.addHit(napkin, {
        label: 'منديل (امسح الفم)',
        onClick: () => this._wipe(),
      });
      this._wipeHit = true;
    }
  }
}
