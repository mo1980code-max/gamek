// minigames/coloring.js — HTML Canvas coloring studio with touch support.
// Outline pages drawn programmatically, crayon brush, flood fill, stickers,
// eraser, save PNG. Real coverage detection for the reward.
import { makeCanvasTexture } from '../js/kit.js';

export const PAGES = {
  cat: {
    ar: 'قطة لطيفة', draw: (c, W, H) => {
      c.lineWidth = 5; c.strokeStyle = '#333';
      c.beginPath(); c.arc(W / 2, H * .55, W * .26, 0, Math.PI * 2); c.stroke();          // face
      c.beginPath(); c.moveTo(W * .27, H * .38); c.lineTo(W * .24, H * .18); c.lineTo(W * .4, H * .3); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(W * .73, H * .38); c.lineTo(W * .76, H * .18); c.lineTo(W * .6, H * .3); c.closePath(); c.stroke();
      c.beginPath(); c.arc(W * .4, H * .52, W * .035, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(W * .6, H * .52, W * .035, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(W * .46, H * .62); c.quadraticCurveTo(W * .5, H * .67, W * .54, H * .62); c.stroke();
      // body
      c.beginPath(); c.ellipse(W / 2, H * .85, W * .2, H * .12, 0, Math.PI, 0); c.stroke();
    },
  },
  house: {
    ar: 'منزل جميل', draw: (c, W, H) => {
      c.lineWidth = 5; c.strokeStyle = '#333';
      c.strokeRect(W * .25, H * .45, W * .5, H * .4);
      c.beginPath(); c.moveTo(W * .2, H * .45); c.lineTo(W * .5, H * .2); c.lineTo(W * .8, H * .45); c.closePath(); c.stroke();
      c.strokeRect(W * .43, H * .62, W * .14, H * .23);
      c.strokeRect(W * .3, H * .52, W * .1, H * .1);
      c.strokeRect(W * .6, H * .52, W * .1, H * .1);
      c.beginPath(); c.arc(W * .82, H * .16, W * .06, 0, Math.PI * 2); c.stroke();
    },
  },
  flower: {
    ar: 'زهرة ملوّنة', draw: (c, W, H) => {
      c.lineWidth = 5; c.strokeStyle = '#333';
      c.beginPath(); c.moveTo(W / 2, H * .9); c.quadraticCurveTo(W * .45, H * .6, W / 2, H * .5); c.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.beginPath();
        c.ellipse(W / 2 + Math.cos(a) * W * .14, H * .38 + Math.sin(a) * W * .14, W * .11, W * .07, a, 0, Math.PI * 2);
        c.stroke();
      }
      c.beginPath(); c.arc(W / 2, H * .38, W * .07, 0, Math.PI * 2); c.stroke();
    },
  },
  fish: {
    ar: 'سمكة مرحة', draw: (c, W, H) => {
      c.lineWidth = 5; c.strokeStyle = '#333';
      c.beginPath(); c.ellipse(W * .48, H * .5, W * .24, H * .16, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(W * .72, H * .5); c.lineTo(W * .88, H * .38); c.lineTo(W * .88, H * .62); c.closePath(); c.stroke();
      c.beginPath(); c.arc(W * .38, H * .46, W * .025, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(W * .42, H * .56, W * .05, 0, Math.PI); c.stroke();
    },
  },
  butterfly: {
    ar: 'فراشة', draw: (c, W, H) => {
      c.lineWidth = 5; c.strokeStyle = '#333';
      c.beginPath(); c.ellipse(W / 2, H * .5, W * .03, H * .2, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(W * .36, H * .4, W * .13, H * .12, -.4, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(W * .64, H * .4, W * .13, H * .12, .4, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(W * .38, H * .64, W * .1, H * .09, -.3, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(W * .62, H * .64, W * .1, H * .09, .3, 0, Math.PI * 2); c.stroke();
    },
  },
  blank: { ar: 'رسم حر', draw: () => {} },
};

export class ColoringGame {
  // container: DOM element to mount into. onDone(coverage) fired on save.
  constructor(container, { onDone, size = 380 } = {}) {
    this.onDone = onDone;
    this.page = 'cat';
    this.color = '#ff6fb5';
    this.mode = 'fill';
    this.W = size; this.H = Math.round(size * .82);

    const wrap = document.createElement('div');
    wrap.className = 'mg-wrap';
    // page selector
    const pages = document.createElement('div');
    pages.className = 'mg-toolbar';
    for (const [id, p] of Object.entries(PAGES)) {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.fontSize = '13px';
      b.style.width = 'auto'; b.style.padding = '0 10px'; b.style.background = '#eee5fa'; b.style.color = '#6b4fa8'; b.style.fontWeight = '800';
      b.textContent = p.ar;
      b.onclick = () => { this.page = id; this._initCanvas(); this._sync(pages); };
      b.dataset.id = id;
      pages.appendChild(b);
    }
    // canvas
    this.cv = document.createElement('canvas');
    this.cv.className = 'mg-canvas';
    this.cv.width = this.W; this.cv.height = this.H;
    this.cv.style.width = `${Math.min(size, container.clientWidth - 24)}px`;
    // palette
    const pal = document.createElement('div');
    pal.className = 'mg-toolbar';
    const colors = ['#ff6b6b', '#ff9f43', '#ffd93c', '#3ddc84', '#26c6da', '#448aff', '#7c4dff', '#ff6fb5', '#8d6e63', '#ffffff', '#212121'];
    colors.forEach(c => {
      const s = document.createElement('button');
      s.className = 'swatch';
      s.style.background = c;
      s.onclick = () => { this.color = c; this.mode = c === '#ffffff' ? 'eraser' : this._lastMode || 'fill'; this._sync(pal); };
      s.dataset.c = c;
      pal.appendChild(s);
    });
    // modes
    const tools = document.createElement('div');
    tools.className = 'mg-toolbar';
    const mk = (label, mode) => {
      const b = document.createElement('button');
      b.className = 'btn small ghost';
      b.textContent = label;
      b.onclick = () => { if (mode === 'fill' || mode === 'brush') this._lastMode = mode; this.mode = mode; this._sync(tools); };
      b.dataset.mode = mode;
      return b;
    };
    tools.append(mk('🎨 تعبئة', 'fill'), mk('🖌️ فرشاة', 'brush'), mk('⭐ ملصقات', 'sticker'), mk('🗑️ مسح الكل', 'clear'));
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn small green';
    saveBtn.textContent = '💾 احفظ اللوحة';
    saveBtn.onclick = () => this._save();

    wrap.append(pages, this.cv, pal, tools, saveBtn);
    container.appendChild(wrap);
    this._toolbars = [pages, pal, tools];
    this._stickers = ['⭐', '❤️', '🌈', '🌸', '🦋', '☀️'];
    this._stickerIdx = 0;
    this._initCanvas();
    this._sync(this._toolbars);
    this._wirePointer();
  }

  _initCanvas() {
    const c = this.cv.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, this.W, this.H);
    PAGES[this.page].draw(c, this.W, this.H);
    this._snapshot = c.getImageData(0, 0, this.W, this.H);
    this._painted = new Set(); // filled pixel cells
  }

  _sync(scope) {
    for (const tb of this._toolbars) {
      tb.querySelectorAll('.swatch').forEach(s => {
        if (s.dataset.c) s.classList.toggle('sel', s.dataset.c === this.color && this.mode !== 'sticker');
      });
      tb.querySelectorAll('[data-mode]').forEach(b => {
        if (tb === this._toolbars[2]) b.classList.toggle('sel', false);
        b.style.outline = b.dataset.mode === this.mode ? '3px solid #7c4dff' : '';
      });
      tb.querySelectorAll('[data-id]').forEach(b => {
        b.style.background = b.dataset.id === this.page ? '#7c4dff' : '#eee5fa';
        b.style.color = b.dataset.id === this.page ? '#fff' : '#6b4fa8';
      });
    }
    void scope;
  }

  _wirePointer() {
    let painting = false;
    const pos = e => {
      const r = this.cv.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width * this.W,
        y: (e.clientY - r.top) / r.height * this.H,
      };
    };
    this.cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      const p = pos(e);
      if (this.mode === 'fill') this._floodFill(p.x | 0, p.y | 0);
      else if (this.mode === 'sticker') this._stamp(p.x, p.y);
      else { painting = true; this._brush(p.x, p.y); }
    });
    this.cv.addEventListener('pointermove', e => {
      if (!painting) return;
      const p = pos(e);
      this._brush(p.x, p.y);
    });
    window.addEventListener('pointerup', () => { painting = false; }, { once: true });
  }

  _brush(x, y) {
    const c = this.cv.getContext('2d');
    c.fillStyle = this.mode === 'eraser' ? '#ffffff' : this.color;
    c.beginPath();
    c.arc(x, y, 9, 0, Math.PI * 2);
    c.fill();
  }

  _stamp(x, y) {
    const c = this.cv.getContext('2d');
    c.font = '42px serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(this._stickers[this._stickerIdx], x, y);
  }

  _floodFill(x, y) {
    const c = this.cv.getContext('2d');
    const img = c.getImageData(0, 0, this.W, this.H);
    const data = img.data;
    const idx = (x, y) => (y * this.W + x) * 4;
    const start = idx(x, y);
    const target = [data[start], data[start + 1], data[start + 2]];
    const hex = this.mode === 'eraser' ? [255, 255, 255] : this._hexToRgb(this.color);
    if (target[0] === hex[0] && target[1] === hex[1] && target[2] === hex[2]) return;
    const match = i => Math.abs(data[i] - target[0]) < 32 && Math.abs(data[i + 1] - target[1]) < 32 && Math.abs(data[i + 2] - target[2]) < 32;
    const stack = [[x, y]];
    let painted = 0;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= this.W || cy >= this.H) continue;
      const i = idx(cx, cy);
      if (!match(i)) continue;
      data[i] = hex[0]; data[i + 1] = hex[1]; data[i + 2] = hex[2]; data[i + 3] = 255;
      painted++;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    c.putImageData(img, 0, 0);
    if (painted > 40) {
      // soft pop sound via game
      window.game?.audio?.sfx('bubble');
    }
  }

  _hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  _coverage() {
    const c = this.cv.getContext('2d');
    const img = c.getImageData(0, 0, this.W, this.H).data;
    let colored = 0, total = 0;
    for (let i = 0; i < this._snapshot.data.length; i += 16) {
      total++;
      const a = this._snapshot.data[i], b = img[i];
      const ag = this._snapshot.data[i + 1], bg2 = img[i + 1];
      if (Math.abs(a - b) > 18 || Math.abs(ag - bg2) > 18) colored++;
    }
    return total ? colored / total : 0;
  }

  _save() {
    const cov = this._coverage();
    const url = this.cv.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `رسمة_${PAGES[this.page].ar}.png`;
    a.click();
    window.game?.audio?.sfx('success');
    this.onDone?.(cov, url);
  }
}
