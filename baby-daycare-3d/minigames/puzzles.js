// minigames/puzzles.js — 2D puzzle mini-games (HTML DOM, touch friendly):
// slide puzzle, memory pairs, shadow match, size ordering, maze, find objects.
export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/* ============ slide puzzle ============ */
export function slidePuzzle(container, { size = 3, art = ['🍎', '🐥', '🌈', '🌟', '🎈', '🍭', '🐶', '🦋', '🚗'], onDone }) {
  const cells = [...art.slice(0, size * size - 1), null];
  let board = shuffle(cells.slice());
  while (!solvable(board, size)) board = shuffle(cells.slice());
  const wrap = el('div', 'mg-wrap');
  const boardEl = el('div', 'puz-board');
  boardEl.style.gridTemplateColumns = `repeat(${size}, 64px)`;
  const moves = el('div', '', '<b>التحركات: 0</b>');
  let moveN = 0;
  const render = () => {
    boardEl.innerHTML = '';
    board.forEach((v, i) => {
      const t = el('button', 'puz-tile' + (v === null ? ' empty' : ''));
      t.style.width = t.style.height = '64px';
      t.textContent = v ?? '';
      if (v !== null) t.onclick = () => {
        const empty = board.indexOf(null);
        if (neighbors(i, empty, size)) {
          [board[i], board[empty]] = [board[empty], board[i]];
          moveN++;
          moves.innerHTML = `<b>التحركات: ${moveN}</b>`;
          window.game?.audio?.sfx('puzzle');
          render();
          if (board.every((x, j) => x === cells[j])) {
            window.game?.audio?.sfx('complete');
            onDone?.(moveN);
          }
        }
      };
      boardEl.appendChild(t);
    });
  };
  render();
  wrap.append(boardEl, moves);
  container.appendChild(wrap);
}
const neighbors = (a, b, s) => {
  const ax = a % s, ay = (a / s) | 0, bx = b % s, by = (b / s) | 0;
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
};
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function solvable(b, s) {
  let inv = 0;
  const arr = b.filter(x => x !== null);
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      if (arr.indexOf(arr[i]) > arr.indexOf(arr[j])) inv++;
  if (s % 2 === 1) return inv % 2 === 0;
  return true;
}

/* ============ memory pairs ============ */
export function memoryGame(container, { pairs = 6, onDone } = {}) {
  const icons = ['🍎', '🐣', '🌸', '🚗', '🦋', '⭐', '🐳', '🍪'].slice(0, pairs);
  const deck = shuffle([...icons, ...icons]);
  const wrap = el('div', 'mg-wrap');
  const grid = el('div', 'mem-grid');
  grid.style.gridTemplateColumns = `repeat(4, 68px)`;
  let open = [], lock = false, found = 0;
  deck.forEach((ic, i) => {
    const c = el('button', 'mem-card');
    c.textContent = ic;
    c.onclick = () => {
      if (lock || c.classList.contains('up') || c.classList.contains('matched')) return;
      c.classList.add('up');
      window.game?.audio?.sfx('click');
      open.push({ ic, el: c });
      if (open.length === 2) {
        lock = true;
        if (open[0].ic === open[1].ic) {
          setTimeout(() => {
            open.forEach(o => o.el.classList.add('matched'));
            open = []; lock = false;
            found++;
            window.game?.audio?.sfx('match');
            if (found === pairs) { window.game?.audio?.sfx('complete'); onDone?.(); }
          }, 350);
        } else {
          setTimeout(() => {
            open.forEach(o => o.el.classList.remove('up'));
            open = []; lock = false;
            window.game?.audio?.sfx('wrong');
          }, 700);
        }
      }
    };
    grid.appendChild(c);
  });
  wrap.appendChild(grid);
  container.appendChild(wrap);
}

