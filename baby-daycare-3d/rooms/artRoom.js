// rooms/artRoom.js — Art Room: easel opens a full coloring studio (canvas,
// flood fill, brush, stickers, save PNG). Completing a drawing earns rewards.
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, cone, emojiSprite, textSprite, rug, ceilingLamp, windowPane, bookStack, wallPicture, mat } from '../js/kit.js';
import { ColoringGame } from '../minigames/coloring.js';

export class ArtRoom extends RoomBase {
  static def = {
    id: 'artRoom', nameAr: 'غرفة الرسم', nameEn: 'Art Room', emoji: '🎨',
    color: '#ff6fb5', color2: '#ba68c8', music: 'play', sky: 'indoor',
    rewardCoins: 15, rewardStars: 1, stat: 'drawings',
  };

  build() {
    const g = this.group;
    this.shell({ w: 10, d: 10, h: 4.5, floor: 0xfde8f5, wall: 0xfff0f8, wallLeft: 0xf5ecff, wainscot: 0xf8bbd0 });

    // ---------- big easel ----------
    this.easel = grp(g, -1.4, 0, -2.6);
    put(this.easel, cyl(.06, .06, 2.4, 0xa1887f), -.7, 1.2, .4).rotation.x = .2;
    put(this.easel, cyl(.06, .06, 2.4, 0xa1887f), .7, 1.2, .4).rotation.x = .2;
    put(this.easel, cyl(.06, .06, 2.2, 0xa1887f), 0, 1.1, -.2).rotation.x = -.25;
    put(this.easel, box(1.7, 1.3, .08, 0xffffff), 0, 1.35, .1).rotation.x = -.12;
    const art = emojiSprite('🖼️', { size: .7 });
    art.position.set(0, 1.35, .2);
    this.easel.add(art);
    put(this.easel, box(1.5, .08, .08, 0x8d6e63), 0, .85, .35).rotation.x = -.12;
    this.addHit(this.easel, {
      label: 'لوحة الرسم (افتح الاستوديو!)',
      onClick: () => this.openStudio(),
    });

    // ---------- crayon boxes on shelves ----------
    const shelf = grp(g, 3.9, 0, -1);
    shelf.rotation.y = -Math.PI / 2;
    put(shelf, box(.5, .08, 2.8, 0xffcc80), 0, 1.4, 0);
    const crayonCols = [0xef5350, 0xffca28, 0x66bb6a, 0x42a5f5, 0xab47bc, 0xff8a65];
    crayonCols.forEach((c, i) => {
      put(shelf, cyl(.05, .05, .5, c), 0, 1.7, -1.1 + i * .42);
    });
    put(shelf, box(.5, .3, .5, 0x42a5f5), 0, 1.62, 1.1);   // paint box
    this.addHit(shelf, { label: 'ألوان وقراشيم', onClick: () => this.openStudio() });

    // paint pots on the floor
    for (let i = 0; i < 4; i++) {
      const pot = grp(g, 2.2 + i * .55, 0, 2.8);
      put(pot, cyl(.16, .13, .22, crayonCols[i]), 0, .11, 0);
      put(pot, cyl(.13, .13, .03, 0xffffff), 0, .23, 0);
      this.addHit(pot, {
        label: 'وعاء لون',
        onClick: () => {
          this.game.audio.sfx('bubble');
          this.game.fx.sparkles({ x: 2.2 + i * .55, y: .6, z: 2.8 }, 6, );
          if (!this.isStepDone('pots')) { this._pots = (this._pots || 0) + 1; if (this._pots >= 3) this.step('pots'); }
        },
      });
    }

    // drawings gallery wall
    ['🐱', '🏡', '🐠', '🦋'].forEach((e, i) => {
      const p = wallPicture(e, .7, .55, [0xff8fab, 0x80d8ff, 0xffd54f, 0xa5d6a7][i]);
      p.position.set(-3.2 + i * .95, 2.9, -4.94);
      g.add(p);
    });

    put(g, rug(3.4, 2.6, 0xf8bbd0, { inner: 0xfce4ec }), 0, 0, 1.6);
    put(g, ceilingLamp(0xf48fb1), 0, 4.5, 0);
    const w = windowPane(1.4, 1.2);
    w.position.set(2.4, 2.5, -5.44);
    g.add(w);
    put(g, bookStack(2), -3.6, 0, 3.4);
    const sign = textSprite('ستوديو الفن 🎨', { color: '#c2185b', bg: 'rgba(255,255,255,.92)', fontPx: 50, height: .36 });
    sign.position.set(-1.4, 3.6, -4.92);
    g.add(sign);

    this.setSteps([
      { id: 'open', icon: '🖌️', label: 'افتح استوديو الرسم' },
      { id: 'pots', icon: '🪣', label: 'المس 3 أوعية ألوان' },
      { id: 'save', icon: '💾', label: 'لوّن واحفظ رسمتك' },
    ]);
  }

  enter() {
    this.addBaby(1.6, 1.8, -.8, 'idle');
    this.hint('اضغط على الطاولة لفتح استوديو التلوين! 🖌️');
  }

  openStudio() {
    const g = this.game;
    this.step('open');
    const holder = document.createElement('div');
    const closeBtn = g.ui.modal({ title: 'استوديو التلوين 🎨', icon: '🎨', body: holder, wide: true });
    new ColoringGame(holder, {
      onDone: (cov) => {
        closeBtn();
        this.step('save');
        g.tasks.count('drawings');
        g.rewards.celebrate(cov > .4 ? 'تحفة فنية ملوّنة! 🖼️' : 'لوحة جميلة! رسمنا وحفظنا 🎨', '🎨');
        g.rewards.grant(10, cov > .4 ? 2 : 1);
        g.fx.burstStars({ x: this.game.activeBaby.position.x, y: 1.6, z: this.game.activeBaby.position.z }, 18);
        const b = g.activeBaby;
        b.setExpression('excited');
        b.animator.play('clap', { loop: false, onDone: () => b.animator.play('idle') });
        g.audio.sfx('giggle');
      },
    });
  }

  onAllStepsDone() {
    this.game.rewards.toast('فنان الحضانة الصغير! 🖼️', '🎨', 'gold');
  }
}
