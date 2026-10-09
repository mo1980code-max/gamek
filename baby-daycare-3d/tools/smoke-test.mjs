// tools/smoke-test.mjs — headless QA: builds and exercises every room with
// real three.js in Node (DOM shimmed). Catches runtime errors, broken refs,
// and interaction crashes across the whole game.
/* eslint-disable no-console */

/* ---------------- DOM shim ---------------- */
function makeCtx2d() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    canvas: null,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif',
    textAlign: 'left', textBaseline: 'alphabetic', globalAlpha: 1,
    fillRect: noop, strokeRect: noop, clearRect: noop, beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, arc: noop, ellipse: noop, stroke: noop, fill: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, translate: noop, rotate: noop, scale: noop,
    save: noop, restore: noop, clip: noop, rect: noop,
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    measureText: t => ({ width: (t?.length || 1) * 10 }),
    fillText: noop, strokeText: noop,
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h }),
    putImageData: noop, drawImage: noop, roundRect: noop,
  };
}

function makeElement(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    style: new Proxy({ setProperty: () => {} }, { get: (t, k) => (k in t ? t[k] : ''), set: (t, k, v) => { t[k] = v; return true; } }),
    dataset: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    listeners: {},
    _inner: '',
    width: 300, height: 150, clientWidth: 380, offsetWidth: 0, disabled: false,
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    append(...cs) { cs.forEach(c => this.appendChild(c)); },
    remove() { this.parentNode?.children?.splice(this.parentNode.children.indexOf(this), 1); },
    addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); },
    removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; },
    querySelector() { return makeElement('div'); },
    querySelectorAll() { return []; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    cloneNode() { return makeElement(tag); },
    focus() {}, click() { this.listeners.click?.forEach(f => f({ clientX: 0, clientY: 0 })); },
    getContext: () => makeCtx2d(),
    toDataURL: () => 'data:image/png;base64,x',
    set onclick(fn) { this._onclick = fn; },
    get onclick() { return this._onclick; },
    set innerHTML(v) { this._inner = v; this.children.length = 0; },
    get innerHTML() { return this._inner; },
    textContent: '',
    setPointerCapture() {}, releasePointerCapture() {},
  };
  if (tag === 'canvas') { el.width = 300; el.height = 150; }
  return el;
}

const documentShim = {
  createElement: t => makeElement(t),
  createTextNode: t => ({ textContent: t }),
  getElementById: id => (documentShim._ids[id] ||= (() => { const e = makeElement('div'); e.id = id; return e; })()),
  querySelector: () => makeElement('div'),
  querySelectorAll: () => [],
  body: makeElement('body'),
  addEventListener() {},
  _ids: {},
};

const savedStore = new Map();
globalThis.document = documentShim;
globalThis.window = new Proxy({
  innerWidth: 800, innerHeight: 600, devicePixelRatio: 2,
  addEventListener() {}, removeEventListener() {},
  location: { reload() {} },
  AudioContext: undefined, webkitAudioContext: undefined,
  speechSynthesis: undefined,
}, { get(t, k) { return k in t ? t[k] : globalThis[k]; }, set(t, k, v) { t[k] = v; return true; } });
globalThis.localStorage = {
  getItem: k => savedStore.get(k) ?? null,
  setItem: (k, v) => savedStore.set(k, String(v)),
  removeItem: k => savedStore.delete(k),
};
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.requestAnimationFrame = fn => setTimeout(() => fn(performance.now()), 16);

/* ---------------- mock game ---------------- */
// import every remaining core module so even definitions get parsed
await import('../js/game.js');
await import('../js/uiManager.js');
await import('../js/interactionManager.js');
await import('../js/sceneManager.js');
await import('../js/audioManager.js');
await import('../js/babyAnimations.js');
await import('../js/babyAI.js');
await import('../js/tween.js');
await import('../js/kit.js');
const { SaveSystem } = await import('../js/saveSystem.js');
const { EventBus } = await import('../js/events.js');
const { ParticleFX } = await import('../js/particles.js');
const { CameraRig } = await import('../js/camera.js');
import * as THREE from 'three';
const { createBabyRegistry } = await import('../js/baby.js');
const { TASKS } = await import('../js/taskManager.js');

