// rooms/musicRoom.js — Music Room: playable piano, xylophone, drum, guitar,
// bells, tambourine & microphone — all through Web Audio. Includes the
// tone-echo memory game on the xylophone.
import * as THREE from 'three';
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, torus, emojiSprite, textSprite, rug, ceilingLamp, windowPane, mat } from '../js/kit.js';
import { toneEchoGame } from '../minigames/music.js';

const NOTE_LABELS = ['دو', 'ري', 'مي', 'فا', 'صول', 'لا', 'سي', 'دو'];
export class MusicRoom extends RoomBase {
  static def = {
    id: 'musicRoom', nameAr: 'غرفة الموسيقى', nameEn: 'Music Room', emoji: '🎹',
    color: '#7c4dff', color2: '#448aff', music: 'learning', sky: 'indoor',
    rewardCoins: 18, rewardStars: 2, stat: 'songs',
  };

  build() {
    const g = this.group;
    this.shell({ w: 11, d: 10, h: 4.6, floor: 0xe8e3f8, wall: 0xf3f0ff, wallLeft: 0xece9ff, wainscot: 0xb39ddb });

    // ---------- piano ----------
    this.piano = grp(g, -2.8, 0, -2.8);
    put(this.piano, box(3.2, .9, 1.1, 0x37474f), 0, .45, 0);
    put(this.piano, box(3.1, .08, .5, 0x263238), 0, .95, .35);
    this._pianoKeys = [];
    for (let i = 0; i < 8; i++) {
      const key = box(.34, .07, .46, 0xffffff);
      key.position.set(-1.4 + i * .4, 1.02, .35);
      this.piano.add(key);
      const midi = 60 + [0, 2, 4, 5, 7, 9, 11, 12][i];
      this._pianoKeys.push({ mesh: key, midi, y: 1.02 });
      this.addHit(key, {
        label: `نوتة ${NOTE_LABELS[i]}`,
        onClick: () => this._hitKey(i),
      });
    }
    // black keys
    for (let i = 0; i < 8; i++) {
      if ([0, 2, 5, 7].includes(i % 8)) continue; // simplified pattern
      const bk = box(.2, .06, .26, 0x212121);
      bk.position.set(-1.2 + i * .4, 1.09, .22);
      this.piano.add(bk);
    }
    put(this.piano, emojiSprite('🎹', { size: .5 }), 0, 1.5, -.3);
    this.addHit(this.piano, { label: 'البيانو', onClick: () => this.hint('اضغط على المفاتيح البيضاء لتعزف!') });

    // ---------- xylophone (echo game) ----------
    this.xylo = grp(g, 2.8, 0, -3.2);
    put(this.xylo, box(2.6, .12, .8, 0x8d6e63), 0, .6, 0);
    this._xyloBars = [];
    const barCols = [0xef5350, 0xffca28, 0xffd54f, 0x66bb6a, 0x26c6da, 0x42a5f5, 0x7e57c2, 0xf06292];
    barCols.forEach((c, i) => {
      const bar = box(.26, .07, .6 - i * .03, c);
      bar.position.set(-1.1 + i * .32, .72, 0);
      this.xylo.add(bar);
      const midi = 72 + i * 2;
      this._xyloBars.push({ mesh: bar, midi, color: `#${c.toString(16).padStart(6, '0')}`, label: NOTE_LABELS[i] });
      this.addHit(bar, {
        label: `إكسيليفون ${NOTE_LABELS[i]}`,
        onClick: () => this._hitXylo(i),
      });
    });
    const echoBtn = grp(g, 2.8, 0, -1.9);
    put(echoBtn, box(1.1, .5, .1, 0xffffff), 0, 1.2, 0);
    const ebText = textSprite('🎮 لعبة النغمات', { color: '#5b2bd6', fontPx: 44, height: .26 });
    ebText.position.set(0, 1.2, .08);
    echoBtn.add(ebText);
    this.addHit(echoBtn, { label: 'لعبة تقليد النغمات', onClick: () => this._echoGame() });

    // ---------- drum ----------
    this.drum = grp(g, -4.3, 0, .8);
    put(this.drum, cyl(.55, .5, .7, 0xef5350), 0, .35, 0);
    put(this.drum, cyl(.56, .56, .08, 0xfffbe9), 0, .72, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      put(this.drum, cyl(.02, .02, .74, 0xffd54f), Math.cos(a) * .56, .36, Math.sin(a) * .56);
    }
    this._drumHit = 0;
    this.addHit(this.drum, {
      label: 'الطبلة',
      onClick: () => {
        this.game.audio.note('drum', 50, 0, .2, .6);
        this.drum.scale.set(1.1, .92, 1.1);
        setTimeout(() => this.drum.scale.set(1, 1, 1), 120);
      },
    });

    // ---------- guitar ----------
    this.guitar = grp(g, 4.6, 0, .6);
    this.guitar.rotation.z = .5;
    put(this.guitar, cyl(.42, .5, .18, 0xff9800), 0, .8, 0).rotation.x = Math.PI / 2;
    put(this.guitar, sph(.16, 0x3e2723), 0, .8, .1).scale.set(1, 1, .4);
    put(this.guitar, box(.14, 1.4, .08, 0x8d6e63), 0, 1.6, 0);
    for (let i = 0; i < 4; i++) put(this.guitar, cyl(.006, .006, 2, 0xfff8e1), -.04 + i * .028, 1.2, .09);
    this.addHit(this.guitar, {
      label: 'الجيتار',
      onClick: () => {
        const base = [52, 57, 62, 67][(Math.random() * 4) | 0];
        this.game.audio.note('guitar', base, 0, .8, .5);
        this.guitar.rotation.z = .62;
        setTimeout(() => this.guitar.rotation.z = .5, 200);
      },
    });

    // ---------- bells + tambourine ----------
    const bells = grp(g, 0, 0, -4.2);
    for (let i = 0; i < 5; i++) {
      const bell = sph(.12 + i * .02, 0xffd54f, { mat: mat(0xffd54f, { metal: .8, rough: .25, emissive: 0xffd54f, emissiveIntensity: .15 }) });
      bell.position.set(-.8 + i * .4, 1.6 + (i % 2) * .15, 0);
      bells.add(bell);
      put(bells, cyl(.008, .008, 1.4, 0xb0bec5), -.8 + i * .4, 2.4, 0);
      this.addHit(bell, {
        label: 'جرس',
        onClick: () => this.game.audio.note('bell', 76 + i * 3, 0, .8, .4),
      });
    }
    const tamb = grp(g, -4.3, 0, 2.4);
    put(tamb, torus(.3, .05, 0xf06292), 0, .5, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      put(tamb, sph(.035, 0xffd54f), Math.cos(a) * .3, .5, Math.sin(a) * .3);
    }
    this.addHit(tamb, {
      label: 'الدف',
      onClick: () => this.game.audio.note('tamb', 80, 0, .3, .5),
    });

    // ---------- microphone ----------
    const mic = grp(g, 0, 0, 3.6);
    put(mic, cyl(.06, .08, .3, 0x546e7a), 0, .15, 0);
    put(mic, sph(.14, 0x90a4ae, { mat: mat(0x90a4ae, { metal: .7, rough: .35 }) }), 0, .38, 0);
    put(mic, box(.5, .08, .5, 0x78909c), 0, .02, 0);
    put(mic, emojiSprite('🎤', { size: .36 }), 0, .75, 0);
    this.addHit(mic, {
      label: 'الميكروفون',
      onClick: () => {
        this.game.audio.sfx('babble');
        this.game.audio.note('flute', 76, 0, .4, .4);
        this.game.audio.note('flute', 81, .2, .4, .4);
        this.game.activeBaby.animator.play('dance');
        setTimeout(() => this.game.activeBaby.animator.play('idle'), 2400);
        this.game.rewards.toast('أه هـ هـم! 🎤⭐', '🎤');
      },
    });

    put(g, rug(4, 2.8, 0xd1c4e9, { inner: 0xede7f6 }), 0, 0, .6);
    put(g, ceilingLamp(0xb39ddb), 0, 4.55, 0);
    const w = windowPane(1.3, 1.2);
    w.position.set(3.6, 2.5, -5.44);
    g.add(w);
    const sign = textSprite('استوديو الموسيقى 🎶', { color: '#512da8', bg: 'rgba(255,255,255,.92)', fontPx: 48, height: .36 });
    sign.position.set(0, 3.6, -5.4);
    g.add(sign);

    this.setSteps([
      { id: 'piano', icon: '🎹', label: 'اعزف 5 نوتات على البيانو' },
      { id: 'drum', icon: '🥁', label: 'ارطب على الطبلة' },
      { id: 'echo', icon: '🎮', label: 'أكمل لعبة تقليد النغمات' },
    ]);
  }

