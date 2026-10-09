// sceneManager.js — renderer, lights, sky presets, room lifecycle,
// adaptive quality for weaker phones, snapshots for the photo feature.
import * as THREE from 'three';

const SKY_PRESETS = {
  indoor:  { top: '#ffe9f5', bottom: '#fffdf6' },
  outdoor: { top: '#7ec8ff', bottom: '#dff3ff' },
  night:   { top: '#1b2a5e', bottom: '#3e4f8f' },
  party:   { top: '#4a2a7d', bottom: '#c25e9a' },
  pool:    { top: '#6fd3ff', bottom: '#e0f9ff' },
};

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.basePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.basePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, .1, 120);
    this.camera.position.set(0, 4, 9);

    this.roomHolder = new THREE.Group();
    this.scene.add(this.roomHolder);

    // lights (per-room tinted by setEnvironment)
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xcae4ff, .95);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, .28);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xfff3e0, 1.35);
    this.sun.position.set(5, 9, 6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -9; this.sun.shadow.camera.right = 9;
    this.sun.shadow.camera.top = 9; this.sun.shadow.camera.bottom = -9;
    this.sun.shadow.camera.far = 40;
    this.sun.shadow.bias = -.0006;
    this.scene.add(this.sun);

    this.skyDome = null;
    this.roomGroup = null;
    this.quality = 'high';
    this._fpsAcc = 0; this._fpsN = 0; this._fpsTimer = 0; this._degraded = false;
    this.onQualityDrop = null;

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  setEnvironment(env = {}) {
    const preset = SKY_PRESETS[env.sky || 'indoor'] || SKY_PRESETS.indoor;
    // gradient sky dome (cheap, always faces camera)
    if (this.skyDome) { this.skyDome.material.map?.dispose(); this.skyDome.material.dispose(); this.scene.remove(this.skyDome); }
    if (env.sky && env.sky !== 'flat') {
      const tex = gradientTexture(preset.top, preset.bottom);
      this.skyDome = new THREE.Mesh(
        new THREE.SphereGeometry(60, 24, 12),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false })
      );
      this.scene.add(this.skyDome);
      this.scene.background = null;
    } else {
      this.skyDome = null;
      this.scene.background = new THREE.Color(env.bg || '#fff3fa');
    }
    this.scene.fog = env.fog ? new THREE.Fog(env.fog, env.fogNear ?? 14, env.fogFar ?? 38) : null;
    if (env.hemi) {
      this.hemi.color.set(env.hemi.sky ?? '#ffffff');
      this.hemi.groundColor.set(env.hemi.ground ?? '#cae4ff');
      this.hemi.intensity = env.hemi.intensity ?? .95;
    }
    if (env.sun) {
      this.sun.color.set(env.sun.color ?? '#fff3e0');
      this.sun.intensity = env.sun.intensity ?? 1.35;
      if (env.sun.pos) this.sun.position.set(...env.sun.pos);
    }
    this.sun.visible = env.sunVisible !== false;
  }

  setRoom(group) {
    if (this.roomGroup) {
      this.roomHolder.remove(this.roomGroup);
      disposeGroup(this.roomGroup);
    }
    this.roomGroup = group;
    if (group) this.roomHolder.add(group);
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();
  }

  snapshot() {
    this.render();
    return this.renderer.domElement.toDataURL('image/png');
  }

  // adaptive quality: sample fps, degrade once if weak
  tick(dt) {
    this._fpsAcc += dt; this._fpsN++;
    this._fpsTimer += dt;
    if (this._fpsTimer >= 2.5) {
      const fps = this._fpsN / this._fpsAcc;
      this._fpsAcc = 0; this._fpsN = 0; this._fpsTimer = 0;
      if (!this._degraded && fps < 38 && this.quality === 'high') {
        this._degraded = true;
        this.setQuality('low');
        this.onQualityDrop?.();
      }
    }
  }
  setQuality(q) {
    this.quality = q;
    if (q === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sun.castShadow = false;
    } else {
      this.renderer.setPixelRatio(this.basePixelRatio);
      this.renderer.shadowMap.enabled = true;
      this.sun.castShadow = true;
    }
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  }
  render() { this.renderer.render(this.scene, this.camera); }
}

function gradientTexture(top, bottom) {
  const cv = document.createElement('canvas');
  cv.width = 2; cv.height = 256;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  c.fillStyle = g;
  c.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function disposeGroup(root) {
  // recursive so we can skip persistent subtrees (the shared baby rigs)
  const walk = o => {
    if (o.userData.keep) return;
    if (o.geometry) o.geometry.dispose();
    for (const c of o.children) walk(c);
  };
  walk(root);
}
