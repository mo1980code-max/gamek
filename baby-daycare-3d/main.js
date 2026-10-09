// main.js — entry point.
import { Game } from './js/game.js';

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.game = game; // handy for debugging
  game.init().catch(err => {
    console.error(err);
    const tip = document.getElementById('loading-tip');
    if (tip) tip.textContent = 'حدث خطأ أثناء التحميل: ' + err.message;
  });
});
