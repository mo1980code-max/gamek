// kit.js — procedural 3D construction kit. Every room and character builds
// its furniture from these helpers, so the whole game needs zero external
// model files. Materials are cached and shared for performance.
import * as THREE from 'three';

/* ---------------- materials ---------------- */
const _matCache = new Map();
export function mat(color, o = {}) {
  const key = `${color}|${o.rough ?? .9}|${o.metal ?? 0}|${o.emissive ?? 0}|${o.opacity ?? 1}|${o.side ?? 0}|${o.flat ?? 0}`;
  if (_matCache.has(key)) return _matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? .9, metalness: o.metal ?? 0,
    flatShading: !!o.flat,
  });
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.emissiveIntensity ?? .7; }
  if (o.opacity !== undefined && o.opacity < 1) { m.transparent = true; m.opacity = o.opacity; }
  if (o.side) m.side = o.side;
  _matCache.set(key, m);
  return m;
}
export function disposeKit() {
  for (const m of _matCache.values()) m.dispose();
  _matCache.clear();
}

/* ---------------- primitive builders ---------------- */
export function box(w, h, d, color, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, o.seg || 1, o.seg || 1, o.seg || 1), o.mat || mat(color, o));
  m.castShadow = o.shadow !== false; m.receiveShadow = true;
  return m;
}
export function cyl(rt, rb, h, color, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 18, 1, !!o.open), o.mat || mat(color, o));
  m.castShadow = o.shadow !== false; m.receiveShadow = true;
  return m;
}
export function sph(r, color, o = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.ws ?? 20, o.hs ?? 14), o.mat || mat(color, o));
  m.castShadow = o.shadow !== false; m.receiveShadow = true;
  return m;
}
export function cone(r, h, color, o = {}) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, o.seg ?? 20, 1, !!o.open), o.mat || mat(color, o));
  m.castShadow = o.shadow !== false; m.receiveShadow = true;
  return m;
}
export function torus(r, t, color, o = {}) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, o.seg ?? 12, o.seg2 ?? 24, o.arc ?? Math.PI * 2), o.mat || mat(color, o));
  m.castShadow = o.shadow !== false; m.receiveShadow = true;
  return m;
}
export function capsule(r, h, color, o = {}) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, h, o.cap ?? 6, o.seg ?? 14), o.mat || mat(color, o));
  m.castShadow = o.shadow !== false; m.receiveShadow = true;
  return m;
}
export function planeMesh(w, h, color, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), o.mat || mat(color, o));
  m.receiveShadow = true;
  return m;
}
export function put(parent, mesh, x = 0, y = 0, z = 0, ry = 0) {
  mesh.position.set(x, y, z);
  if (ry) mesh.rotation.y = ry;
  parent.add(mesh);
  return mesh;
}
export function grp(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}
// soft round fake shadow blob (cheap, used under characters)
export function shadowBlob(r = .4) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 20),
    new THREE.MeshBasicMaterial({ color: 0x223311, transparent: true, opacity: .22, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = .02;
  return m;
}

/* ---------------- canvas textures / sprites ---------------- */
export function makeCanvasTexture(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const _spriteCache = new Map();
export function emojiSprite(char, o = {}) {
  const size = o.size ?? 1;
  const key = `em|${char}|${o.bg || ''}`;
  const map = _cachedSpriteMap(key, char, o);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
  sp.scale.set(size, size, 1);
  return sp;
}
function _cachedSpriteMap(key, char, o) {
  if (_spriteCache.has(key)) return _spriteCache.get(key);
  const res = o.res ?? 128;
  const tex = makeCanvasTexture(res, res, (ctx, w, h) => {
    if (o.bg) {
      ctx.fillStyle = o.bg;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = `${Math.floor(res * .72)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(char, w / 2, h / 2 + res * .04);
  });
  _spriteCache.set(key, tex);
  return tex;
}
export function textSprite(text, o = {}) {
  const pad = 28, fontPx = o.fontPx ?? 64;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = `900 ${fontPx}px sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  cv.width = w; cv.height = fontPx + pad * 1.4;
  const c2 = cv.getContext('2d');
  if (o.bg) {
    c2.fillStyle = o.bg;
    const r = cv.height / 2;
    c2.beginPath(); c2.roundRect(4, 4, cv.width - 8, cv.height - 8, r); c2.fill();
  }
  c2.font = `900 ${fontPx}px sans-serif`;
  c2.textAlign = 'center'; c2.textBaseline = 'middle';
  c2.fillStyle = o.color || '#fff';
  c2.fillText(text, cv.width / 2, cv.height / 2 + 4);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const h = o.height ?? .5;
  sp.scale.set(h * cv.width / cv.height, h, 1);
  return sp;
}

/* ---------------- room shell ---------------- */
// Builds floor + 3 walls (back, left, right) so the camera always looks into
// an open doll-house corner. Walls use BackSide-free inward planes.
export function roomShell(o = {}) {
  const g = new THREE.Group();
  const w = o.w ?? 10, d = o.d ?? 10, h = o.h ?? 4.6;
  const floor = planeMesh(w, d, o.floor ?? 0xffe3f0);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  if (o.baseboard !== false) {
    const bb = box(w, .18, .1, o.trim ?? 0xffffff, { shadow: false });
    put(g, bb, 0, .09, -d / 2 + .05);
    const bb2 = box(.1, .18, d, o.trim ?? 0xffffff, { shadow: false });
    put(g, bb2, -w / 2 + .05, .09, 0);
  }
  const wallMatOpts = { shadow: false, side: THREE.DoubleSide };
  const back = planeMesh(w, h, o.wall ?? 0xfff6fb, { mat: mat(o.wall ?? 0xfff6fb, { ...wallMatOpts }) });
  back.position.set(0, h / 2, -d / 2);
  g.add(back);
  const left = planeMesh(d, h, o.wall ?? 0xfff6fb, { mat: mat(o.wallLeft ?? o.wall ?? 0xf7e9ff, { ...wallMatOpts }) });
  left.rotation.y = Math.PI / 2;
  left.position.set(-w / 2, h / 2, 0);
  g.add(left);
  if (o.ceiling !== false) {
    const ceil = planeMesh(w, d, o.ceil ?? 0xffffff);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = h;
    g.add(ceil);
  }
  if (o.wainscot) {
    const ws = planeMesh(w, 1.1, o.wainscot);
    ws.position.set(0, .55, -d / 2 + .012);
    g.add(ws);
    const ws2 = planeMesh(d, 1.1, o.wainscot);
    ws2.rotation.y = Math.PI / 2;
    ws2.position.set(-w / 2 + .012, .55, 0);
    g.add(ws2);
  }
  g.userData.dims = { w, d, h };
  return g;
}

export function windowPane(w = 1.5, h = 1.3, frame = 0xffffff, sky = 0xaee2ff) {
  const g = new THREE.Group();
  const glass = planeMesh(w, h, sky, { mat: mat(sky, { emissive: sky, emissiveIntensity: .35 }) });
  g.add(glass);
  const t = .07;
  put(g, box(w + t * 2, t, t, frame, { shadow: false }), 0, h / 2, .02);
  put(g, box(w + t * 2, t, t, frame, { shadow: false }), 0, -h / 2, .02);
  put(g, box(t, h + t * 2, t, frame, { shadow: false }), -w / 2, 0, .02);
  put(g, box(t, h + t * 2, t, frame, { shadow: false }), w / 2, 0, .02);
  put(g, box(.05, h, .05, frame, { shadow: false }), 0, 0, .02);
  put(g, box(w, .05, .05, frame, { shadow: false }), 0, 0, .02);
  return g;
}

export function curtain(w = 1.2, h = 1.7, color = 0xff9fce) {
  const g = new THREE.Group();
  const c1 = box(w * .45, h, .06, color);
  c1.geometry = new THREE.BoxGeometry(w * .45, h, .06, 4, 1, 1);
  const pos = c1.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) + Math.sin(x * 9) * .05);
  }
  c1.geometry.computeVertexNormals();
  put(g, c1, -w * .27, -h / 2, 0);
  const c2 = c1.clone();
  put(g, c2, w * .27, -h / 2, 0);
  put(g, cyl(.035, .035, w * 1.1, 0xffd54f), 0, .06, 0).rotation.z = Math.PI / 2;
  return g;
}

export function rug(w = 3.6, d = 2.6, color = 0xffc2dd, o = {}) {
  const g = new THREE.Group();
  const r = planeMesh(w, d, color, { mat: mat(color, { rough: 1 }) });
  r.rotation.x = -Math.PI / 2; r.position.y = .012;
  g.add(r);
  const inner = planeMesh(w * .72, d * .72, o.inner ?? 0xfff2f8);
  inner.rotation.x = -Math.PI / 2; inner.position.y = .014;
  g.add(inner);
  if (o.dots) {
    for (let i = 0; i < 8; i++) {
      const dot = cyl(.12, .12, .005, o.dotColor ?? 0xffffff);
      dot.position.set((Math.random() - .5) * w * .6, .02, (Math.random() - .5) * d * .6);
      g.add(dot);
    }
  }
  return g;
}

/* ---------------- furniture ---------------- */
export function crib(color = 0xaed581) {
  const g = new THREE.Group();
  put(g, box(1.7, .12, .9, color), 0, .55, 0);                       // mattress base
  put(g, box(1.55, .14, .75, 0xffffff), 0, .64, 0);                  // mattress
  const head = box(.1, 1.15, .9, color); put(g, head, -.85, .58, 0);
  const foot = box(.1, .85, .9, color); put(g, foot, .85, .43, 0);
  for (let i = -2; i <= 2; i++) put(g, box(.06, .95, .06, color), i * .33, .62, -.43);
  for (let i = -2; i <= 2; i++) put(g, box(.06, .95, .06, color), i * .33, .62, .43);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(g, cyl(.05, .05, .5, 0x8d6e63), sx * .75, .24, sz * .38);
  return g;
}

export function pillowCushion(color = 0xffffff, w = .55, d = .4) {
  const g = new THREE.Group();
  const p = box(w, .14, d, color);
  p.geometry = new THREE.BoxGeometry(w, .14, d, 3, 1, 3);
  g.add(p);
  return g;
}

export function smallChair(color = 0xff8fab) {
  const g = new THREE.Group();
  put(g, box(.5, .07, .5, color), 0, .3, 0);
  put(g, box(.5, .5, .07, color), 0, .56, -.22);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    put(g, cyl(.035, .035, .3, 0x8d6e63), sx * .21, .15, sz * .21);
  return g;
}

export function tableLow(w = 1.6, d = .9, h = .5, color = 0xffb74d) {
  const g = new THREE.Group();
  put(g, box(w, .08, d, color), 0, h, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    put(g, cyl(.05, .05, h, 0x8d6e63), sx * (w / 2 - .12), h / 2, sz * (d / 2 - .1));
  return g;
}

export function shelfUnit(w = 1.6, h = 1.6, color = 0xffcc80, rows = 3) {
  const g = new THREE.Group();
  put(g, box(w, .06, .4, color), 0, .03, 0);
  for (let i = 1; i <= rows; i++) put(g, box(w, .05, .4, color), 0, (h / rows) * i, 0);
  put(g, box(.06, h, .4, color), -w / 2, h / 2, 0);
  put(g, box(.06, h, .4, color), w / 2, h / 2, 0);
  put(g, box(w, .06, .06, color), 0, h, -.18);
  return g;
}

export function pottedPlant(scale = 1) {
  const g = new THREE.Group();
  put(g, cyl(.22 * scale, .16 * scale, .3 * scale, 0xff7043), 0, .15 * scale, 0);
  const stem = cyl(.04 * scale, .04 * scale, .5 * scale, 0x5d4037);
  put(g, stem, 0, .55 * scale, 0);
  const leafs = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const leaf = sph(.16 * scale, 0x66bb6a, { flat: true });
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * .17 * scale, .82 * scale + (i % 2) * .14 * scale, Math.sin(a) * .17 * scale);
    leaf.scale.y = 1.4;
    leafs.add(leaf);
  }
  g.add(leafs);
  g.userData.sway = leafs;
  return g;
}

export function wallPicture(emoji, w = .9, h = .7, frame = 0xffb74d) {
  const g = new THREE.Group();
  put(g, box(w + .08, h + .08, .05, frame), 0, 0, 0);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: _cachedSpriteMap(`pic|${emoji}`, emoji, { res: 128 }), transparent: true }));
  art.position.z = .032;
  g.add(art);
  return g;
}

