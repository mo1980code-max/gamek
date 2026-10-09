// minigames/sorting.js — bin sorting game (colors / categories).
// Tap an item then tap the right bin. Used by laundry & classroom.
export function binSort(container, { title, items, bins, onDone }) {
  // items: [{t, bin}]  bins: [{id, ar, color}]
  const wrap = document.createElement('div');
  wrap.className = 'mg-wrap';
  if (title) {
    const t = document.createElement('div');
    t.innerHTML = `<b>${title}</b>`;
    wrap.appendChild(t);
  }
  const pool = document.createElement('div');
  pool.className = 'mg-toolbar';
  const binRow = document.createElement('div');
  binRow.className = 'mg-toolbar';
  let selected = null, placed = 0;

  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  shuffled.forEach(it => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.fontSize = '30px';
    b.textContent = it.t;
    b.onclick = () => {
      pool.querySelectorAll('.swatch').forEach(s => s.style.outline = '');
      selected = { it, el: b };
      b.style.outline = '4px solid #7c4dff';
      window.game?.audio?.sfx('click');
    };
    pool.appendChild(b);
  });
  bins.forEach(bin => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.cssText += `width:96px;height:84px;background:${bin.color};color:#fff;font-weight:900;font-size:15px;flex-direction:column`;
    b.innerHTML = `${bin.emoji || ''}<br>${bin.ar}`;
    b.onclick = () => {
      if (!selected) { window.game?.audio?.sfx('error'); return; }
      if (selected.it.bin === bin.id) {
        selected.el.remove();
        placed++;
        window.game?.audio?.sfx('match');
        selected = null;
        if (placed === items.length) { window.game?.audio?.sfx('complete'); onDone?.(); }
      } else {
        window.game?.audio?.sfx('wrong');
        selected.el.style.outline = '';
        selected = null;
      }
    };
    binRow.appendChild(b);
  });
  wrap.append(pool, binRow);
  const hint = document.createElement('div');
  hint.innerHTML = '<small style="color:#8a6fc0">اختر قطعة ثم اضغط السلة الصحيحة</small>';
  wrap.appendChild(hint);
  container.appendChild(wrap);
}
