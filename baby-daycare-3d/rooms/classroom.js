// rooms/classroom.js — Learning Classroom: numbers 1–20, colors, shapes,
// Arabic & English letters with speech, animal sounds, matching & sorting
// mini-games. Real spoken audio via speechSynthesis (with melody fallback).
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, emojiSprite, textSprite, rug, ceilingLamp, smallChair, tableLow, bookStack, mat } from '../js/kit.js';
import { pairMatch } from '../minigames/matching.js';
import { binSort } from '../minigames/sorting.js';
import { memoryGame } from '../minigames/puzzles.js';

export function speak(text, lang = 'ar') {
  try {
    if (!('speechSynthesis' in window)) return false;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    u.rate = .9; u.pitch = 1.2;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

const COLORS = [
  { hex: '#e53935', ar: 'أحمر' }, { hex: '#1e88e5', ar: 'أزرق' }, { hex: '#43a047', ar: 'أخضر' },
  { hex: '#fdd835', ar: 'أصفر' }, { hex: '#fb8c00', ar: 'برتقالي' }, { hex: '#8e24aa', ar: 'بنفسجي' },
  { hex: '#ec407a', ar: 'وردي' }, { hex: '#26c6da', ar: 'سماوي' },
];
const SHAPES = [['🔺', 'مثلث'], ['🔵', 'دائرة'], ['🟦', 'مربع'], ['⭐', 'نجمة'], ['❤️', 'قلب'], ['⬛', 'مربع أسود']];
const ANIMALS = [['🐶', 'كلب', 'dog'], ['🐱', 'قط', 'cat'], ['🐮', 'بقرة', 'cat'], ['🐑', 'خروف', 'rabbit'], ['🐓', 'ديك', 'bird'], ['🦁', 'أسد', 'dog']];
const AR_LETTERS = 'أبتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');

export class Classroom extends RoomBase {
  static def = {
    id: 'classroom', nameAr: 'غرفة التعليم', nameEn: 'Learning Classroom', emoji: '📚',
    color: '#448aff', color2: '#26c6da', music: 'learning', sky: 'indoor',
    rewardCoins: 20, rewardStars: 2, stat: 'minigames',
  };

  build() {
    const g = this.group;
    this.shell({ w: 11, d: 10.5, h: 4.6, floor: 0xdff0e0, wall: 0xf0f9ff, wallLeft: 0xfff8e1, wainscot: 0x90caf9 });

    // ---------- board ----------
    this.board = grp(g, 0, 1.9, -5.15);
    put(this.board, box(4.6, 2, .1, 0x8d6e63), 0, 0, 0);
    put(this.board, box(4.3, 1.7, .06, 0x2e5d34), 0, 0, .06);
    this._boardText = textSprite('أهلاً بكم في المدرسة!', { color: '#ffffff', fontPx: 56, height: .42 });
    this._boardText.position.set(0, .25, .1);
    this.board.add(this._boardText);
    put(this.board, box(.5, .05, .04, 0xffca28), 1.6, -.85, .08);   // chalk
    this.addHit(this.board, {
      label: 'السبورة',
      onClick: () => this.openLessons(),
    });

    // alphabet wall strip
    AR_LETTERS.slice(0, 10).forEach((L, i) => {
      const card = put(g, box(.42, .5, .04, 0xffffff), -4.9 + i * .55, 3.6, -5.3);
      const t = textSprite(L, { color: '#5b2bd6', fontPx: 60, height: .34 });
      t.position.set(-4.9 + i * .55, 3.6, -5.26);
      g.add(t);
      this.addHit(card, {
        label: `حرف ${L}`,
        onClick: () => {
          this.game.audio.sfx('chime');
          if (!speak(L)) this.game.audio.note('bell', 72 + (i % 8) * 2, 0, .4, .4);
          this._lettersTapped = (this._lettersTapped || 0) + 1;
          if (this._lettersTapped >= 4 && !this.isStepDone('letters')) {
            this.step('letters');
            this.hint('رائع! جرّب لعبة المطابقة 🧠');
          }
        },
      });
    });

    // desks & chairs
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const x = -1.8 + c * 3.6, z = .4 + r * 2.2;
      const desk = tableLow(1.4, .8, .55, 0xffb74d);
      desk.position.set(x, 0, z);
      g.add(desk);
      put(desk, bookStack(2), -.4, .62, 0);
      const chair = smallChair(0xff8fab);
      chair.position.set(x, 0, z + .85);
      chair.rotation.y = Math.PI;
      g.add(chair);
      if (r === 0 && c === 0) this._seat = { x, z };
    }

    // number cards on the right wall
    for (let i = 1; i <= 5; i++) {
      const card = put(g, box(.42, .5, .04, 0xffffff), 5.4, 3.4 - (i - 1) * .62, -1.5);
      card.rotation.y = -Math.PI / 2;
      const t = textSprite(String(i), { color: '#e65100', fontPx: 64, height: .36 });
      t.position.set(5.36, 3.4 - (i - 1) * .62, -1.5);
      t.rotation.y = -Math.PI / 2;
      g.add(t);
    }

    put(g, rug(4, 3, 0xc8e6c9, { inner: 0xe8f5e9 }), 0, 0, 1.8);
    put(g, ceilingLamp(0x90caf9), 0, 4.55, 0);
    const globe = grp(g, 4.4, 0, 3);
    put(globe, cyl(.24, .3, .1, 0x8d6e63), 0, .3, 0);
    put(globe, sph(.32, 0x42a5f5), 0, .75, 0);
    put(globe, box(.5, .06, .14, 0x8d6e63), 0, 1.05, 0).rotation.z = .4;
    put(globe, sph(.08, 0x66bb6a), .18, .82, .18);
    put(globe, sph(.1, 0xa5d6a7), -.2, .68, -.12);
    this.addHit(globe, {
      label: 'الكرة الأرضية',
      onClick: () => {
        this.game.audio.sfx('magic');
        speak('الأرض كوكبنا الجميل');
        this.game.rewards.toast('الأرض كوكبنا الجميل! 🌍', '🌎');
      },
    });

    this.setSteps([
      { id: 'numbers', icon: '🔢', label: 'تعلّم الأرقام (لعبة الذاكرة)' },
      { id: 'letters', icon: '🔤', label: 'المس 4 حروف عربية' },
      { id: 'match', icon: '🧠', label: 'أكمل لعبة المطابقة' },
      { id: 'sort', icon: '🎨', label: 'فرز الألوان' },
    ]);
  }

  enter() {
    const b = this.addBaby(this._seat.x, this._seat.z + .85, Math.PI, 'sit');
    b.position.y = .32;
    this.addNPCBaby('lulu', this._seat.x + 3.6, this._seat.z + .85, Math.PI, 'sit');
    this.hint('اضغط السورة أو جرّب الحروف على الجدار! 📚');
  }

  _setBoard(t) {
    this.board.remove(this._boardText);
    this._boardText = textSprite(t, { color: '#ffffff', fontPx: 52, height: .42 });
    this._boardText.position.set(0, .25, .1);
    this.board.add(this._boardText);
  }

  openLessons() {
    const g = this.game;
    const wrap = document.createElement('div');
    const mk = (label, fn, cls = '') => {
      const b = document.createElement('button');
      b.className = 'btn ' + cls;
      b.textContent = label;
      b.onclick = () => { g.audio.sfx('click'); closeLessons(); fn(); };
      return b;
    };
    const closeLessons = g.ui.modal({ title: 'دروس المدرسة 📚', icon: '🎓', body: wrap, wide: true });
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center';
    row.append(
      mk('🔢 الأرقام 1-20', () => this._numbersLesson(), 'yellow'),
      mk('🌈 الألوان', () => this._colorsLesson(), 'pink'),
      mk('🔷 الأشكال', () => this._shapesLesson(), 'green'),
      mk('🐶 الحيوانات', () => this._animalsLesson(), ''),
      mk('🅰️ الحروف الإنجليزية', () => this._englishLesson(), 'ghost'),
      mk('🧠 لعبة المطابقة', () => this._matchGame(), 'pink'),
      mk('🎨 فرز الألوان', () => this._sortGame(), 'green'),
    );
    wrap.appendChild(row);
  }

  _numbersLesson() {
    const g = this.game;
    const holder = document.createElement('div');
    const close = g.ui.modal({ title: 'لعبة الذاكرة بالأرقام 🔢', icon: '🔢', body: holder });
    // memory game with number tiles (1-20 concepts: count 8 pairs of digits)
    memoryGame(holder, {
      pairs: 6,
      onDone: () => setTimeout(() => { close(); this.step('numbers'); this._setBoard('أحسنت! ١ ٢ ٣ ٤ ٥'); g.tasks.count('minigames'); }, 500),
    });
  }

  _colorsLesson() {
    const g = this.game;
    const wrap = document.createElement('div');
    COLORS.forEach(c => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.background = c.hex;
      b.style.width = '86px'; b.style.height = '64px';
      b.style.color = '#fff'; b.style.fontWeight = '900';
      b.textContent = c.ar;
      b.onclick = () => {
        g.audio.sfx('chime');
        if (!speak(c.ar)) g.audio.note('bell', 72, 0, .3, .4);
      };
      wrap.appendChild(b);
    });
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center';
    g.ui.modal({ title: 'تعلم الألوان 🌈', icon: '🌈', body: wrap });
  }

  _shapesLesson() {
    const g = this.game;
    const wrap = document.createElement('div');
    SHAPES.forEach(([em, ar]) => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.fontSize = '36px';
      b.style.width = '86px'; b.style.height = '70px';
      b.innerHTML = `${em}<br><small style="font-size:13px">${ar}</small>`;
      b.onclick = () => { g.audio.sfx('pop'); speak(ar); };
      wrap.appendChild(b);
    });
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center';
    g.ui.modal({ title: 'تعلم الأشكال 🔷', icon: '🔷', body: wrap });
  }

  _animalsLesson() {
    const g = this.game;
    const wrap = document.createElement('div');
    ANIMALS.forEach(([em, ar, snd]) => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.fontSize = '40px';
      b.style.width = '86px'; b.style.height = '84px';
      b.innerHTML = `${em}<br><small style="font-size:13px;color:#5b2bd6">${ar}</small>`;
      b.onclick = () => {
        g.audio.sfx(snd);
        speak(ar);
        this._animalsTapped = (this._animalsTapped || 0) + 1;
      };
      wrap.appendChild(b);
    });
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center';
    g.ui.modal({ title: 'أصوات الحيوانات 🐶', icon: '🐶', body: wrap });
  }

  _englishLesson() {
    const g = this.game;
    const wrap = document.createElement('div');
    'ABCDEFGHIJ'.split('').forEach((L, i) => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.fontSize = '30px';
      b.style.fontWeight = '900';
      b.style.color = '#1e88e5';
      b.textContent = L;
      b.onclick = () => {
        g.audio.sfx('chime');
        speak(L, 'en');
        g.audio.note('xylo', 72 + (i % 8) * 2, 0, .3, .3);
      };
      wrap.appendChild(b);
    });
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center';
    g.ui.modal({ title: 'English Letters 🅰️', icon: '🔤', body: wrap });
  }

  _matchGame() {
    const g = this.game;
    const holder = document.createElement('div');
    const close = g.ui.modal({ title: 'لعبة المطابقة 🧠', icon: '🧩', body: holder });
    const sets = [
      [
        { a: { t: '🐶', speak: () => speak('كلب') }, b: { t: 'كلب' } },
        { a: { t: '🐱', speak: () => speak('قط') }, b: { t: 'قط' } },
        { a: { t: '🐰', speak: () => speak('أرنب') }, b: { t: 'أرنب' } },
        { a: { t: '🍎', speak: () => speak('تفاح') }, b: { t: 'تفاح' } },
      ],
      [
        { a: { t: '1' }, b: { t: 'واحد' } },
        { a: { t: '2' }, b: { t: 'اثنان' } },
        { a: { t: '3' }, b: { t: 'ثلاثة' } },
        { a: { t: '5' }, b: { t: 'خمسة' } },
      ],
    ];
    pairMatch(holder, {
      pairs: sets[(Math.random() * sets.length) | 0],
      onDone: () => setTimeout(() => {
        close();
        this.step('match');
        this._setBoard('مطابقة مذهلة! ⭐');
        g.tasks.count('minigames');
        g.rewards.toast('مطابقة صحيحة! 🧠⭐', '🧠', 'gold');
      }, 500),
    });
  }

  _sortGame() {
    const g = this.game;
    const holder = document.createElement('div');
    const close = g.ui.modal({ title: 'فرز الألوان 🎨', icon: '🎨', body: holder });
    const items = ['🍎', '🍅', '🍓', '🫐', '🥥', '🌊', '🎁'].map(t => ({
      t, bin: ['🍎', '🍅', '🍓'].includes(t) ? 'red' : 'blue',
    }));
    binSort(holder, {
      title: 'فرز الفواكه والأشياء إلى سلتها!',
      items,
      bins: [
        { id: 'red', ar: 'أحمر', color: '#e53935', emoji: '🔴' },
        { id: 'blue', ar: 'أزرق', color: '#1e88e5', emoji: '🔵' },
      ],
      onDone: () => setTimeout(() => {
        close();
        this.step('sort');
        this._setBoard('فرز ممتاز! 🌈');
        g.tasks.count('minigames');
      }, 500),
    });
  }

  onAllStepsDone() {
    this._setBoard('أنت طالب ذكي! 🌟');
    this.game.rewards.celebrate('درس رائع! تعلمنا كثيرًا 🎓', '📚');
    const b = this.game.activeBaby;
    b.animator.play('clap', { loop: false, onDone: () => b.animator.play('sit') });
    this.game.audio.sfx('clap');
  }
}