export function doorMesh(color = 0x90caf9, w = 1.1, h = 2.1, emoji = '') {
  const g = new THREE.Group();
  put(g, box(w, h, .09, color), 0, h / 2, 0);
  put(g, box(w + .14, .1, .13, 0xffffff), 0, h, 0);
  put(g, box(w + .14, .1, .13, 0xffffff), 0, .06, 0);
  put(g, sph(.05, 0xffd54f), w / 2 - .14, h * .48, .08);
  if (emoji) { const e = emojiSprite(emoji, { size: .4 }); e.position.set(0, h * .62, .09); g.add(e); }
  return g;
}

export function floorLamp() {
  const g = new THREE.Group();
  put(g, cyl(.2, .26, .08, 0x8d6e63), 0, .04, 0);
  put(g, cyl(.03, .03, 1.3, 0xa1887f), 0, .7, 0);
  const shade = cone(.3, .35, 0xfff59f, { open: true });
  shade.rotation.x = Math.PI;
  put(g, shade, 0, 1.45, 0);
  const bulb = sph(.09, 0xfffde7, { mat: mat(0xfffde7, { emissive: 0xfff176, emissiveIntensity: 1.2 }) });
  put(g, bulb, 0, 1.36, 0);
  g.userData.bulb = bulb;
  return g;
}

