// interactionManager.js — unified mouse + touch input on the 3D canvas.
// Handles: tap/click on objects, drag & drop (floor plane), long-press,
// camera orbit by dragging empty space, pinch zoom, hover highlighting.
import * as THREE from 'three';

export class InteractionManager {
  constructor(dom, camera, rig, game) {
    this.dom = dom;
    this.camera = camera;
    this.rig = rig;
    this.game = game;
    this.ray = new THREE.Raycaster();
    this.enabled = true;
    this.list = [];                    // interactive objects (userData.hit)
    this.dragY = null;                 // floor height for drags
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.pointers = new Map();
    this.drag = null;                  // {obj, handlers, id, moved}
    this.camDrag = null;
    this.pinch = null;
    this.hover = null;
    this.downInfo = null;
    this.longTimer = null;

    dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', e => this._down(e));
    dom.addEventListener('pointermove', e => this._move(e));
    dom.addEventListener('pointerup', e => this._up(e));
    dom.addEventListener('pointercancel', e => this._up(e));
    dom.addEventListener('wheel', e => { e.preventDefault(); this.rig?.zoom(1 + Math.sign(e.deltaY) * .09); }, { passive: false });
  }

  setList(l) { this.list = l.filter(Boolean); }

  _ndc(e) {
    const r = this.dom.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  pick(e) {
    this.ray.setFromCamera(this._ndc(e), this.camera);
    const hits = this.ray.intersectObjects(this.list, true);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && !obj.userData.hit) obj = obj.parent;
    if (!obj) return null;
    return { obj, hit: obj.userData.hit, point: hits[0].point, uv: hits[0].uv };
  }

  _down(e) {
    this.game?.audio?.unlock();
    if (!this.enabled) return;
    this.dom.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2) {
      // begin pinch
      this.drag = null; this.camDrag = null;
      clearTimeout(this.longTimer);
      const [a, b] = [...this.pointers.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
      return;
    }

    const p = this.pick(e);
    this.downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), picked: p, id: e.pointerId };
    if (p && p.hit.onDragStart) {
      this.drag = { obj: p.obj, handlers: p.hit, id: e.pointerId, moved: false };
      p.hit.onDragStart?.(p.point);
    }
    this.camDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    // long-press
    clearTimeout(this.longTimer);
    const downX = e.clientX, downY = e.clientY;
    this.longTimer = setTimeout(() => {
      if (this.downInfo && this.downInfo.id === e.pointerId && !this.pointers.has(e.pointerId)) return;
      if (this.downInfo && !this.drag?.moved) {
        const pp = this.pick(e);
        if (pp?.hit.onLongPress) { pp.hit.onLongPress(pp.point); this.downInfo = null; }
      }
    }, 550);
  }

  _move(e) {
    if (!this.enabled) return;
    const prev = this.pointers.get(e.pointerId);
    if (!prev) {
      // hover (desktop)
      if (e.pointerType === 'mouse') {
        const p = this.pick(e);
        this.dom.style.cursor = p ? 'pointer' : 'grab';
        this._setHover(p ? p.obj : null);
      }
      return;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    prev.x = e.clientX; prev.y = e.clientY;

    if (this.pinch && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinch.d > 0) this.rig?.zoom(this.pinch.d / d);
      this.pinch.d = d;
      return;
    }

    if (this.drag && e.pointerId === this.drag.id) {
      if (Math.abs(dx) + Math.abs(dy) > 3) this.drag.moved = true;
      this.ray.setFromCamera(this._ndc(e), this.camera);
      if (this.drag.handlers.dragY !== undefined) this.dragPlane.constant = -this.drag.handlers.dragY;
      else if (this.dragY !== null) this.dragPlane.constant = -this.dragY;
      const pt = new THREE.Vector3();
      if (this.ray.ray.intersectPlane(this.dragPlane, pt)) {
        this.drag.handlers.onDragMove?.(pt, dx, dy);
      }
      return;
    }
    if (this.camDrag && e.pointerId === this.camDrag.id) {
      this.rig?.orbit(dx, dy);
      this.dom.style.cursor = 'grabbing';
    }
  }

  _up(e) {
    clearTimeout(this.longTimer);
    const had = this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;

    // drag end
    if (this.drag && e.pointerId === this.drag.id) {
      const h = this.drag.handlers;
      this.ray.setFromCamera(this._ndc(e), this.camera);
      const pt = new THREE.Vector3();
      this.ray.ray.intersectPlane(this.dragPlane, pt);
      h.onDrop?.(pt, this.drag.moved);
      this.drag = null;
      if (this.pointers.size === 0) this.camDrag = null;
      return;
    }
    // tap
    const di = this.downInfo;
    this.downInfo = null;
    if (this.camDrag && e.pointerId === this.camDrag.id) {
      this.camDrag = null;
      this.dom.style.cursor = 'grab';
    }
    if (!this.enabled || !had || !di) return;
    const dist = Math.hypot(e.clientX - di.x, e.clientY - di.y);
    const dt = performance.now() - di.t;
    if (dist < 9 && dt < 450) {
      const p = this.pick(e) || di.picked;
      if (p) {
        this.game?.audio?.sfx('click');
        p.hit.onClick?.(p.point);
      }
    }
  }

  _setHover(obj) {
    if (this.hover === obj) return;
    this.hover = obj;
    this.game?.ui?.showHoverLabel(obj?.userData.hit?.label || null);
  }
}