  enter() {
    this.addBaby(0, 1.8, Math.PI, 'idle');
    this.hint('كل آلة تعمل! جرّب البيانو والطبلة 🎵');
  }

  _hitKey(i) {
    const k = this._pianoKeys[i];
    this.game.audio.note('piano', k.midi, 0, .5, .5);
    k.mesh.position.y = k.y - .03;
    setTimeout(() => k.mesh.position.y = k.y, 130);
    this._pianoCount = (this._pianoCount || 0) + 1;
    if (this._pianoCount >= 5 && !this.isStepDone('piano')) {
      this.step('piano');
      this.hint('رائع! الآن الطبلة 🥁');
    }
  }

  _hitXylo(i) {
    const b = this._xyloBars[i];
    this.game.audio.note('xylo', b.midi, 0, .5, .5);
    b.mesh.position.y = .69;
    setTimeout(() => b.mesh.position.y = .72, 140);
  }

  _echoGame() {
    const g = this.game;
    const holder = document.createElement('div');
    const close = g.ui.modal({ title: 'لعبة تقليد النغمات 🎮', icon: '🎵', body: holder });
    toneEchoGame(holder, {
      bars: this._xyloBars.slice(0, 5).map(b => ({ midi: b.midi, color: b.color, label: b.label })),
      playNote: (midi) => g.audio.note('xylo', midi, 0, .5, .5),
      onDone: () => {
        setTimeout(() => {
          close();
          this.step('echo');
          g.tasks.count('minigames');
          g.rewards.celebrate('ذاكرة موسيقية ذهبية! 🎵🏆', '🎹');
        }, 600);
      },
    });
  }

  onAllStepsDone() {
    this.game.rewards.celebrate('حفلة موسيقية كاملة! 🎶', '🎹');
    this.game.audio.playMusic('menu');
    const b = this.game.activeBaby;
    b.animator.play('dance');
    setTimeout(() => b.animator.play('idle'), 4000);
  }
}
