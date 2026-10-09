// minigames/music.js — tone-echo memory game driven by the room's instruments.
// The system plays a sequence of colored notes; the player repeats it.
export function toneEchoGame(container, { bars, playNote, onDone }) {
  // bars: array of {midi, color, label}
  const wrap = el2('div', 'mg-wrap');
  const title = el2('div', '', '<b>استمع للنغمات ثم أعدها!</b> 🎵');
  const status = el2('div', '', 'استعد…');
  status.style.fontWeight = '800';
  const row = el2('div', 'mg-toolbar');
  bars.forEach((b, i) => {
    const btn = el2('button', 'swatch');
    btn.style.background = b.color;
    btn.style.width = '54px';
    btn.style.height = '72px';
    btn.style.fontSize = '22px';
    btn.textContent = b.label || (i + 1);
    btn.onclick = () => {
      playNote(b.midi);
      handleInput(i);
    };
    row.appendChild(btn);
  });
  wrap.append(title, status, row);
  container.appendChild(wrap);

  let seq = [];
  let inputIdx = 0;
  let level = 1;
  const maxLevel = 4;

  function flash(i) {
    const btn = row.children[i];
    btn.style.transform = 'scale(1.15)';
    setTimeout(() => { btn.style.transform = ''; }, 220);
  }
  function playSeq() {
    status.textContent = 'استمع… 👂';
    lock = true;
    seq.forEach((i, k) => {
      setTimeout(() => {
        playNote(bars[i].midi);
        flash(i);
        if (k === seq.length - 1) setTimeout(() => { status.textContent = 'دورك! 🎹'; lock = false; inputIdx = 0; }, 350);
      }, 700 * k + 500);
    });
  }
  let lock = true;
  function handleInput(i) {
    if (lock) return;
    flash(i);
    if (seq[inputIdx] === i) {
      inputIdx++;
      if (inputIdx >= seq.length) {
        window.game?.audio?.sfx('success');
        if (level >= maxLevel) {
          status.textContent = 'رائع! أكملت كل المستويات! 🏆';
          onDone?.(level);
          return;
        }
        level++;
        status.textContent = 'أحسنت! المستوى التالي…';
        setTimeout(next, 1200);
      }
    } else {
      window.game?.audio?.sfx('wrong');
      status.textContent = 'حاول مرة أخرى 🎯';
      setTimeout(playSeq, 900);
    }
  }
  function next() {
    seq = Array.from({ length: level + 2 }, () => (Math.random() * bars.length) | 0);
    playSeq();
  }
  setTimeout(next, 600);
}

function el2(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