/* ============ shadow match ============ */
export function shadowMatch(container, { rounds = 5, onDone } = {}) {
  const animals = [['🐶', 'كلب'], ['🐱', 'قط'], ['🐰', 'أرنب'], ['🐻', 'دب'], ['🦁', 'أسد'], ['🐸', 'ضفدع'], ['🐼', 'باندا'], ['🐵', 'قرد']];
  const wrap = el('div', 'mg-wrap');
  let round = 0, score = 0;
  const title = el('div', '', '<b>أي الظلال يطابق الحيوان؟</b>');
  const q = el('div', '', '');
  q.style.fontSize = '64px';
  const opts = el('div', 'mg-toolbar');
  const render = () => {
    opts.innerHTML = '';
    const [animal] = animals[(Math.random() * animals.length) | 0];
    const choices = shuffle([animal, ...shuffle(animals.filter(a => a[0] !== animal).slice(0, 2).map(a => a[0]))]);
    q.innerHTML = `${animal} <span style="font-size:30px">= ؟</span>`;
    choices.forEach(ch => {
      const b = el('button', 'swatch');
      b.style.fontSize = '34px';
      b.style.filter = 'brightness(0)';           // shadow!
      b.textContent = ch;
      b.onclick = () => {
        if (ch === animal) {
          score++;
          window.game?.audio?.sfx('match');
        } else window.game?.audio?.sfx('wrong');
        if (++round >= rounds) {
          window.game?.audio?.sfx('complete');
          onDone?.(score);
        } else render();
      };
      opts.appendChild(b);
    });
  };
  render();
  wrap.append(title, q, opts);
  container.appendChild(wrap);
}

/* ============ size ordering ============ */
export function sizeOrder(container, { onDone } = {}) {
  const sets = [
    { emoji: '🐻', ar: 'رتب الدببة من الأصغر للأكبر' },
    { emoji: '🎈', ar: 'رتب البالونات' },
    { emoji: '🚗', ar: 'رتب السيارات' },
  ];
  const wrap = el('div', 'mg-wrap');
  const set = sets[(Math.random() * sets.length) | 0];
  const title = el('div', '', `<b>${set.ar}</b>`);
  const slotsRow = el('div', 'mg-toolbar');
  const slots = [26, 40, 56, 72];
  slots.forEach(s => {
    const slotEl = el('div', 'swatch');
    slotEl.style.width = slotEl.style.height = `${s + 14}px`;
    slotEl.style.border = '2px dashed #b39ddb';
    slotEl.style.background = '#f6f1ff';
    slotEl.dataset.want = s;
    slotsRow.appendChild(slotEl);
  });
  const pool = el('div', 'mg-toolbar');
  let correct = 0;
  shuffle(slots.slice()).forEach(s => {
    const b = el('button', 'swatch');
    b.style.width = b.style.height = `${s + 14}px`;
    b.style.fontSize = `${s * .6}px`;
    b.textContent = set.emoji;
    b.dataset.size = s;
    b.onclick = () => {
      const free = [...slotsRow.children].find(sl => !sl.dataset.filled);
      if (!free) return;
      if (+free.dataset.want === s) {
        free.textContent = set.emoji;
        free.style.fontSize = `${s * .6}px`;
        free.dataset.filled = '1';
        b.remove();
        correct++;
        window.game?.audio?.sfx('match');
        if (correct === 4) { window.game?.audio?.sfx('complete'); onDone?.(); }
      } else {
        window.game?.audio?.sfx('wrong');
      }
    };
    pool.appendChild(b);
  });
  wrap.append(title, slotsRow, el('div', '', '<small style="color:#8a6fc0">اضغط العنصر ثم مكانه الصحيح</small>'), pool);
  container.appendChild(wrap);
}

