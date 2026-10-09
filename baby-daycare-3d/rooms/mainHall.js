// rooms/mainHall.js — Main Daycare Hall: the hub. Reception desk, sofa, TV,
// task board, doors to every room, babies playing, shop decorations appear here.
import { RoomBase } from '../js/roomBase.js';
import * as THREE from 'three';
import { put, grp, box, cyl, sph, cone, capsule, doorMesh, wallClock, pottedPlant, wallPicture, rug, teddy, bookStack, emojiSprite, textSprite, toyBall, block, mat } from '../js/kit.js';
import { ROOM_DEFS } from './index.js';

export class MainHall extends RoomBase {
  static def = {
    id: 'mainHall', nameAr: 'صالة الحضانة', nameEn: 'Main Hall', emoji: '🏡',
    color: '#7c4dff', color2: '#448aff', music: 'menu', sky: 'indoor',
    rewardCoins: 5, rewardStars: 0,
  };

  build() {
    const g = this.group;
    this.shell({ w: 12, d: 12, h: 4.8, floor: 0xffe8cf, wall: 0xfff1e0, wallLeft: 0xf6e7ff, wainscot: 0x9ad8f5, trim: 0xffffff });

    // ---------- reception desk ----------
    const desk = grp(g, 3.6, 0, -4.6);
    put(desk, box(2.4, 1, .8, 0xffb74d), 0, .5, 0);
    put(desk, box(2.5, .1, .9, 0xffcc80), 0, 1.03, 0);
    put(desk, sph(.16, 0xffd54f), -.8, 1.14, 0);   // bell
    this.addHit(desk.children[2], {
      label: 'جرس الاستقبال',
      onClick: () => { this.game.audio.sfx('belltoy'); this.game.rewards.toast('أهلاً وسهلاً في حضانة بيبي جيني! 🌈', '🔔'); },
    });

    // ---------- caretaker NPC ----------
    const nanny = this._makeNanny();
    put(g, nanny, -3.4, 0, -4.2, .3);

    // ---------- sofa + rug ----------
    const sofa = grp(g, -3.6, 0, 2.6);
    put(sofa, box(2.6, .55, 1, 0xf06292), 0, .32, 0);
    put(sofa, box(2.6, .7, .25, 0xf06292), 0, .8, -.4);
    put(sofa, box(.25, .55, 1, 0xf06292), -1.2, .62, 0);
    put(sofa, box(.25, .55, 1, 0xf06292), 1.2, .62, 0);
    put(sofa, box(.9, .35, .18, 0xf8bbd0), -.6, .68, -.12).rotation.x = -.3;
    put(sofa, box(.9, .35, .18, 0xfff9c4), .6, .68, -.12).rotation.x = -.3;
    this.addHit(sofa, { label: 'الأريكة', onClick: () => { this.game.audio.sfx('pop'); this.game.rewards.toast('أريكة مريحة للجلوس والقراءة 📖', '🛋️'); } });
    const r = rug(4.4, 3.2, 0xffc2dd, { dots: true, inner: 0xffe3f0 });
    put(g, r, -3.6, 0, 2.6);

    // ---------- TV (animated screen) ----------
    const tv = grp(g, 3.6, 0, 3.8);
    put(tv, box(1.7, 1.1, .12, 0x37474f), 0, 1.5, 0);
    const screenCv = document.createElement('canvas');
    screenCv.width = 256; screenCv.height = 160;
    this._tvCtx = screenCv.getContext('2d');
    this._tvTex = new THREE.CanvasTexture(screenCv);
    this._tvTex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .92), new THREE.MeshBasicMaterial({ map: this._tvTex }));
    screen.position.set(0, 1.5, .07);
    tv.add(screen);
    put(tv, box(.5, .1, .5, 0x546e7a), 0, .05, 0);
    put(tv, box(.16, .8, .16, 0x546e7a), 0, .45, 0);
    this._tvT = 0;
    this.addHit(screen, {
      label: 'التلفاز',
      onClick: () => {
        this._tvOn = !this._tvOn;
        this.game.audio.sfx('toggle');
        this.game.rewards.toast(this._tvOn ? 'شغّلنا كرتون الأطفال! 📺' : 'أطفأنا التلفاز.', '📺');
      },
    });
    this._tvOn = true;

    // ---------- task board ----------
    const board = grp(g, 0, 1.9, -5.9);
    put(board, box(2.6, 1.6, .08, 0x8d6e63), 0, 0, 0);
    put(board, box(2.4, 1.4, .06, 0xfff8e1), 0, 0, .05);
    const t1 = textSprite('📋 المهام اليومية', { color: '#5b2bd6', fontPx: 52, height: .3 });
    t1.position.set(0, .35, .09); board.add(t1);
    for (let i = 0; i < 3; i++) {
      put(board, box(.6, .3, .02, [0xff8fab, 0x80d8ff, 0xffd54f][i]), -.7 + i * .7, -.2, .09);
    }
    this.addHit(board, {
      label: 'لوحة المهام',
      onClick: () => { this.game.audio.sfx('click'); this.game.ui.openTasks(); },
    });

    // ---------- room map board (doors to all rooms) ----------
    const mapBoard = grp(g, 0, 1.9, 5.86);
    mapBoard.rotation.y = Math.PI;
    put(mapBoard, box(2.8, 1.7, .08, 0x5c6bc0), 0, 0, 0);
    put(mapBoard, box(2.6, 1.5, .06, 0xe8eaf6), 0, 0, .05);
    const mt = textSprite('🗺️ خريطة الغرف', { color: '#283593', fontPx: 50, height: .3 });
    mt.position.set(0, .35, .09); mt.rotation.y = Math.PI; mapBoard.add(mt);
    const me = emojiSprite('🚪', { size: .55 });
    me.position.set(0, -.25, .09); mapBoard.add(me);
    this.addHit(mapBoard, {
      label: 'اذهب إلى غرفة',
      onClick: () => { this.game.audio.sfx('click'); this.game.ui.openMap(); },
    });

    // ---------- sample doors to key rooms ----------
    const doorDefs = [
      { id: 'bedroom', x: -5.94, z: -1.8, ry: Math.PI / 2 },
      { id: 'bathroom', x: -5.94, z: 1.8, ry: Math.PI / 2 },
      { id: 'diningRoom', x: 5.94, z: -1.8, ry: -Math.PI / 2 },
      { id: 'playroom', x: 5.94, z: 1.8, ry: -Math.PI / 2 },
    ];
    for (const dd of doorDefs) {
      const rd = ROOM_DEFS.find(r => r.id === dd.id);
      const door = doorMesh(0x90caf9, 1.15, 2.2, rd.emoji);
      door.position.set(dd.x, 0, dd.z);
      door.rotation.y = dd.ry;
      g.add(door);
      this.addHit(door, {
        label: rd.nameAr,
        onClick: () => { this.game.audio.sfx('doorOpen'); this.game.enterRoom(dd.id); },
      });
    }

    // ---------- plants, clock, photos, toys ----------
    put(g, pottedPlant(1.2), -5.4, 0, -5.4);
    put(g, pottedPlant(1), 5.4, 0, -5.4);
    const clock = wallClock();
    clock.position.set(2.2, 3.3, -5.93);
    g.add(clock);
    this._clockHands = clock.userData;
    const photos = grp(g, -2.2, 2.9, -5.93);
    ['👦', '👧', '👶'].forEach((e, i) => {
      const p = wallPicture(e, .55, .55, [0xff8fab, 0x80d8ff, 0xffd54f][i]);
      p.position.set(i * .75 - .75, 0, 0);
      photos.add(p);
    });
    put(g, teddy(), -1.6, 0, 4.6, .5);
    put(g, toyBall(.3, 0xff7043), -.6, .3, 4.9);
    put(g, block(.3, 0x42a5f5, 'A'), .1, .15, 4.5);
    put(g, block(.26, 0xef5350, 'B'), .45, .13, 4.8).rotation.y = .5;
    put(g, bookStack(3), 1.2, 0, 4.7);

    this._decorRefs = {};
    this.refreshDecor();

    // ceiling lamp + warm light
    const lamp = put(g, cone(.8, .6, 0xff8fab, { open: true }), 0, 4.5, 0);
    lamp.rotation.x = Math.PI;
    put(g, sph(.16, 0xfffde7, { mat: mat(0xfffde7, { emissive: 0xfff176, emissiveIntensity: 1 }) }), 0, 4.3, 0);

    this.setSteps([
      { id: 'select', icon: '👶', label: 'اختر طفلك من الزر أسفل الشاشة' },
      { id: 'map', icon: '🗺️', label: 'افتح خريطة الغرف من اللوحة' },
      { id: 'tasks', icon: '📋', label: 'ألهم على لوحة المهام' },
    ]);
  }

  enter() {
    // babies: the selected one front and center, others playing around
    const me = this.addBaby(-.8, 2.2, .4, 'idle');
    me.nameSprite.visible = true;
    this.addNPCBaby('mimi', 1.4, 3.4, -.6, 'play');
    this.addNPCBaby('toto', -3.6, 4.2, .2, 'dance');
    this.addNPCBaby('coco', -4.4, 1.2, 2.6, 'sit');
    this.hint('مرحبًا بك في الحضانة! اضغط الأبواب أو خريطة الغرف للاستكشاف 🚪');
    setTimeout(() => this.hint(null), 5000);
    this.game.ui.setSteps(null);
    this.game.rewards.toast('اقتربت مهمة؟ تحقق من لوحة المهام 📋', '🏡');
  }

  refreshDecor() {
    const owned = this.game.save.data.owned;
    const g = this.group;
    const d = this._decorRefs;
    const want = (key, make) => {
      if (owned[key] && !d[key]) d[key] = make();
      if (!owned[key] && d[key]) { g.remove(d[key]); delete d[key]; }
    };
    want('balloons', () => {
      const b = grp(g, -4.9, 0, -3.6);
      const cols = [0xff6b6b, 0xffd54f, 0x42a5f5, 0x66bb6a];
      for (let i = 0; i < 4; i++) {
        const balloon = sph(.28, cols[i], { mat: mat(cols[i], { rough: .35 }) });
        balloon.scale.y = 1.25;
        balloon.position.set(Math.sin(i * 1.7) * .35, 2.1 + (i % 2) * .3, 0);
        b.add(balloon);
        const str = cyl(.006, .006, 1.6, 0xaaaaaa);
        str.position.set(Math.sin(i * 1.7) * .35, 1.1, 0);
        b.add(str);
      }
      return b;
    });
    want('plantDecor', () => {
      const p = pottedPlant(1.4);
      p.position.set(5.3, 0, 3.4);
      return p;
    });
    want('starLights', () => {
      const s = grp(g, 0, 3.6, 0);
      for (let i = 0; i < 10; i++) {
        const st = emojiSprite('⭐', { size: .3 });
        st.position.set(Math.sin(i) * 3.5, Math.cos(i * 1.3) * .5, -5.7);
        s.add(st);
      }
      return s;
    });
  }

  _makeNanny() {
    const g = new THREE.Group();
    put(g, cyl(.32, .42, 1.2, 0x7e57c2), 0, .6, 0);            // dress body
    put(g, sph(.26, 0xffe0c2), 0, 1.45, 0);                    // head
    put(g, sph(.28, 0x5d4037), 0, 1.6, -.06).scale.set(1, .6, 1); // hair bun
    for (const sx of [-1, 1]) {
      const e = sph(.045, 0x3e2723);
      e.position.set(sx * .09, 1.48, .22);
      g.add(e);
      const arm = capsule(.07, .5, 0xffe0c2);
      arm.position.set(sx * .38, .95, 0);
      arm.rotation.z = sx * .3;
      g.add(arm);
    }
    const smile = sph(.05, 0xb71c1c);
    smile.position.set(0, 1.36, .24); smile.scale.set(1.6, .6, .5);
    g.add(smile);
    put(g, cyl(.1, .12, .3, 0x4e342e), -.12, .12, 0);
    put(g, cyl(.1, .12, .3, 0x4e342e), .12, .12, 0);
    const heart = emojiSprite('💖', { size: .3 });
    heart.position.set(0, 2.2, 0);
    g.add(heart);
    this._nannyHeart = heart;
    this.addHit(g, {
      label: 'المربية نعناع',
      onClick: () => {
        this.game.audio.sfx('babble');
        const tips = [
          'لا تنسَ إطعام الأطفال عندما يظهر رمز الحليب! 🍼',
          'الطفل النعسان يحتاج سريره في غرفة النوم 🛏️',
          'اجمع العملات من الألعاب والمهام! 🪙',
          'الأطفال النظيفون سعداء — حمّمهم دوريًا 🛁',
        ];
        this.game.rewards.toast(tips[(Math.random() * tips.length) | 0], '👩');
      },
    });
    return g;
  }

  update(dt, time) {
    // TV cartoon
    if (this._tvOn) {
      this._tvT += dt;
      if (this._tvT > .12) {
        this._tvT = 0;
        const c = this._tvCtx;
        const t = time;
        c.fillStyle = '#b3e5fc'; c.fillRect(0, 0, 256, 160);
        c.fillStyle = '#81c784'; c.fillRect(0, 120, 256, 40);
        c.fillStyle = '#ffd54f';
        c.beginPath(); c.arc(220 + Math.sin(t) * 10, 30, 16, 0, Math.PI * 2); c.fill();
        c.font = '44px serif';
        c.fillText('🎈', 40 + Math.sin(t * 2) * 24, 90 + Math.cos(t * 3) * 14);
        c.fillText('🐾', 130 + Math.cos(t * 1.4) * 40, 110 + Math.abs(Math.sin(t * 4)) * -18);
        c.font = '30px serif';
        c.fillText('☀️', 20, 34);
        this._tvTex.needsUpdate = true;
      }
    }
    // wall clock — real time
    if (this._clockHands) {
      const now = new Date();
      const h = (now.getHours() % 12) + now.getMinutes() / 60;
      const m = now.getMinutes() + now.getSeconds() / 60;
      this._clockHands.hourHand.rotation.z = -h / 12 * Math.PI * 2;
      this._clockHands.minHand.rotation.z = -m / 60 * Math.PI * 2;
    }
    // nanny heart bob
    if (this._nannyHeart) this._nannyHeart.position.y = 2.2 + Math.sin(time * 2) * .1;
  }
}
