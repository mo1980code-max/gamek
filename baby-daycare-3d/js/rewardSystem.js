// rewardSystem.js — coins/stars economy, toasts, floating text, confetti.
import * as THREE from 'three';

export class RewardSystem {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('toast-root');
    this.app = document.getElementById('app');
  }

  get coins() { return this.game.save.data.coins; }
  get stars() { return this.game.save.data.stars; }

  grant(coins = 0, stars = 0) {
    const d = this.game.save.data;
    d.coins += coins;
    d.stars += stars;
    this.game.ui.updateHud();
    if (coins > 0) this.game.audio.sfx('coin');
    if (stars > 0) this.game.audio.sfx('star');
  }
  spend(coins) {
    if (this.game.save.data.coins < coins) {
      this.toast('عملاتك غير كافية! 🪙 العب أكثر لتجمع', '😢');
      this.game.audio.sfx('error');
      return false;
    }
    this.game.save.data.coins -= coins;
    this.game.ui.updateHud();
    this.game.audio.sfx('coin');
    return true;
  }

  toast(msg, icon = '✨', cls = '') {
    const el = document.createElement('div');
    el.className = `toast ${cls}`;
    el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  // floating "+10 🪙" projected from a 3D world position
  floater(worldPos, text) {
    const v = new THREE.Vector3(...(Array.isArray(worldPos) ? worldPos : [worldPos.x, worldPos.y, worldPos.z]));
    v.project(this.game.scenes.camera);
    const x = (v.x * .5 + .5) * window.innerWidth;
    const y = (-v.y * .5 + .5) * window.innerHeight;
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.app.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  coinBurst(worldPos, n = 10) {
    this.game.fx?.burstStars(worldPos, n, [0xffd54f, 0xffc107, 0xffecb3]);
    this.game.audio.sfx('coin');
  }

  confetti() {
    const emojis = ['🎉', '⭐', '✨', '🎊', '💛', '🩵', '🧡'];
    for (let i = 0; i < 34; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.textContent = emojis[(Math.random() * emojis.length) | 0];
      el.style.left = `${Math.random() * 100}vw`;
      el.style.top = `${-8 - Math.random() * 20}vh`;
      el.style.animationDuration = `${1.4 + Math.random() * 1.6}s`;
      el.style.animationDelay = `${Math.random() * .4}s`;
      this.app.appendChild(el);
      setTimeout(() => el.remove(), 3600);
    }
  }

  celebrateTask(task) {
    this.game.audio.sfx('levelup');
    this.confetti();
    this.toast(`أكملت مهمة: ${task.titleAr}! +${task.coins} 🪙 +${task.stars} ⭐`, '🏆', 'gold');
  }

  celebrate(message, icon = '🎉') {
    this.game.audio.sfx('complete');
    this.confetti();
    this.toast(message, icon, 'green');
  }
}
