// game.js — central orchestrator wiring every system together.
import * as THREE from 'three';
import { SceneManager } from './sceneManager.js';
import { CameraRig } from './camera.js';
import { InteractionManager } from './interactionManager.js';
import { AudioManager } from './audioManager.js';
import { SaveSystem } from './saveSystem.js';
import { TaskManager } from './taskManager.js';
import { RewardSystem } from './rewardSystem.js';
import { UIManager } from './uiManager.js';
import { ParticleFX } from './particles.js';
import { createBabyRegistry } from './baby.js';
import { bus } from './events.js';
import { tweener } from './tween.js';
import { ROOMS, ROOM_DEFS } from '../rooms/index.js';

export class Game {
  constructor() {
    this.bus = bus;
    this.save = new SaveSystem();
    this.audio = new AudioManager();
    this.scenes = new SceneManager(document.getElementById('canvas-wrap'));
    this.rig = new CameraRig(this.scenes.camera);
    this.input = new InteractionManager(this.scenes.renderer.domElement, this.scenes.camera, this.rig, this);
    this.ui = new UIManager(this);
    this.rewards = new RewardSystem(this);
    this.tasks = new TaskManager(this);
    this.fx = new ParticleFX(this.scenes.scene);
    this.babyReg = createBabyRegistry(this);

    this.room = null;
    this.roomId = null;
    this._roomCache = new Map();
    this._clock = new THREE.Clock();
    this._globalNeedAcc = 0;
    this.running = false;
    this._loop = this._loop.bind(this);

    this.scenes.onQualityDrop = () => this.rewards.toast('تم تفعيل وضع الأداء الموفّر تلقائيًا ⚡', '', '');
  }

  async init() {
    const ui = this.ui;
    ui.showLoading(.08, 'تهيئة المحرك ثلاثي الأبعاد…');
    await frame();
    ui.showLoading(.25, 'إيقاظ الأطفال الصغار… 👶');
    await frame();
    // build all six babies (procedural meshes)
    this.babyReg.all();
    await frame();
    ui.showLoading(.5, 'ترتيب أثاث الحضانة… 🛏️');
    // pre-build main hall so the first entry is instant
    this._getRoom('mainHall');
    await frame();
    ui.showLoading(.75, 'ضبط الموسيقى والأصوات… 🎵');
    const s = this.save.data.settings;
    this.audio.setMusic(s.music);
    this.audio.setSfx(s.sfx);
    this.audio.setMuted(s.muted);
    this.selectBaby(this.save.data.selectedBaby, true);
    await frame();
    ui.showLoading(1, 'اكتمل! هيا نلعب 🎉');
    await frame();
    ui.hideLoading();
    ui.showMenu();
    ui.updateHud();
    // menu ambience starts after first user gesture (browser policy)
    const unlockOnce = () => {
      this.audio.unlock();
      if (!this.running) this.audio.playMusic('menu');
    };
    window.addEventListener('pointerdown', unlockOnce, { once: true });
    window.addEventListener('keydown', unlockOnce, { once: true });
    requestAnimationFrame(this._loop);
  }

  get activeBaby() { return this.babyReg.get(this.save.data.selectedBaby); }

  selectBaby(id, silent = false) {
    this.save.data.selectedBaby = id;
    for (const b of this.babyReg.all()) b.setSelected(b.babyId === id);
    if (!silent) {
      this.audio.sfx('babble');
      const cfg = this.babyReg.get(id).cfg;
      this.rewards.toast(`${cfg.greetingAr}`, cfg.emoji, 'green');
    }
    this.ui.refreshOpenPanels();
    this.save.save();
  }

  startPlay(roomId = 'mainHall') {
    this.ui.hideMenu();
    this.ui.showHud(true);
    this.running = true;
    this.audio.unlock();
    this.enterRoom(roomId);
  }

  gotoHall() { this.enterRoom('mainHall'); }

  enterRoom(id) {
    if (!ROOMS[id]) { console.warn('no room', id); return; }
    if (this.room) this.room.exit();
    this.ui.closeAll();
    const flash = document.getElementById('flash');
    flash.classList.add('on');
    this.later(180, () => {
      const room = this._getRoom(id);
      this.roomId = id;
      this.room = room;
      room.ensureBuilt();
      this.scenes.setRoom(room.group);
      const d = room.def;
      this.scenes.setEnvironment({ sky: d.sky || 'indoor', fog: d.fog, hemi: d.hemi, sun: d.sun });
      this.audio.playMusic(d.music || 'play');
      room.enter();
      this.rig.setView(room.viewDef || { center: [0, 1.1, 0], az: .55, pol: 1.02, dist: 8.2 });
      this.input.setList(room.hits);
      this.input.enabled = !this.ui.openPanel;
      this.ui.setRoomInfo(`${d.emoji} ${d.nameAr}`);
      this.ui.updateHud();
      this.save.data.visited[id] = (this.save.data.visited[id] || 0) + 1;
      this.save.save();
      this.rig.reset(0);
      setTimeout(() => flash.classList.remove('on'), 60);
    });
  }

  _getRoom(id) {
    if (!this._roomCache.has(id)) {
      const R = ROOMS[id];
      this._roomCache.set(id, new R(this));
    }
    return this._roomCache.get(id);
  }

  later(ms, fn) { setTimeout(fn, ms); }

  _loop() {
    requestAnimationFrame(this._loop);
    const dt = Math.min(.05, this._clock.getDelta());
    const time = this._clock.elapsedTime;
    tweener.update(dt);
    this.rig.update(dt);
    this.fx.update(dt);

    // needs tick for the active baby + slow global tick for the others
    for (const b of this.babyReg.all()) {
      const active = b.parent === this.room?.group;
      b.update(dt, time, active);
    }

    this.room?.update(dt, time);
    this.input.enabled = !this.ui.openPanel && this.running;
    this._needBarAcc = (this._needBarAcc || 0) + dt;
    if (this._needBarAcc > .3) { this._needBarAcc = 0; this.ui.updateNeedBars(this.running ? this.activeBaby : null); }
    this.scenes.tick(dt);
    this.scenes.render();
    this.save.tick(dt);
  }
}

const frame = () => new Promise(r => setTimeout(r, 30));
export { ROOM_DEFS };
