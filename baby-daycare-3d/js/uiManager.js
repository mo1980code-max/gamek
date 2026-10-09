// uiManager.js — all DOM UI: loading, main menu, HUD, bottom nav,
// room map, baby picker, tasks, settings, generic modals, room guides.
import { TASKS } from './taskManager.js';
import { NEED_META } from './babyAI.js';
import { ROOM_DEFS } from '../rooms/index.js';
import { BABIES } from './baby.js';

const $ = s => document.querySelector(s);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

export class UIManager {
  constructor(game) {
    this.game = game;
    this.loading = $('#loading');
    this.menu = $('#menu');
    this.hud = $('#hud');
    this.overlayRoot = $('#overlay-root');
    this.stepsEl = $('#room-steps');
    this.hintEl = $('#room-hint');
    this.needsEl = $('#need-bars');
    this.openPanel = null;
    this._wireMenu();
    this._wireHud();
  }

  /* ============ loading ============ */
  showLoading(pct, tip) {
    this.loading.classList.remove('hidden');
    $('#loading-bar').style.width = `${Math.round(pct * 100)}%`;
    if (tip) $('#loading-tip').textContent = tip;
  }
  hideLoading() { this.loading.classList.add('hidden'); }

  /* ============ menu ============ */
  _wireMenu() {
    const g = this.game;
    $('#btn-play').onclick = () => { g.audio.sfx('unlock'); g.startPlay(); };
    $('#btn-babies').onclick = () => { g.audio.sfx('click'); this.openBabies(); };
    $('#btn-rooms').onclick = () => { g.audio.sfx('click'); this.openMap(); };
    $('#btn-dress').onclick = () => { g.audio.sfx('click'); g.startPlay('dressRoom'); };
    $('#btn-rewards').onclick = () => { g.audio.sfx('click'); this.openTasks(); };
    $('#btn-settings').onclick = () => { g.audio.sfx('click'); this.openSettings(); };
  }
  showMenu() {
    this.menu.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.closeAll();
    this.setSteps(null);
    this.setHint(null);
  }
  hideMenu() { this.menu.classList.add('hidden'); }

