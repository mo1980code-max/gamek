// rooms/birthdayRoom.js — Birthday Party Room: build a cake, light the
// candles, blow them out, the birthday song plays, open gifts, dance & photo.
import * as THREE from 'three';
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, cone, torus, emojiSprite, textSprite, rug, ceilingLamp, mat } from '../js/kit.js';
import { tween, wait } from '../js/tween.js';

export class BirthdayRoom extends RoomBase {
  static def = {
    id: 'birthdayRoom', nameAr: 'غرفة أعياد الميلاد', nameEn: 'Birthday Party Room', emoji: '🎂',
    color: '#ff6b6b', color2: '#ffd54f', music: 'party', sky: 'party',
    rewardCoins: 25, rewardStars: 2, stat: 'parties',
  };

  build() {
    const g = this.group;
    this.shell({ w: 11, d: 10, h: 4.7, floor: 0xffe3ee, wall: 0xfff0f5, wallLeft: 0xfff8e1, wainscot: 0xff8fab });

    // banner
    const banner = textSprite('🎉 عيد ميلاد سعيد! 🎂', { color: '#ffffff', bg: 'linear-gradient(#ff6b6b,#ff9f43)', fontPx: 64, height: .5 });
    banner.position.set(0, 3.9, -5.4);
    g.add(banner);

    // balloons arch
    this._balloons = [];
    const cols = [0xff6b6b, 0xffd54f, 0x42a5f5, 0x66bb6a, 0xba68c8, 0xff9800];
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const b = sph(.32, cols[i % 6], { mat: mat(cols[i % 6], { rough: .35 }) });
      b.scale.y = 1.25;
      b.position.set(-4.6 + t * 9.2, 3 + Math.sin(t * Math.PI) * 1.4, -5);
      g.add(b);
      this._balloons.push(b);
    }

    // party table + cake area
    const table = grp(g, 0, 0, -2.6);
    put(table, box(2.6, .1, 1.3, 0xffffff), 0, .85, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      put(table, cyl(.06, .06, .85, 0xffca28), sx * 1.15, .43, sz * .5);
    put(table, rug(0, 0, 0, { shadow: false }), 0, -10, 0); // no-op keeper
    // cake base (built dynamically)
    this._cake = grp(table, 0, 1.15, 0);
    this._buildCake(2, 0xff8fab, 3);
    this.addHit(this._cake, {
      label: 'الكعكة — صمّمها وأضئ الشموع',
      onClick: () => this._candleFlow(),
    });

    // candle flames
    this._flames = [];
    this._candlesLit = false;

    // gifts
    this._gifts = [];
    const giftPos = [[-3.6, -1], [3.6, -1], [4.4, .4]];
    giftPos.forEach(([x, z], i) => {
      const gift = grp(g, x, 0, z);
      const size = .5 + i * .1;
      put(gift, box(size, size, size, [0xef5350, 0x42a5f5, 0x66bb6a][i]), 0, size / 2, 0);
      put(gift, box(size + .04, .1, .12, 0xffd54f), 0, size / 2, 0);
      put(gift, box(.12, .1, size + .04, 0xffd54f), 0, size / 2, 0);
      put(gift, emojiSprite('🎁', { size: .3 }), 0, size + .25, 0);
      this._gifts.push({ group: gift, opened: false });
      this.addHit(gift, {
        label: 'هدية! (اضغط لفتحها)',
        onClick: () => this._openGift(i),
      });
    });

    // dance floor
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2, 28), mat(0xba68c8, { emissive: 0x7b1fa2, emissiveIntensity: .25 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, .015, 1.6);
    g.add(floor);
    this._danceFloor = floor;

    // party hats station
    const hats = grp(g, -4.4, 0, 2);
    for (let i = 0; i < 3; i++) {
      const h = cone(.18, .4, cols[i]);
      h.position.set(i * .45, .2, 0);
      hats.add(h);
      put(hats, sph(.06, 0xffffff), i * .45, .42, 0);
    }
    this.addHit(hats, {
      label: 'قبعات الحفلة',
      onClick: () => {
        const b = this.game.activeBaby;
        b.outfit.hat = 'party';
        b.outfit.hatColor = 0xff6b6b;
        b.applyOutfit();
        this.game.save.data.outfits[b.babyId] = { ...b.outfit };
        this.game.audio.sfx('magic');
        this.game.rewards.toast('قبعة حفلة! 🎉', '🥳');
      },
    });

    // photo standee
    const photo = grp(g, 4.6, 0, 2.6);
    put(photo, box(1.6, 1.9, .1, 0xffca28), 0, 1, 0);
    put(photo, box(1.3, 1.5, .12, 0xffecb3), 0, 1.05, .02);
    put(photo, emojiSprite('📸', { size: .6 }), 0, 1.2, .1);
    put(photo, emojiSprite('🎀', { size: .4 }), -.45, 1.7, .1);
    this.addHit(photo, {
      label: 'زاوية التصوير',
      onClick: () => {
        const b = this.game.activeBaby;
        b.animator.play('clap', { loop: false, onDone: () => b.animator.play('idle') });
        setTimeout(() => {
          this.game.ui.photoModal(this.game.scenes.snapshot(), 'عيد ميلاد سعيد 🎂');
        }, 300);
      },
    });

    put(g, rug(4.4, 3, 0xffc1e3, { inner: 0xffe3ee }), 0, 0, 1.6);
    this._lamp = ceilingLamp(0xff8fab);
    put(g, this._lamp, 0, 4.65, 0);

    // confetti emitter baseline handled via fx
    this._blownOut = false;
    this.setSteps([
      { id: 'cake', icon: '🎂', label: 'اختر كعكة وزّينها' },
      { id: 'candles', icon: '🕯️', label: 'أضئ الشموع' },
      { id: 'blow', icon: '💨', label: 'انفخ الشموع' },
      { id: 'gifts', icon: '🎁', label: 'افتح 3 هدايا' },
    ]);
  }