const save = new SaveSystem();
const bus = new EventBus();

const audioStub = {
  sfx() {}, note() {}, startLoop() {}, stopLoop() {}, stopAllLoops() {},
  playMusic() {}, stopMusic() {}, unlock() {}, setMusic() {}, setSfx() {}, setMuted() {},
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1.6, .1, 120);
const fx = new ParticleFX(scene);
const rig = new CameraRig(camera);

const uiStub = {
  setSteps() {}, setHint() {}, updateHud() {}, showHoverLabel() {},
  modal() { return () => {}; }, photoModal() {}, updateNeedBars() {}, setRoomInfo() {},
  openMap() {}, openBabies() {}, openTasks() {}, openSettings() {}, openShop() {},
  refreshOpenPanels() {}, closeAll() {},
};
const rewardsStub = {
  toast() {}, confetti() {}, floater() {}, celebrate() {}, celebrateTask() {},
  grant() {}, spend: () => true, coinBurst() {},
};
const tasksStub = {
  count() {}, progressOf: t => 0, isDone: () => false, isClaimed: () => false,
};

const game = {
  save, bus, audio: audioStub, ui: uiStub, rewards: rewardsStub, tasks: tasksStub,
  fx, rig, scenes: { setRoom() {}, setEnvironment() {}, camera, snapshot: () => 'data:,', quality: 'high' },
  input: null,
  gotoHall() {}, enterRoom() {}, selectBaby() {},
};
game.babyReg = createBabyRegistry(game);
game.activeBaby = game.babyReg.get('jini');

/* ---------------- run all rooms ---------------- */
const { ROOMS } = await import('../rooms/index.js');
const { BABIES } = await import('../js/baby.js');

let failures = 0;
function tryRun(label, fn) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
  } catch (e) {
    failures++;
    console.log(`  ❌ ${label}: ${e.message}`);
    console.log(e.stack.split('\n').slice(1, 4).join('\n'));
  }
}

console.log(`\n=== building & exercising ${Object.keys(ROOMS).length} rooms ===`);
for (const [id, R] of Object.entries(ROOMS)) {
  console.log(`\nROOM ${id}`);
  const room = new R(game);
  tryRun('build', () => room.ensureBuilt());
  tryRun('enter', () => room.enter());
  tryRun('update×120', () => {
    for (let i = 0; i < 120; i++) room.update(1 / 60, i / 60);
    fx.update(1 / 60, 1);
    rig.update(1 / 60);
  });
  tryRun('interactions', () => {
    // fire every onClick handler once
    for (const obj of room.hits) {
      const h = obj.userData.hit;
      if (!h) continue;
      h.onClick?.({ x: 0, y: 0, z: 0 });
    }
  });
  tryRun('drags', () => {
    for (const obj of room.hits) {
      const h = obj.userData.hit;
      if (!h?.onDragStart) continue;
      const ok = h.onDragStart?.({ x: 0, y: 0, z: 0 });
      if (ok === false) continue;
      h.onDragMove?.({ x: 1, y: 1, z: 1 }, 2, 1);
      h.onDrop?.({ x: 1, y: 1, z: 1 }, true);
    }
  });
  tryRun('steps complete', () => {
    for (const s of room.stepDefs.slice()) room.step(s.id);
  });
  tryRun('update×60 after steps', () => {
    for (let i = 0; i < 60; i++) room.update(1 / 60, i / 60);
  });
  tryRun('exit', () => room.exit());
}