export function ceilingLamp(color = 0xff8fab) {
  const g = new THREE.Group();
  put(g, cyl(.015, .015, .5, 0x9e9e9e), 0, -.25, 0);
  const shade = cone(.42, .4, color, { open: true });
  shade.rotation.x = Math.PI;
  put(g, shade, 0, -.55, 0);
  const bulb = sph(.1, 0xfffde7, { mat: mat(0xfffde7, { emissive: 0xfff176, emissiveIntensity: 1.2 }) });
  put(g, bulb, 0, -.62, 0);
  return g;
}

export function teddy(color = 0xb0713c) {
  const g = new THREE.Group();
  const body = sph(.26, color); body.scale.set(1, 1.15, .9); put(g, body, 0, .3, 0);
  const head = sph(.2, color); put(g, head, 0, .66, 0);
  for (const sx of [-1, 1]) {
    const ear = sph(.07, color); put(g, ear, sx * .15, .8, 0);
    const inner = sph(.035, 0xffcdd2); put(g, inner, sx * .15, .8, .05);
    const arm = sph(.09, color); arm.scale.set(1, 1.6, 1); put(g, arm, sx * .26, .38, .05);
    const leg = sph(.1, color); put(g, leg, sx * .13, .08, .12);
  }
  put(g, sph(.1, 0xffe0b2), 0, .6, .16);
  const eye = sph(.025, 0x3e2723, { shadow: false });
  put(g, eye, -.07, .7, .17);
  put(g, eye.clone(), .07, .7, .17);
  return g;
}