  /* ============ HUD ============ */
  _wireHud() {
    const g = this.game;
    $('#hud-settings').onclick = () => { g.audio.sfx('click'); this.openSettings(); };
    $('#hud-sound').onclick = () => {
      const d = g.save.data.settings;
      d.muted = !d.muted;
      g.audio.setMuted(d.muted);
      this.updateHud();
      g.audio.sfx('toggle');
    };
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.onclick = () => {
        g.audio.sfx('click');
        const nav = b.dataset.nav;
        if (nav === 'home') g.gotoHall();
        else if (nav === 'babies') this.openBabies();
        else if (nav === 'rooms') this.openMap();
        else if (nav === 'tasks') this.openTasks();
        else if (nav === 'shop') g.enterRoom('shop');
      };
    });
  }
  showHud(v) { this.hud.classList.toggle('hidden', !v); }
  updateHud() {
    const d = this.game.save.data;
    $('#hud-coins').textContent = d.coins;
    $('#hud-stars').textContent = d.stars;
    $('#hud-sound').textContent = d.settings.muted ? '🔇' : '🔊';
  }
  setRoomInfo(text) { $('#hud-room').textContent = text; }

  /* ============ room guidance ============ */
  setSteps(steps) {
    if (!steps || !steps.length) { this.stepsEl.classList.add('hidden'); this.stepsEl.innerHTML = ''; return; }
    this.stepsEl.classList.remove('hidden');
    this.stepsEl.innerHTML = '';
    for (const s of steps) {
      const chip = el('div', `step-chip ${s.done ? 'done' : s.now ? 'now' : ''}`);
      chip.innerHTML = `<span>${s.done ? '✅' : s.icon || '⭕'}</span><span>${s.label}</span>`;
      this.stepsEl.appendChild(chip);
    }
  }
  setHint(text) {
    if (!text) { this.hintEl.classList.add('hidden'); return; }
    this.hintEl.classList.remove('hidden');
    this.hintEl.textContent = text;
  }
  showNeedBars(v) { this.needsEl.classList.toggle('hidden', !v); }
  updateNeedBars(baby) {
    if (!baby) { this.showNeedBars(false); return; }
    this.showNeedBars(true);
    const n = baby.needs;
    if (!this.needsEl.dataset.built || this.needsEl.dataset.baby !== baby.babyId) {
      this.needsEl.dataset.built = '1';
      this.needsEl.dataset.baby = baby.babyId;
      this.needsEl.innerHTML = '';
      for (const key of Object.keys(NEED_META)) {
        const m = NEED_META[key];
        const row = el('div', 'need-bar', `<span>${m.icon}</span><div class="nb-track"><div class="nb-fill" data-k="${key}" style="background:${m.color}"></div></div>`);
        this.needsEl.appendChild(row);
      }
    }
    for (const key of Object.keys(NEED_META)) {
      const fill = this.needsEl.querySelector(`[data-k="${key}"]`);
      const v = n[key];
      fill.style.width = `${v}%`;
      fill.parentElement.parentElement.classList.toggle('low', v < 30);
    }
  }

  hoverLabel(text) {
    let tip = $('#hover-tip');
    if (!text) { tip?.remove(); return; }
    if (!tip) {
      tip = el('div', '', '');
      tip.id = 'hover-tip';
      tip.style.cssText = 'position:absolute;z-index:25;top:calc(110px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);background:#3c2a5de0;color:#fff;padding:6px 14px;border-radius:999px;font-weight:800;font-size:13px;pointer-events:none;';
      this.hud.appendChild(tip);
    }
    tip.textContent = text;
  }

  /* ============ generic modal ============ */
  modal({ title, icon = '', body, foot = [], wide = false, onClose }) {
    this.closeAll();
    this.overlayRoot.classList.remove('hidden');
    this.overlayRoot.innerHTML = '';
    const panel = el('div', 'panel');
    if (wide) panel.style.width = 'min(760px, 96vw)';
    const head = el('div', 'panel-head', `<span style="font-size:26px">${icon}</span><h2>${title}</h2>`);
    const closeBtn = el('button', 'panel-close', '✕');
    head.appendChild(closeBtn);
    panel.appendChild(head);
    const bodyEl = el('div', 'panel-body');
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else bodyEl.appendChild(body);
    panel.appendChild(bodyEl);
    if (foot.length) {
      const footEl = el('div', 'panel-foot');
      for (const b of foot) footEl.appendChild(b);
      panel.appendChild(footEl);
    }
    this.overlayRoot.appendChild(panel);
    const close = () => {
      this.overlayRoot.classList.add('hidden');
      this.overlayRoot.innerHTML = '';
      this.openPanel = null;
      onClose?.();
    };
    closeBtn.onclick = () => { this.game.audio.sfx('click'); close(); };
    this.overlayRoot.onclick = e => { if (e.target === this.overlayRoot) close(); };
    this.openPanel = { close, kind: title };
    return close;
  }
  closeAll() {
    this.overlayRoot.classList.add('hidden');
    this.overlayRoot.innerHTML = '';
    this.openPanel = null;
  }
  refreshOpenPanels() {
    if (!this.openPanel) return;
    const kind = this.openPanel.kind;
    if (kind === 'المهام اليومية 📋' || kind === 'المكافآت 🏆') this.openTasks();
    else if (kind === 'اختر طفلك 👶') this.openBabies();
  }

  /* ============ room map ============ */
  openMap() {
    const g = this.game;
    const grid = el('div', 'map-grid');
    for (const rd of ROOM_DEFS) {
      const card = el('button', 'room-card');
      card.style.background = `linear-gradient(135deg, ${rd.color}, ${rd.color2})`;
      card.innerHTML = `<span class="rc-emoji">${rd.emoji}</span><span>${rd.nameAr}</span><small>${rd.nameEn}</small>`;
      card.onclick = () => {
        g.audio.sfx('doorOpen');
        g.enterRoom(rd.id);
      };
      grid.appendChild(card);
    }
    this.modal({ title: 'خريطة الحضانة 🗺️', icon: '🗺️', body: grid });
  }

  /* ============ baby picker ============ */
  openBabies() {
    const g = this.game;
    const wrap = el('div');
    const grid = el('div', 'baby-grid');
    const render = () => {
      grid.innerHTML = '';
      for (const cfg of BABIES) {
        const baby = g.babyReg.get(cfg.id);
        const card = el('button', 'baby-card' + (g.save.data.selectedBaby === cfg.id ? ' selected' : ''));
        const n = baby.needs;
        const bar = k => {
          const m = NEED_META[k];
          return `<div class="bc-need"><span>${m.icon}</span><div class="track"><div class="fill" style="width:${n[k]}%;background:${m.color}"></div></div></div>`;
        };
        card.innerHTML = `
          <span class="bc-face">${cfg.emoji}</span>
          <span class="bc-name">${cfg.nameAr}</span>
          <span class="bc-like">${cfg.likesAr}</span>
          <div class="bc-needs">${bar('hunger')}${bar('energy')}${bar('happiness')}${bar('hygiene')}</div>`;
        card.onclick = () => {
          g.selectBaby(cfg.id);
          g.audio.sfx('babble');
          render();
        };
        grid.appendChild(card);
      }
    };
    render();
    wrap.appendChild(grid);
    const tip = el('div', '', '<small style="color:#8a6fc0">اضغط على طفل لاختياره والاعتناء به 💖</small>');
    tip.style.marginTop = '10px';
    wrap.appendChild(tip);
    this.modal({ title: 'اختر طفلك 👶', icon: '👶', body: wrap });
    this._babyPanelTimer = setInterval(() => { if (!this.openPanel) clearInterval(this._babyPanelTimer); else render(); }, 2500);
  }

  /* ============ tasks ============ */
  openTasks() {
    const g = this.game;
    const wrap = el('div');
    const d = g.save.data;
    const head = el('div', '', `<div style="font-weight:900;margin-bottom:10px">✨ المهام اليومية — تجمع مكافآتها بالعملات والنجوم!</div>`);
    wrap.appendChild(head);
    let doneCount = 0;
    for (const task of TASKS) {
      const p = g.tasks.progressOf(task);
      const done = g.tasks.isDone(task);
      const claimed = g.tasks.isClaimed(task);
      if (claimed) doneCount++;
      const row = el('div', `task-row ${claimed ? 'done' : ''}`);
      row.innerHTML = `
        <span class="t-icon">${task.icon}</span>
        <div class="t-mid">
          <div class="t-title">${task.titleAr}</div>
          <div class="t-track"><div class="t-fill" style="width:${(p / task.target) * 100}%"></div></div>
        </div>
        <div style="text-align:center">
          <div class="t-reward">+${task.coins}🪙 +${task.stars}⭐</div>
          <div style="font-size:12px;color:#8a6fc0;font-weight:800">${Math.min(p, task.target)}/${task.target} ${claimed ? '✅' : ''}</div>
        </div>`;
      wrap.appendChild(row);
    }
    const total = TASKS.length;
    const summary = el('div', '', `<div style="text-align:center;font-weight:900;color:#6b4fa8">أُنجزت ${doneCount} من ${total} مهام اليوم ${doneCount === total ? '— أنظر! ممتاز! 🏆' : '💪'}</div>`);
    wrap.appendChild(summary);
    this.modal({ title: 'المهام اليومية 📋', icon: '📋', body: wrap });
  }

  /* ============ settings ============ */
  openSettings() {
    const g = this.game;
    const d = g.save.data.settings;
    const wrap = el('div');
    const row = (icon, label, input) => {
      const r = el('div', 'set-row', `<span class="s-icon">${icon}</span><span style="min-width:74px">${label}</span>`);
      r.appendChild(input);
      return r;
    };
    const music = el('input'); music.type = 'range'; music.min = 0; music.max = 1; music.step = .05; music.value = d.music;
    music.oninput = () => { d.music = +music.value; g.audio.setMusic(d.music); };
    const sfx = el('input'); sfx.type = 'range'; sfx.min = 0; sfx.max = 1; sfx.step = .05; sfx.value = d.sfx;
    sfx.oninput = () => { d.sfx = +sfx.value; g.audio.setSfx(d.sfx); g.audio.sfx('pop'); };
    const mute = el('button', 'btn small ' + (d.muted ? '' : 'green'), d.muted ? '🔇 الصوت مغلق' : '🔊 الصوت يعمل');
    mute.onclick = () => { d.muted = !d.muted; g.audio.setMuted(d.muted); this.updateHud(); this.openSettings(); };
    const quality = el('button', 'btn small ghost', g.scenes.quality === 'high' ? '✨ جودة عالية' : '⚡ جودة موفّرة');
    quality.onclick = () => { g.scenes.setQuality(g.scenes.quality === 'high' ? 'low' : 'high'); this.openSettings(); };
    const reset = el('button', 'danger-btn', '🗑️ مسح كل التقدم');
    reset.onclick = () => {
      const yes = el('button', 'btn pink', 'نعم، امسح');
      const no = el('button', 'btn ghost', 'إلغاء');
      no.onclick = () => this.closeAll();
      yes.onclick = () => { g.save.reset(); location.reload(); };
      const b = el('div', '', '<div style="font-weight:800;margin-bottom:14px">هل أنت متأكد؟ سيُمسح كل التقدم والعملات!</div>');
      const rowB = el('div'); rowB.style.display = 'flex'; rowB.style.gap = '10px'; rowB.style.justifyContent = 'center';
      rowB.append(no, yes); b.appendChild(rowB);
      this.modal({ title: 'مسح التقدم ⚠️', icon: '🗑️', body: b });
    };
    wrap.append(
      row('🎵', 'الموسيقى', music),
      row('🔔', 'المؤثرات', sfx),
      row('🔈', 'الصوت', mute),
      row('⚙️', 'الرسوم', quality),
      el('div', '', '<small style="color:#8a6fc0">اللعبة تحفظ تقدمك تلقائيًا 💾</small>'),
    );
    const spacer = el('div'); spacer.style.height = '10px'; wrap.appendChild(spacer);
    wrap.appendChild(reset);
    this.modal({ title: 'الإعدادات ⚙️', icon: '⚙️', body: wrap });
  }

  /* ============ photo modal ============ */
  photoModal(dataURL, caption) {
    const g = this.game;
    const pol = el('div', 'polaroid');
    const img = el('img'); img.src = dataURL; img.alt = caption;
    pol.appendChild(img);
    pol.appendChild(el('div', 'p-cap', `📸 ${caption}`));
    const dl = el('button', 'btn small green', '💾 احفظ الصورة');
    dl.onclick = () => {
      const a = document.createElement('a');
      a.href = dataURL; a.download = `${caption.replace(/\s+/g, '_')}.png`;
      a.click();
      g.audio.sfx('success');
    };
    const share = el('button', 'btn small yellow', '⭐ +5 نجوم');
    share.onclick = () => {
      g.rewards.grant(0, 5);
      g.save.data.photos++;
      share.disabled = true; share.textContent = '⭐ تم!';
    };
    this.modal({ title: 'صورة رائعة! 📸', icon: '📸', body: pol, foot: [share, dl] });
    g.audio.sfx('camera');
  }
}