  enter() {
    const b = this.addBaby(0, 1.2, Math.PI, 'dance');
    this.addNPCBaby('mimi', -1.8, 2, 2.4, 'dance');
    this.addNPCBaby('toto', 1.8, 2, -2.4, 'dance');
    this.hint('اضغط الكعكة لبنائها ثم أضئ الشموع! 🎂');
    this._buildCake(2, 0xff8fab, 3);
  }

  _buildCake(layers, color, candles) {
    this._flames = this._flames || [];
    while (this._cake.children.length) {
      const c = this._cake.children[0];
      this._cake.remove(c);
    }
    this._flames.forEach(f => f.parent?.remove(f));
    this._flames = [];
    const layerCols = [color, 0xfff3e0, 0xffd54f];
    for (let i = 0; i < layers; i++) {
      const r = .62 - i * .16;
      const lay = cyl(r, r, .22, layerCols[i % 3]);
      lay.position.y = i * .24;
      this._cake.add(lay);
      // cream dollops
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * Math.PI * 2;
        put(this._cake, sph(.06, 0xffffff), Math.cos(a) * r, i * .24 + .14, Math.sin(a) * r);
      }
    }
    const topper = emojiSprite('🍒', { size: .22 });
    topper.position.y = layers * .24 + .18;
    this._cake.add(topper);
    // candles
    for (let i = 0; i < candles; i++) {
      const a = (i / candles) * Math.PI * 2;
      const cx = Math.cos(a) * .28, cz = Math.sin(a) * .28;
      const topY = (layers - 1) * .24 + .24;
      const stick = cyl(.03, .03, .26, [0xef5350, 0x42a5f5, 0x66bb6a, 0xba68c8, 0xff9800][i % 5]);
      stick.position.set(cx, topY + .16, cz);
      this._cake.add(stick);
      const flame = sph(.05, 0xffca28, { mat: mat(0xffca28, { emissive: 0xff9800, emissiveIntensity: 1.6, transparent: true, opacity: .95 }) });
      flame.position.set(cx, topY + .33, cz);
      flame.visible = false;
      this._cake.add(flame);
      this._flames.push(flame);
    }
    this._candlesLit = false;
    this._blownOut = false;
  }

  _cakeDesigner() {
    const g = this.game;
    const wrap = document.createElement('div');
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:900;margin-bottom:8px';
    title.textContent = 'اختر عدد الطبقات واللون والشموع:';
    const row = (label, opts, cur, cb) => {
      const r = document.createElement('div');
      r.className = 'mg-toolbar';
      r.style.marginBottom = '8px';
      const l = document.createElement('span');
      l.style.cssText = 'font-weight:800;min-width:110px';
      l.textContent = label;
      r.appendChild(l);
      opts.forEach(o => {
        const b = document.createElement('button');
        b.className = 'swatch' + (o.v === cur ? ' sel' : '');
        if (o.c) b.style.background = o.c;
        b.style.minWidth = '46px';
        b.innerHTML = o.label;
        b.onclick = () => { cb(o.v); refresh(); };
        r.appendChild(b);
      });
      return r;
    };
    const state = { layers: 2, color: 0xff8fab, candles: 3 };
    const body = document.createElement('div');
    const refresh = () => {
      body.innerHTML = '';
      body.appendChild(title);
      body.appendChild(row('الطبقات', [1, 2, 3].map(v => ({ v, label: v })), state.layers, v => { state.layers = v; this._buildCake(v, state.color, state.candles); g.audio.sfx('pop'); }));
      body.appendChild(row('اللون', [
        { v: 0xff8fab, label: '🌸', c: '#ff8fab' }, { v: 0x81d4fa, label: '💙', c: '#81d4fa' },
        { v: 0xaed581, label: '💚', c: '#aed581' }, { v: 0xffd54f, label: '💛', c: '#ffd54f' },
        { v: 0xce93d8, label: '💜', c: '#ce93d8' },
      ], state.color, v => { state.color = v; this._buildCake(state.layers, v, state.candles); g.audio.sfx('pop'); }));
      body.appendChild(row('الشموع', [1, 2, 3, 4, 5].map(v => ({ v, label: v })), state.candles, v => { state.candles = v; this._buildCake(state.layers, state.color, v); g.audio.sfx('pop'); }));
    };
    refresh();
    const done = document.createElement('button');
    done.className = 'btn pink';
    done.textContent = 'ممتاز! أكمل التجهيز ✨';
    done.onclick = () => {
      g.audio.sfx('success');
      closeCake();
      this.step('cake');
      this.hint('اضغط الكعكة مرة أخرى لإشعال الشموع 🕯️');
      this._designDone = true;
    };
    body.appendChild(done);
    const closeCake = g.ui.modal({ title: 'مصمم الكعكة 🎂', icon: '🎂', body });
    // light candles on second click
    this._cakeHitArmed = true;
  }

  // candle lighting & blowing handled on cake click when designed
  _candleFlow() {
    if (!this._designDone) { this._cakeDesigner(); return; }
    if (!this._candlesLit) {
      this._candlesLit = true;
      this._flames.forEach(f => f.visible = true);
      this.game.audio.sfx('candle');
      this.game.rewards.toast('أشعلنا الشموع! انفخها الآن 💨', '🕯️');
      this.step('candles');
      this.hint('اضغط الشموع مرة أخيرة لتنفخها! 💨');
      this._armedBlow = true;
    } else if (this._armedBlow && !this._blownOut) {
      this._armedBlow = false;
      this._blownOut = true;
      this._flames.forEach(f => f.visible = false);
      this.game.audio.sfx('blow');
      this.game.fx.splash({ x: 0, y: 1.8, z: -2.6 }, 10);
      this.game.rewards.toast('أطفأت الشموع! تحققت أمنيتك 🌟', '💫', 'gold');
      this.step('blow');
      this.hint('الآن افتح الهدايا! 🎁');
      // birthday song + dance
      this.game.audio.playMusic('party');
      const b = this.game.activeBaby;
      b.animator.play('dance');
      this.game.fx.confetti(new THREE.Vector3(0, 2, -2), 30);
      setTimeout(() => this.game.audio.playMusic('party'), 16000);
    }
  }

  _openGift(i) {
    const gift = this._gifts[i];
    if (!gift || gift.opened) return;
    gift.opened = true;
    this.game.audio.sfx('gift');
    gift.group.children[0].scale.set(1.15, .25, 1.15);
    gift.group.children[0].position.y = .1;
    const toys = ['🧸', '🚗', '🪀', '🎈', '🐰', '⚽'];
    const toy = toys[(Math.random() * toys.length) | 0];
    const revealed = emojiSprite(toy, { size: .55 });
    revealed.position.set(0, .6, 0);
    gift.group.add(revealed);
    tween(revealed.position, { y: 1 }, { dur: .5, ease: t => t });
    this.game.audio.sfx('magic');
    this.game.rewards.grant(15, 1);
    this.game.fx.burstStars({ x: gift.group.position.x, y: 1.2, z: gift.group.position.z }, 14);
    this.game.rewards.toast(`هدية رائعة! ${toy} +15🪙`, '🎁');
    if (this._gifts.every(g2 => g2.opened)) {
      this.step('gifts');
    }
  }

  onAllStepsDone() {
    this.game.rewards.celebrate('حفلة عيد ميلاد كاملة! 🎂🎉', '🥳');
    for (const b of this.group.children.filter(c => c.isBaby)) {
      b.animator.play('dance');
      setTimeout(() => b.animator.play('idle'), 4000);
    }
  }

  update(dt, time) {
    // balloons bob
    this._balloons.forEach((b, i) => {
      b.position.y += Math.sin(time * 1.4 + i * .8) * dt * .12;
    });
    // flames flicker
    if (this._candlesLit) {
      this._flames.forEach((f, i) => {
        f.scale.setScalar(.85 + Math.sin(time * 12 + i * 2) * .2);
      });
    }
    // dance floor pulse
    this._danceFloor.material.emissiveIntensity = .2 + Math.abs(Math.sin(time * 2)) * .3;
  }
}
