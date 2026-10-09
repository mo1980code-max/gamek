// camera.js — smooth cinematic camera: orbit, pinch zoom, room views,
// activity focus shots — all through gentle exponential damping (no snaps).
import * as THREE from 'three';
import { tweener } from './tween.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.cur = { center: new THREE.Vector3(0, 1, 0), az: .6, pol: 1.05, dist: 8 };
    this.goal = { center: new THREE.Vector3(0, 1, 0), az: .6, pol: 1.05, dist: 8 };
    this.home = null;
    this.shakeT = 0; this.shakeAmp = 0;
    this.minDist = 3; this.maxDist = 14;
    this.enabled = true;
    this._v = new THREE.Vector3();
  }

  setView({ center = [0, 1, 0], az = .6, pol = 1.05, dist = 8 }) {
    this.cur.center.set(...center);
    this.goal.center.copy(this.cur.center);
    this.cur.az = this.goal.az = az;
    this.cur.pol = this.goal.pol = pol;
    this.cur.dist = this.goal.dist = dist;
    this.home = { center: center.slice(), az, pol, dist };
  }
  tweenTo(view, dur = 1.1) {
    // animate the goal; damping smooths the rest
    if (view.center) tweener.to(this.goal.center, { x: view.center[0], y: view.center[1], z: view.center[2] }, { dur, ease: EaseSafe });
    if (view.az !== undefined) tweener.to(this.goal, { az: view.az }, { dur, ease: EaseSafe });
    if (view.pol !== undefined) tweener.to(this.goal, { pol: view.pol }, { dur, ease: EaseSafe });
    if (view.dist !== undefined) tweener.to(this.goal, { dist: view.dist }, { dur, ease: EaseSafe });
    if (view.home) this.home = { ...view, center: view.center ? view.center.slice() : this.home?.center };
  }
  focus(point, { dist = 4.5, height = 1.2, dur = .8, az, pol } = {}) {
    this.tweenTo({ center: [point.x, point.y ?? height, point.z], dist, az, pol }, dur);
  }
  reset(dur = 1) { if (this.home) this.tweenTo(this.home, dur); }

  orbit(dx, dy) {
    if (!this.enabled) return;
    this.goal.az -= dx * .0052;
    this.goal.pol = clamp(this.goal.pol - dy * .004, .18, 1.5);
    // direct-feel: mirror into current so drag isn't laggy
    this.cur.az = this.goal.az;
    this.cur.pol = this.goal.pol;
  }
  zoom(factor) {
    if (!this.enabled) return;
    this.goal.dist = clamp(this.goal.dist * factor, this.minDist, this.maxDist);
  }
  shake(amp = .12) { this.shakeT = .4; this.shakeAmp = amp; }

  update(dt) {
    const k = 1 - Math.exp(-dt * 5);
    this.cur.center.lerp(this.goal.center, k);
    this.cur.az += (this.goal.az - this.cur.az) * k;
    this.cur.pol += (this.goal.pol - this.cur.pol) * k;
    this.cur.dist += (this.goal.dist - this.cur.dist) * k;

    const { center, az, pol, dist } = this.cur;
    this._v.set(
      center.x + dist * Math.sin(pol) * Math.sin(az),
      center.y + dist * Math.cos(pol),
      center.z + dist * Math.sin(pol) * Math.cos(az)
    );
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmp * (this.shakeT / .4);
      this._v.x += (Math.random() - .5) * a;
      this._v.y += (Math.random() - .5) * a;
    }
    this.cam.position.copy(this._v);
    this.cam.lookAt(center);
  }
}
const EaseSafe = (t => 1 - Math.pow(1 - t, 3)); // outCubic
