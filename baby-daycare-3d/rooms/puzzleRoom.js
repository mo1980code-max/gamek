// rooms/puzzleRoom.js — Puzzle Room: six real puzzle mini-games with 3
// difficulty levels: slide puzzle, memory, shadow match, size order, maze,
// find-the-object. Solving any puzzle counts toward rewards.
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, emojiSprite, textSprite, rug, ceilingLamp, tableLow, smallChair, shelfUnit, mat } from '../js/kit.js';
import { slidePuzzle, memoryGame, shadowMatch, sizeOrder, mazeGame, findObjects } from '../minigames/puzzles.js';

export class PuzzleRoom extends RoomBase {
  static def = {
    id: 'puzzleRoom', nameAr: 'غرفة الألغاز', nameEn: 'Puzzle Room', emoji: '🧩',
    color: '#7e57c2', color2: '#9575cd', music: 'learning', sky: 'indoor',
    rewardCoins: 20, rewardStars: 2, stat: 'puzzles',
  };

  build() {
    const g = this.group;
    this.shell({ w: 10.5, d: 10, h: 4.5, floor: 0xe8e0f5, wall: 0xf4f0fb, wallLeft: 0xefe8fa, wainscot: 0xb39ddb });

    // puzzle table
    const table = tableLow(2.4, 1.2, .55, 0xb39ddb);
    table.position.set(0, 0, -2.8);
    g.add(table);
    const puzzleBox = grp(table, 0, .62, 0);
    put(puzzleBox, box(.7, .12, .5, 0x7e57c2), -.6, 0, 0);
    put(puzzleBox, emojiSprite('🧩', { size: .4 }), -.6, .3, 0);
    put(puzzleBox, box(.5, .16, .4, 0x4dd0e1), .2, .02, .1);
    put(puzzleBox, emojiSprite('🎲', { size: .34 }), .55, .28, -.1);
    this.addHit(table, {
      label: 'طاولة الألغاز (ابدأ لعبة!)',
      onClick: () => this.openGames(),
    });

    // game posters
    const posters = [
      ['🧩', 0xef5350], ['🃏', 0xffca28], ['👤', 0x4dd0e1], ['📏', 0x66bb6a], ['🌀', 0xba68c8], ['🔍', 0xff8a65],
    ];
    posters.forEach(([em, col], i) => {
      const p = grp(g, -4 + i * 1.6, 2.8, -5.2);
      put(p, box(1.1, 1.3, .06, col), 0, 0, 0);
      put(p, box(1, 1.2, .04, 0xffffff), 0, 0, .04);
      put(p, emojiSprite(em, { size: .6 }), 0, .1, .08);
      this.addHit(p, { label: 'لغز', onClick: () => this.openGames() });
    });

    // shelves with puzzle boxes
    const sh = shelfUnit(2, 1.8, 0xffcc80, 3);
    sh.position.set(4.6, 0, -.8);
    sh.rotation.y = -Math.PI / 2;
    g.add(sh);
    for (let r = 0; r < 3; r++) {
      put(sh, box(.6, .3, .45, [0xef5350, 0x42a5f5, 0x66bb6a][r]), 0, .5 + r * .6, 0);
      put(sh, emojiSprite('🧩', { size: .3 }), 0, .78 + r * .6, 0);
    }
    this.addHit(sh, { label: 'رف الألغاز', onClick: () => this.openGames() });

    put(g, rug(3.4, 2.6, 0xd1c4e9, { inner: 0xede7f6 }), 0, 0, .8);
    put(g, ceilingLamp(0xb39ddb), 0, 4.5, 0);
    const sign = textSprite('عالم الألغاز 🧠', { color: '#4527a0', bg: 'rgba(255,255,255,.92)', fontPx: 50, height: .36 });
    sign.position.set(0, 4, -5.15);
    g.add(sign);

    this._solved = 0;
    this.setSteps([
      { id: 'solve', icon: '🧩', label: 'أكمل لغزين' },
    ]);
  }

