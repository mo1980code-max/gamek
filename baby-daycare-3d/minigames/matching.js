// minigames/matching.js — drag-free pair matching (tap a card, tap its pair).
// Used by the classroom for words↔pictures and animals↔sounds.
export function pairMatch(container, { pairs, onDone }) {
  // pairs: [{a: {t, speak}, b: {t}}] — a is the question card, b the answer
  const wrap = document.createElement('div');
  wrap.className = 'mg-wrap';
  const grid = document.createElement('div');
  grid.className = 'mg-toolbar';
  grid.style.maxWidth = '480px';
  const left = shuffle(pairs.map((p, i) => ({ ...p.a, pair: i })));
  const right = shuffle(pairs.map((p, i) => ({ ...p.b, pair: i })));
  let selA = null, done = 0;

  const mkCard = (item, side) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.minWidth = '86px';
    b.style.height = '64px';
    b.style.fontSize = side === 'a' ? '34px' : '17px';
    b.style.fontWeight = '800';
    b.style.color = '#5b2bd6';
    b.style.background = '#fff';
    b.textContent = item.t;
    b.onclick = () => {
      if (b.disabled) return;
      if (side === 'a') {
        window.game?.audio?.sfx('click');
        item.speak?.();
        selA?.el?.style?.setProperty('outline', '');
        selA = { item, el: b };
        b.style.outline = '4px solid #7c4dff';
        return;
      }
      if (!selA) { window.game?.audio?.sfx('error'); return; }
      if (selA.item.pair === item.pair) {
        selA.el.style.background = '#3ddc84';
        selA.el.style.color = '#fff';
        b.style.background = '#3ddc84';
        b.style.color = '#fff';
        selA.el.disabled = b.disabled = true;
        selA.el.style.outline = '';
        selA = null;
        done++;
        window.game?.audio?.sfx('match');
        if (done === pairs.length) { window.game?.audio?.sfx('complete'); onDone?.(); }
      } else {
        window.game?.audio?.sfx('wrong');
        selA.el.style.outline = '';
        selA = null;
      }
    };
    return b;
  };

  const colA = document.createElement('div');
  colA.style.cssText = 'display:flex;flex-direction:column;gap:8px';
  const colB = colA.cloneNode();
  left.forEach(i => colA.appendChild(mkCard(i, 'a')));
  right.forEach(i => colB.appendChild(mkCard(i, 'b')));
  const cols = document.createElement('div');
  cols.style.cssText = 'display:flex;gap:18px;justify-content:center;flex-wrap:wrap';
  cols.append(colA, colB);
  wrap.appendChild(cols);
  wrap.appendChild(Object.assign(document.createElement('div'), { innerHTML: '<small style="color:#8a6fc0">اضغط البطاقة ثم الزوج المناسب</small>' }));
  container.appendChild(wrap);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
