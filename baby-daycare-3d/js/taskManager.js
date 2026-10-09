// taskManager.js — daily care missions with progress bars + rewards.
export const TASKS = [
  { id: 'feed3',    icon: '🍎', titleAr: 'أطعم 3 أطفال',        target: 3, coins: 25, stars: 1, stat: 'feedings' },
  { id: 'bath2',    icon: '🛁', titleAr: 'نظّف طفلين بالحمام',  target: 2, coins: 25, stars: 1, stat: 'baths' },
  { id: 'sleep1',   icon: '🌙', titleAr: 'ساعد طفلاً على النوم', target: 1, coins: 20, stars: 1, stat: 'sleeps' },
  { id: 'games5',   icon: '🎮', titleAr: 'العب 5 ألعاب مصغّرة',  target: 5, coins: 30, stars: 2, stat: 'minigames' },
  { id: 'meal1',    icon: '🍳', titleAr: 'حضّر وجبة في المطبخ',  target: 1, coins: 25, stars: 1, stat: 'meals' },
  { id: 'puzzle1',  icon: '🧩', titleAr: 'أكمل لغزًا',           target: 1, coins: 20, stars: 1, stat: 'puzzles' },
  { id: 'pet1',     icon: '🐶', titleAr: 'اعتنِ بحيوان أليف',    target: 1, coins: 20, stars: 1, stat: 'petcare' },
  { id: 'diaper2',  icon: '🧷', titleAr: 'غيّر حفاضين',          target: 2, coins: 20, stars: 1, stat: 'diapers' },
  { id: 'laundry1', icon: '🧺', titleAr: 'اغسل ملابس في المغسلة', target: 1, coins: 20, stars: 1, stat: 'laundry' },
  { id: 'doctor1',  icon: '🩺', titleAr: 'افحص طفلاً في العيادة', target: 1, coins: 20, stars: 1, stat: 'doctor' },
  { id: 'story1',   icon: '📚', titleAr: 'اقرأ قصة قبل النوم',   target: 1, coins: 20, stars: 1, stat: 'stories' },
  { id: 'draw1',    icon: '🎨', titleAr: 'لوحة رسم جميلة',       target: 1, coins: 15, stars: 1, stat: 'drawings' },
];

export class TaskManager {
  constructor(game) {
    this.game = game;
    this._dailyCheck();
  }
  _dailyCheck() {
    const today = new Date().toDateString();
    const t = this.game.save.data.tasks;
    if (t.day !== today) {
      t.day = today;
      t.progress = {};
      t.claimed = {};
    }
  }
  progressOf(task) {
    const p = this.game.save.data.tasks.progress[task.id] ?? 0;
    return Math.min(p, task.target);
  }
  isDone(task) { return this.progressOf(task) >= task.target; }
  isClaimed(task) { return !!this.game.save.data.tasks.claimed[task.id]; }

  // rooms call: game.tasks.count('feedings')
  count(stat, n = 1) {
    this._dailyCheck();
    const d = this.game.save.data;
    d.stats[stat] = (d.stats[stat] || 0) + n;
    let newlyDone = null;
    for (const task of TASKS) {
      if (task.stat !== stat) continue;
      const before = this.progressOf(task);
      d.tasks.progress[task.id] = before + n;
      if (before < task.target && d.tasks.progress[task.id] >= task.target && !this.isClaimed(task)) {
        newlyDone = task;
        this._claim(task);
      }
    }
    if (newlyDone) {
      this.game.rewards.celebrateTask(newlyDone);
    }
    this.game.ui.refreshOpenPanels?.();
  }

  _claim(task) {
    this.game.save.data.tasks.claimed[task.id] = true;
    this.game.rewards.grant(task.coins, task.stars);
  }
  allDone() { return TASKS.every(t => this.isClaimed(t)); }
}