export function toyBall(r = .22, color = 0xff7043) {
  const g = new THREE.Group();
  const b = sph(r, color);
  const stripe = torus(r * .98, r * .16, 0xffffff);
  stripe.rotation.x = Math.PI / 2;
  g.add(b, stripe);
  return g;
}

export function bookStack(n = 3, colors = [0xef5350, 0xffca28, 0x42a5f5]) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const b = box(.42, .09, .3, colors[i % colors.length]);
    b.rotation.y = (Math.random() - .5) * .6;
    put(g, b, (Math.random() - .5) * .06, .05 + i * .095, 0);
  }
  return g;
}

export function mirror(w = 1.2, h = .9, frame = 0xffffff) {
  const g = new THREE.Group();
  put(g, box(w + .1, h + .1, .05, frame), 0, 0, 0);
  put(g, box(w, h, .055, 0xbfe9ff, { mat: mat(0xd6f2ff, { rough: .1, metal: .4 }) }), 0, 0, .012);
  const shine = box(w * .18, h * .8, .01, 0xffffff, { shadow: false, mat: mat(0xffffff, { rough: .2, transparent: true, opacity: .5 }) });
  shine.position.set(w * .22, 0, .045);
  shine.rotation.z = .35;
  g.add(shine);
  return g;
}

export function wallClock() {
  const g = new THREE.Group();
  put(g, cyl(.34, .34, .07, 0xff7043), 0, 0, 0).rotation.x = Math.PI / 2;
  put(g, cyl(.29, .29, .075, 0xfffde7), 0, 0, .004).rotation.x = Math.PI / 2;
  const hourHand = box(.035, .16, .02, 0x4e342e); hourHand.geometry.translate(0, .08, 0);
  put(g, hourHand, 0, 0, .045);
  const minHand = box(.025, .24, .02, 0x1565c0); minHand.geometry.translate(0, .12, 0);
  put(g, minHand, 0, 0, .05);
  g.userData.hourHand = hourHand;
  g.userData.minHand = minHand;
  return g;
}

export function starDecor(color = 0xfff176) {
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? .14 : .06;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? star.moveTo(x, y) : star.lineTo(x, y);
  }
  star.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(star), mat(color, { emissive: color, emissiveIntensity: .8 }));
  return m;
}

// toy building block (playroom / bedroom decoration)
export function block(size = .3, color = 0xef5350, letter = 'A') {
  const g = new THREE.Group();
  g.add(box(size, size, size, color));
  const l = textSprite(letter, { color: '#ffffff', height: size * .62 });
  l.position.z = size / 2 + .01;
  g.add(l);
  const l2 = l.clone(); l2.position.z = -(size / 2 + .01); l2.rotation.y = Math.PI;
  g.add(l2);
  return g;
}