/* ---------------- babies & animations ---------------- */
console.log('\nBABIES');
for (const cfg of BABIES) {
  tryRun(`baby ${cfg.id}`, () => {
    const b = game.babyReg.get(cfg.id);
    for (let i = 0; i < 60; i++) b.update(1 / 60, i / 60, true);
    // every expression
    for (const e of ['happy', 'sad', 'crying', 'sleepy', 'surprised', 'scared', 'excited', 'angry', 'laughing', 'sick', 'neutral', 'hungry', 'sleep']) b.setExpression(e);
    // every animation
    for (const a of ['idle', 'walk', 'run', 'sit', 'sleep', 'eat', 'drink', 'cry', 'laugh', 'dance', 'clap', 'bath', 'play', 'jump', 'swim', 'carried', 'ride']) {
      b.animator.play(a);
      for (let i = 0; i < 20; i++) b.animator.update(1 / 60, i / 60);
    }
    // outfits
    b.outfit = { ...b.outfit, dress: true, hat: 'crown', glasses: 'sun', cape: true, shoes: 0x335577 };
    b.applyOutfit();
    b.outfit = { ...b.cfg.outfit, dress: cfg.outfit.type === 'dress' };
    b.applyOutfit();
    b.ai.apply({ hunger: 50, happiness: 50 });
    void b.ai.bubbleEmoji();
    void b.ai.moodFace();
  });
}

/* ---------------- minigames ---------------- */
console.log('\nMINIGAMES');
const { ColoringGame } = await import('../minigames/coloring.js');
const mg = await import('../minigames/puzzles.js');
const { pairMatch } = await import('../minigames/matching.js');
const { binSort } = await import('../minigames/sorting.js');
const { toneEchoGame } = await import('../minigames/music.js');
const { RECIPES, INGREDIENTS, TOOLS } = await import('../minigames/cooking.js');
const holder = makeElement('div');
tryRun('coloring', () => {
  const c = new ColoringGame(holder, { onDone: () => {} });
  c._floodFill(10, 10);
  c._brush(20, 20);
  c._stamp(30, 30);
  c._coverage();
  c._save();
});
tryRun('slidePuzzle', () => { mg.slidePuzzle(holder, { onDone: () => {} }); mg.memoryGame(holder, { onDone: () => {} }); mg.shadowMatch(holder, { onDone: () => {} }); mg.sizeOrder(holder, { onDone: () => {} }); mg.mazeGame(holder, { onDone: () => {} }); mg.findObjects(holder, { onDone: () => {} }); });
tryRun('pairMatch', () => pairMatch(holder, { pairs: [{ a: { t: 'A' }, b: { t: 'a' } }, { a: { t: 'B' }, b: { t: 'b' } }], onDone: () => {} }));
tryRun('binSort', () => binSort(holder, { items: [{ t: '🍎', bin: 'r' }, { t: '🫐', bin: 'b' }], bins: [{ id: 'r', ar: 'أحمر', color: '#f00' }, { id: 'b', ar: 'أزرق', color: '#00f' }], onDone: () => {} }));
tryRun('toneEcho', () => toneEchoGame(holder, { bars: [{ midi: 72, color: '#f00', label: '1' }, { midi: 74, color: '#0f0', label: '2' }], playNote: () => {}, onDone: () => {} }));
tryRun('cooking data', () => {
  if (RECIPES.length !== 5) throw new Error('recipes != 5');
  for (const r of RECIPES) {
    for (const i of r.ingredients) if (!INGREDIENTS[i]) throw new Error('missing ingredient ' + i);
    if (!TOOLS[r.tool]) throw new Error('missing tool ' + r.tool);
  }
});

/* ---------------- save round-trip ---------------- */
console.log('\nSAVE');
tryRun('save/load', () => {
  save.data.coins = 123;
  save.data.outfits.jini = { hat: 'crown' };
  save.save();
  const s2 = new SaveSystem();
  if (s2.data.coins !== 123) throw new Error('coins not persisted');
  if (s2.data.outfits.jini?.hat !== 'crown') throw new Error('outfit not persisted');
});
tryRun('needs decay 10min', () => {
  const n = game.activeBaby.needs;
  const start = n.hunger;
  for (let i = 0; i < 600; i++) n.tick(1, game.activeBaby.cfg.decay);
  if (n.hunger >= start) throw new Error('hunger did not decay');
  n.apply({ hunger: 60, energy: 70, happiness: 80, hygiene: 90, health: 95, comfort: 85 });
  if (n.hunger !== 60) throw new Error('apply broken');
});

console.log(failures === 0 ? '\n🎉 ALL SMOKE TESTS PASSED' : `\n💥 ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
