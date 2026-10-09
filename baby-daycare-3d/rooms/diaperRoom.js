// rooms/diaperRoom.js — Diaper Changing Room: lay baby on the table, remove
// old diaper (drag to bin), wipes, cream, fresh diaper, clean clothes, wash hands.
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, torus, emojiSprite, textSprite, rug, ceilingLamp, windowPane, mat } from '../js/kit.js';
import { tween } from '../js/tween.js';

export class DiaperRoom extends RoomBase {
  static def = {
    id: 'diaperRoom', nameAr: 'غرفة تغيير الحفاضات', nameEn: 'Diaper Changing Room', emoji: '🧷',
    color: '#26a69a', color2: '#80cbc4', music: 'play', sky: 'indoor',
    rewardCoins: 15, rewardStars: 1, stat: 'diapers',
  };

  build() {
    const g = this.group;
    this.shell({ w: 9.5, d: 9.5, h: 4.4, floor: 0xe0f2f1, wall: 0xf0fffd, wallLeft: 0xe8f8f5, wainscot: 0x80cbc4 });

    // ---------- changing table ----------
    this.table = grp(g, -1.2, 0, -1.8);
    put(this.table, box(1.9, .12, 1, 0xffffff), 0, 1, 0);
    put(this.table, box(1.7, .1, .85, 0x80deea), 0, 1.06, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      put(this.table, cyl(.05, .05, 1, 0x90a4ae), sx * .85, .5, sz * .4);
    put(this.table, box(1.9, .3, .06, 0xb2ebf2), 0, 1.35, -.5);
    this.addHit(this.table, {
      label: 'طاولة التغيير (اسحب الطفل هنا)',
      onClick: () => this._layBaby(),
    });

    // ---------- supplies shelf ----------
    const shelf = grp(g, 2.8, 0, -3.6);
    put(shelf, box(2.6, .08, .6, 0xffcc80), 0, 1.5, 0);

    // diapers stack
    this.diaperStack = grp(shelf, -.9, 1.72, 0);
    for (let i = 0; i < 4; i++) put(this.diaperStack, box(.5, .12, .3, 0xffffff), 0, i * .13, 0);
    put(this.diaperStack, emojiSprite('🧷', { size: .3 }), 0, .55, 0);
    this.addHit(this.diaperStack, { label: 'حفاضات نظيفة', onClick: () => this._newDiaper() });

    // wipes
    this.wipes = grp(shelf, 0, 1.72, 0);
    put(this.wipes, cyl(.18, .18, .3, 0x80d8ff), 0, 0, 0);
    put(this.wipes, cyl(.19, .19, .04, 0x4fc3f7), 0, .17, 0);
    put(this.wipes, emojiSprite('🧻', { size: .3 }), 0, .36, 0);
    this.addHit(this.wipes, { label: 'مناديل مبللة', onClick: () => this._wipe() });

    // cream
    this.cream = grp(shelf, .8, 1.72, 0);
    put(this.cream, cyl(.12, .14, .16, 0xffab91), 0, 0, 0);
    put(this.cream, cyl(.13, .13, .04, 0xffccbc), 0, .1, 0);
    put(this.cream, emojiSprite('🧴', { size: .28 }), 0, .3, 0);
    this.addHit(this.cream, { label: 'كريم واقي', onClick: () => this._cream() });

    // clean clothes
    this.clothes = grp(shelf, 0, 1.72, 0);
    void this.clothes;
    const clothesPile = grp(shelf, .8, 1.85, .8);
    put(clothesPile, box(.4, .1, .3, 0xaed581), 0, 0, 0);
    put(clothesPile, box(.4, .1, .3, 0xffd54f), .05, .11, .02);
    put(clothesPile, emojiSprite('👕', { size: .3 }), 0, .34, 0);
    this.addHit(clothesPile, { label: 'ملابس نظيفة', onClick: () => this._dressUp() });

    // ---------- trash bin (drag the old diaper here) ----------
    this.bin = grp(g, 2.6, 0, 1.8);
    put(this.bin, cyl(.3, .24, .6, 0xff7043), 0, .3, 0);
    put(this.bin, torus(.28, .03, 0xff8a65), 0, .62, 0).rotation.x = Math.PI / 2;
    put(this.bin, emojiSprite('🗑️', { size: .32 }), 0, .85, 0);
    this.addHit(this.bin, { label: 'سلة المهملات', onClick: () => this.game.audio.sfx('drop') });

    // ---------- sink for hand washing ----------
    this.sink = grp(g, -3.4, 0, 2.8);
    put(this.sink, cyl(.4, .32, .3, 0xffffff), 0, .6, 0);
    put(this.sink, cyl(.3, .3, .06, 0xe0f7fa), 0, .76, 0);
    put(this.sink, cyl(.03, .03, .4, 0xb0bec5), 0, 1, -.15).rotation.x = .5;
    this.addHit(this.sink, {
      label: 'اغسل يديك جيدًا!',
      onClick: () => {
        this.game.audio.startLoop('water');
        this.game.fx.splash({ x: -3.4, y: .9, z: 2.8 }, 10);
        setTimeout(() => this.game.audio.stopLoop('water'), 1400);
        if (this.isStepDone('dress') && !this.isStepDone('wash')) {
          this.step('wash');
          this.game.rewards.toast('يدين نظيفتان — أحسنت! 🧼💧', '👏', 'green');
        } else {
          this.game.rewards.toast('نغسل أيدينا دائمًا بعد التغيير!', '🧼');
        }
      },
    });

    put(g, rug(2.8, 2, 0xb2dfdb, { inner: 0xe0f2f1 }), -1.2, 0, .8);
    put(g, ceilingLamp(0x80cbc4), 0, 4.4, 0);
    const w = windowPane(1.3, 1.1);
    w.position.set(2.6, 2.5, -4.7);
    g.add(w);
    const sign = textSprite('منطقة التغيير 🧷', { color: '#00695c', bg: 'rgba(255,255,255,.92)', fontPx: 48, height: .34 });
    sign.position.set(0, 3.6, -4.7);
    g.add(sign);

    this._laying = false;
    this._oldDiaper = null;
    this._wipeCount = 0;
    this._creamOn = false;
    this._newOn = false;

    this.setSteps([
      { id: 'lay', icon: '🛏️', label: 'ضع الطفل على طاولة التغيير' },
      { id: 'remove', icon: '🗑️', label: 'اسحب الحفاض القديم للسلة' },
      { id: 'wipe', icon: '🧻', label: 'نظف بمناديل مبللة (3 مرات)' },
      { id: 'cream', icon: '🧴', label: 'ضع الكريم الواقي' },
      { id: 'new', icon: '🧷', label: 'ارتدِ حفاضًا جديدًا' },
      { id: 'dress', icon: '👕', label: 'البس ملابس نظيفة' },
      { id: 'wash', icon: '🧼', label: 'اغسل يديك' },
    ]);
  }

  enter() {
    this.addBaby(1.4, 2, Math.PI, 'idle');
    this.hint('ضع الطفل على طاولة التغيير 🧷');
    this._resetState();
  }

  _resetState() {
    this._laying = false;
    this._wipeCount = 0;
    this._creamOn = false;
    this._newOn = false;
    if (this._oldDiaperMesh) { this._oldDiaperMesh.parent?.remove(this._oldDiaperMesh); this._oldDiaperMesh = null; }
    if (this._babyDiaperMesh) { this._babyDiaperMesh.visible = true; }
  }

  _layBaby() {
    const b = this.game.activeBaby;
    this._laying = true;
    b.position.set(-1.2, 1.15, -1.8);
    b.rotation.set(-Math.PI / 2 * .97, 0, 0);
    b.animator.play('sleep');
    b.setExpression('neutral');
    this.game.audio.sfx('boing');
    this.step('lay');
    // show a "dirty diaper" on the baby to remove
    const old = grp(this.group, -1.2, 1.35, -1.6);
    put(old, box(.4, .12, .3, 0xd7ccc8), 0, 0, 0);
    put(old, emojiSprite('💢', { size: .26 }), 0, .2, 0);
    this._oldDiaperMesh = old;
    this.addHit(old, {
      label: 'الحفاض القديم — اسحبه للسلة!',
      dragY: 0,
      onDragStart: () => this.game.audio.sfx('pop'),
      onDragMove: pt => old.position.set(pt.x, 1.1, pt.z),
      onDrop: () => {
        if (Math.hypot(old.position.x - 2.6, old.position.z - 1.8) < .9) {
          this.group.remove(old);
          this._oldDiaperMesh = null;
          this.game.audio.sfx('drop');
          this.game.fx.sparkles({ x: 2.6, y: 1, z: 1.8 }, 4);
          this.step('remove');
          this.hint('الآن نظف بمناديل مبللة 🧻 (اضغط 3 مرات)');
          b.ai.apply({ comfort: -2 });
        } else {
          tween(old.position, { x: -1.2, y: 1.35, z: -1.6 }, { dur: .3 });
        }
      },
    });
    this.hint('اسحب الحفاض القديم إلى السلة 🗑️');
  }

  _needLay() {
    if (!this._laying) { this.game.audio.sfx('error'); this.hint('ضع الطفل على الطاولة أولًا!'); return true; }
    return false;
  }

  _wipe() {
    if (this._needLay() || !this.isStepDone('remove')) { if (this._laying) this.hint('ارمِ الحفاض القديم أولًا 🗑️'); return; }
    this._wipeCount++;
    this.game.audio.sfx('flip');
    const b = this.game.activeBaby;
    this.game.fx.sparkles({ x: b.position.x, y: 1.3, z: b.position.z }, 4);
    if (this._wipeCount >= 3) {
      this.step('wipe');
      this.hint('ضع الكريم الواقي 🧴');
      this.game.rewards.toast('نظيف ومرتاح! 🌟', '🧻');
    } else {
      this.hint(`مناديل: ${this._wipeCount}/3`);
    }
  }

  _cream() {
    if (this._needLay() || !this.isStepDone('wipe')) { if (this._laying) this.hint('استخدم المناديل أولًا 🧻'); return; }
    this._creamOn = true;
    this.game.audio.sfx('spray');
    this.game.activeBaby.ai.apply({ comfort: 6 });
    this.game.fx.hearts({ x: -1.2, y: 1.8, z: -1.8 }, 4);
    this.step('cream');
    this.hint('الآن حفاض نظيف 🧷');
  }

  _newDiaper() {
    if (this._needLay() || !this.isStepDone('cream')) { if (this._laying) this.hint('ضع الكريم أولًا 🧴'); return; }
    this._newOn = true;
    this.game.audio.sfx('magic');
    this.game.fx.sparkles({ x: -1.2, y: 1.3, z: -1.8 }, 10);
    this.step('new');
    this.hint('البس ملابس نظيفة 👕');
    this.game.activeBaby.ai.apply({ hygiene: 25, comfort: 10 });
  }

  _dressUp() {
    if (this._needLay() || !this.isStepDone('new')) { if (this._laying) this.hint('ضع الحفاض الجديد أولًا 🧷'); return; }
    this.game.audio.sfx('success');
    const b = this.game.activeBaby;
    b.ai.apply({ hygiene: 30, comfort: 12, happiness: 8 });
    this.step('dress');
    this.hint('أخيرًا اغسل يديك في المغسلة 🧼');
    this.game.rewards.toast('طفل نظيف ومريح تمامًا! ✨', '🧷', 'green');
    // sit up happily
    setTimeout(() => {
      b.rotation.set(0, 0, 0);
      b.position.y = 1.3;
      b.animator.play('clap', { loop: false, onDone: () => b.animator.play('sit') });
      this.game.audio.sfx('clap');
    }, 600);
  }

  onAllStepsDone() {
    const b = this.game.activeBaby;
    setTimeout(() => {
      b.position.set(0, 0, 1.4);
      b.animator.play('idle');
      b.setExpression('happy');
    }, 1800);
  }
}