  enter() {
    this.addBaby(1.6, 1.4, -.6, 'idle');
    this.addNPCBaby('coco', -1.6, .4, 2.4, 'sit');
    this.hint('اضغط الطاولة واختر لعبة الألغاز المفضلة! 🧩');
  }

  openGames() {
    const g = this.game;
    const wrap = document.createElement('div');
    // difficulty
    const diffRow = document.createElement('div');
    diffRow.className = 'wd-cats';
    let diff = 1;
    const diffs = [['سهل', 1], ['متوسط', 2], ['صعب', 3]];
    const diffBtns = diffs.map(([ar, v]) => {
      const b = document.createElement('button');
      b.className = 'wd-cat' + (v === 1 ? ' sel' : '');
      b.textContent = ar;
      b.onclick = () => { diff = v; diffBtns.forEach(x => x.classList.remove('sel')); b.classList.add('sel'); g.audio.sfx('click'); };
      diffRow.appendChild(b);
      return b;
    });
    wrap.appendChild(diffRow);
    const games = document.createElement('div');
    games.className = 'map-grid';
    games.style.gridTemplateColumns = 'repeat(3, 1fr)';
    const defs = [
      { emoji: '🧩', ar: 'تركيب الصور', fn: () => this._run(`تركيب الصور 🧩`, slidePuzzle, { size: 2 + diff }) },
      { emoji: '🃏', ar: 'لعبة الذاكرة', fn: () => this._run(`لعبة الذاكرة 🃏`, memoryGame, { pairs: 3 + diff * 2 }) },
      { emoji: '👤', ar: 'مطابقة الظلال', fn: () => this._run(`مطابقة الظلال 👤`, shadowMatch, { rounds: 3 + diff }) },
      { emoji: '📏', ar: 'ترتيب الأحجام', fn: () => this._run(`ترتيب الأحجام 📏`, sizeOrder, {}) },
      { emoji: '🌀', ar: 'المتاهة', fn: () => this._run(`المتاهة 🌀`, mazeGame, { level: diff }) },
      { emoji: '🔍', ar: 'اعثر على الأشياء', fn: () => this._run(`ابحث عن الأشياء 🔍`, findObjects, {}) },
    ];
    for (const d of defs) {
      const card = document.createElement('button');
      card.className = 'room-card';
      card.style.background = 'linear-gradient(135deg,#7e57c2,#9575cd)';
      card.innerHTML = `<span class="rc-emoji">${d.emoji}</span><span>${d.ar}</span>`;
      card.onclick = () => { g.audio.sfx('click'); closeGames(); d.fn(); };
      games.appendChild(card);
    }
    wrap.appendChild(games);
    const closeGames = g.ui.modal({ title: 'ألغاز الحضانة 🧩', icon: '🧩', body: wrap, wide: true });
  }

  _run(title, maker, opts) {
    const g = this.game;
    const holder = document.createElement('div');
    const close = g.ui.modal({ title, icon: '🧩', body: holder });
    maker(holder, {
      ...opts,
      onDone: () => setTimeout(() => {
        close();
        this._solved++;
        this.game.tasks.count('puzzles');
        this.game.audio.sfx('complete');
        this.game.fx.burstStars({ x: this.game.activeBaby.position.x, y: 1.8, z: this.game.activeBaby.position.z }, 16);
        if (this._solved >= 2 && !this.isStepDone('solve')) this.step('solve');
        this.game.rewards.toast(`حللت اللغز! (${this._solved}) 🧩⭐`, '🧠', 'gold');
        const b = this.game.activeBaby;
        b.setExpression('excited');
        b.animator.play('clap', { loop: false, onDone: () => b.animator.play('idle') });
      }, 450),
    });
  }

  onAllStepsDone() {
    this.game.rewards.celebrate('عقل حلوار! حللت كل الألغاز 🧠🏆', '🧩');
  }
}