/* ============ simple maze ============ */
export function mazeGame(container, { level = 1, onDone } = {}) {
  const N = 5 + level * 2;
  // generate maze via randomized DFS
  const cells = Array.from({ length: N * N }, () => ({ walls: [true, true, true, true], seen: false }));
  const stack = [0];
  cells[0].seen = true;
  const DIRS = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % N, cy = (cur / N) | 0;
    const nbs = DIRS.map(([dx, dy, w, ow]) => [dx, dy, w, ow])
      .map(([dx, dy, w, ow]) => ({ nx: cx + dx, ny: cy + dy, w, ow }))
      .filter(({ nx, ny }) => nx >= 0 && ny >= 0 && nx < N && ny < N && !cells[ny * N + nx].seen);
    if (!nbs.length) { stack.pop(); continue; }
    const pick = nbs[(Math.random() * nbs.length) | 0];
    cells[cur].walls[pick.w] = false;
    cells[pick.ny * N + pick.nx].walls[pick.ow] = false;
    cells[pick.ny * N + pick.nx].seen = true;
    stack.push(pick.ny * N + pick.nx);
  }
  const wrap = el('div', 'mg-wrap');
  const grid = el('div', 'maze-grid');
  grid.style.gridTemplateColumns = `repeat(${N}, 28px)`;
  let pos = 0;
  const goal = N * N - 1;
  const draw = () => {
    grid.innerHTML = '';
    cells.forEach((cell, i) => {
      const d = el('div', 'maze-cell' + (i === goal ? ' goal' : ''));
      d.style.borderTop = cell.walls[0] ? '3px solid #7c4dff' : 'none';
      d.style.borderRight = cell.walls[1] ? '3px solid #7c4dff' : 'none';
      d.style.borderBottom = cell.walls[2] ? '3px solid #7c4dff' : 'none';
      d.style.borderLeft = cell.walls[3] ? '3px solid #7c4dff' : 'none';
      d.style.display = 'flex'; d.style.alignItems = 'center'; d.style.justifyContent = 'center';
      if (i === pos) d.textContent = '🐣';
      if (i === goal) d.textContent = d.textContent + '🏠';
      d.style.fontSize = '16px';
      d.onclick = () => {
        const cx = pos % N, cy = (pos / N) | 0;
        for (const [dx, dy, w] of DIRS) {
          if (cx + dx === i % N && cy + dy === ((i / N) | 0)) {
            // walls of current cell (stored symmetric during generation)
            if (!cells[pos].walls[w]) {
              pos = i;
              window.game?.audio?.sfx('step');
              draw();
              if (pos === goal) { window.game?.audio?.sfx('complete'); onDone?.(); }
            } else {
              window.game?.audio?.sfx('wrong');
            }
          }
        }
      };
      grid.appendChild(d);
    });
  };
  draw();
  wrap.append(el('div', '', '<b>اوصل الكتكوت إلى البيت! 🐣🏠</b>'), grid);
  container.appendChild(wrap);
}

/* ============ find hidden objects ============ */
export function findObjects(container, { onDone } = {}) {
  const all = ['🍎', '🎈', '🧸', '⚽', '🌸', '🦋', '🍪', '⭐', '🚗', '🐥', '🎁', '🌈'];
  const targets = shuffle(all.slice()).slice(0, 4);
  const field = shuffle(all.flatMap(i => Array(2).fill(i)));
  const wrap = el('div', 'mg-wrap');
  const list = el('div', 'mg-toolbar');
  const found = new Set();
  targets.forEach(t => {
    const chip = el('div', 'swatch');
    chip.style.fontSize = '26px';
    chip.textContent = t;
    chip.style.opacity = '1';
    list.appendChild(chip);
  });
  const area = el('div');
  area.style.cssText = 'display:grid;grid-template-columns:repeat(6,54px);gap:6px;background:#e8f6ff;padding:10px;border-radius:16px;';
  field.forEach(ic => {
    const b = el('button', 'swatch');
    b.style.width = b.style.height = '48px';
    b.style.fontSize = '24px';
    b.style.background = '#ffffff';
    b.textContent = ic;
    b.onclick = () => {
      if (targets.includes(ic) && !found.has(ic)) {
        found.add(ic);
        window.game?.audio?.sfx('match');
        const chip = [...list.children][targets.indexOf(ic)];
        chip.style.background = '#3ddc84';
        if (found.size === targets.length) { window.game?.audio?.sfx('complete'); onDone?.(); }
      } else {
        window.game?.audio?.sfx('click');
      }
    };
    area.appendChild(b);
  });
  wrap.append(el('div', '', '<b>ابحث عن الأشياء الأربعة!</b>'), list, area);
  container.appendChild(wrap);
}
