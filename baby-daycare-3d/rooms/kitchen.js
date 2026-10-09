// rooms/kitchen.js — Baby Kitchen: real recipe crafting. Pick a recipe from
// the book, add ingredients, use the right tool (blender/knife/stove/oven),
// then feed the baby the finished dish. Stars fly on success.
import { RoomBase } from '../js/roomBase.js';
import * as THREE from 'three';
import { put, grp, box, cyl, sph, emojiSprite, textSprite, rug, ceilingLamp, windowPane, mat, block } from '../js/kit.js';
import { tween, wait } from '../js/tween.js';
import { INGREDIENTS, TOOLS, RECIPES } from '../minigames/cooking.js';

export class Kitchen extends RoomBase {
  static def = {
    id: 'kitchen', nameAr: 'المطبخ', nameEn: 'Baby Kitchen', emoji: '🍳',
    color: '#ffb300', color2: '#ffa000', music: 'kitchen', sky: 'indoor',
    rewardCoins: 20, rewardStars: 2, stat: 'meals',
  };

  build() {
    const g = this.group;
    this.shell({ w: 11, d: 11, h: 4.6, floor: 0xfff3cd, wall: 0xfff8e1, wallLeft: 0xfffbf0, wainscot: 0xffd54f });

    // ---------- fridge ----------
    this.fridge = grp(g, -4.5, 0, -3.4);
    this.fridge.rotation.y = Math.PI / 3;
    put(this.fridge, box(1.1, 2.2, .9, 0x90caf9), 0, 1.1, 0);
    put(this.fridge, box(1.12, .06, .92, 0xffffff), 0, 1.45, 0);
    put(this.fridge, box(.06, .5, .06, 0xb0bec5), .45, 1.7, .48);
    put(this.fridge, box(.06, .7, .06, 0xb0bec5), .45, .85, .48);
    put(this.fridge, emojiSprite('🧲', { size: .3 }), .2, 1.2, .48);
    this.addHit(this.fridge, {
      label: 'الثلاجة',
      onClick: () => {
        this.game.audio.sfx('doorOpen');
        this._giveIngredient('milk');
      },
    });

    // ---------- counters with ingredients ----------
    const counter = grp(g, 0, 0, -3.9);
    put(counter, box(6.6, .95, 1, 0xa1887f), 0, .48, 0);
    put(counter, box(6.7, .08, 1.1, 0xe0e0e0), 0, 1, 0);
    this._ingMeshes = {};
    const ingList = ['banana', 'apple', 'strawberry', 'potato', 'carrot', 'orange', 'dough', 'choco'];
    ingList.forEach((id, i) => {
      const ing = INGREDIENTS[id];
      const m = grp(counter, -2.8 + i * .8, 1.25, 0);
      put(m, cyl(.16, .18, .1, 0xffffff), 0, -.12, 0);
      put(m, emojiSprite(ing.emoji, { size: .42 }), 0, .05, 0);
      this._ingMeshes[id] = m;
      this.addHit(m, {
        label: ing.ar,
        onClick: () => this._giveIngredient(id),
      });
    });

    // ---------- tools ----------
    // blender
    this.blender = grp(g, 3.9, 0, -3.7);
    put(this.blender, box(.4, .12, .4, 0x9e9e9e), 0, 1.16, 0);
    put(this.blender, cyl(.18, .14, .4, 0xb3e5fc, { mat: mat(0xb3e5fc, { transparent: true, opacity: .7 }) }), 0, 1.42, 0);
    put(this.blender, box(.14, .1, .14, 0x616161), 0, 1.64, 0);
    this.addHit(this.blender, {
      label: 'الخلاط',
      onClick: () => this._useTool('blender'),
    });
    // knife + board
    this.board = grp(g, -3.3, 0, -1.2);
    put(this.board, box(.9, .06, .6, 0xa5d6a7), 0, 1.04, 0);
    put(this.board, box(.04, .3, .1, 0xb0bec5), .25, 1.2, 0);
    this.addHit(this.board, {
      label: 'لوح التقطيع',
      onClick: () => this._useTool('knife'),
    });
    // stove + pot
    this.stove = grp(g, 0, 0, -3.9);
    put(this.stove, box(1.2, .1, .9, 0x424242), 0, 1.06, .2);
    put(this.stove, cyl(.16, .16, .03, 0x212121), -.25, 1.13, .1);
    put(this.stove, cyl(.16, .16, .03, 0x212121), .25, 1.13, .1);
    this.pot = grp(this.stove, 0, 1.3, .1);
    put(this.pot, cyl(.28, .24, .3, 0xe53935), 0, 0, 0);
    put(this.pot, cyl(.3, .3, .04, 0xb71c1c), 0, .16, 0);
    put(this.pot, box(.3, .04, .05, 0x212121), 0, .02, .28);
    this.addHit(this.stove, {
      label: 'الموقد والقدر',
      onClick: () => this._useTool('pot'),
    });
    // oven
    this.oven = grp(g, 2.2, 0, -3.9);
    put(this.oven, box(1.2, 1, .9, 0x78909c), 0, .5, 0);
    put(this.oven, box(.9, .55, .06, 0x263238), 0, .55, .47);
    put(this.oven, box(.8, .08, .05, 0xffca28), 0, .9, .48);
    this._ovenLight = put(this.oven, box(.12, .12, .04, 0xff5252, { mat: mat(0xff5252, { emissive: 0x000000 }) }), .45, .25, .48);
    this.addHit(this.oven, {
      label: 'الفرن',
      onClick: () => this._useTool('oven'),
    });
    // sink
    const sink = grp(g, -2.2, 0, -3.9);
    put(sink, box(.9, .3, .7, 0xb0bec5), 0, 1.05, 0);
    put(sink, box(.7, .12, .5, 0x81d4fa), 0, 1.08, 0);
    put(sink, cyl(.03, .03, .4, 0x78909c), 0, 1.35, -.2).rotation.x = .6;
    this.addHit(sink, {
      label: 'حوض الغسيل (اغسل الفواكه)',
      onClick: () => {
        this.game.audio.sfx('water');
        this.game.fx.splash({ x: -2.2, y: 1.3, z: -3.9 }, 10);
        if (this._bowl.length && !this.isStepDone('wash')) { this.step('wash'); this.game.rewards.toast('غسلنا الفواكه جيدًا! 💧', '🚿'); }
      },
    });

    // ---------- recipe book ----------
    this.book = grp(g, 0, 0, 1.6);
    const table = box(1.6, .08, 1, 0xffb74d);
    put(this.book, table, 0, .6, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      put(this.book, cyl(.05, .05, .6, 0x8d6e63), sx * .7, .3, sz * .4);
    put(this.book, box(.5, .06, .65, 0xffffff), -.1, .68, 0);
    put(this.book, emojiSprite('📖', { size: .4 }), -.1, .9, 0);
    this.addHit(this.book, {
      label: 'كتاب الوصفات',
      onClick: () => this.openRecipeBook(),
    });

    // bowl for combining
    this.bowl = grp(g, 1.4, 0, .9);
    put(this.bowl, cyl(.32, .22, .25, 0xff8fab), 0, .72, 0);
    put(this.bowl, emojiSprite('🥣', { size: .3 }), 0, .95, 0);
    this.bowl.visible = false;

    // baby high chair
    this.chair = grp(g, 2.8, 0, 1.6);
    put(this.chair, box(.55, .08, .55, 0x81c784), 0, .55, 0);
    put(this.chair, box(.55, .6, .08, 0x81c784), 0, .85, -.26);
    put(this.chair, box(.6, .07, .12, 0xffffff), 0, .75, .22);

    put(g, rug(3.2, 2.2, 0xffecb3, { inner: 0xfff8e1 }), 0, 0, 2);
    put(g, ceilingLamp(0xffd54f), 0, 4.55, 0);
    const w = windowPane(1.4, 1.2);
    w.position.set(3.4, 2.5, -5.44);
    g.add(w);
    const sign = textSprite('مطبخ الصغار 👨‍🍳', { color: '#e65100', bg: 'rgba(255,255,255,.9)', fontPx: 50, height: .36 });
    sign.position.set(-1.6, 3.5, -5.42);
    g.add(sign);

    this._recipe = null;
    this._bowl = [];
    this._toolUsed = false;
    this._dish = null;

    this.setSteps([
      { id: 'recipe', icon: '📖', label: 'اختر وصفة من الكتاب' },
      { id: 'wash', icon: '💧', label: 'اغسل الفواكه' },
      { id: 'add', icon: '🥣', label: 'أضف المكونات' },
      { id: 'tool', icon: '🌀', label: 'استخدم الأداة المناسبة' },
      { id: 'feed', icon: '😋', label: 'أطعم الطفل الطبق' },
    ]);
  }

  enter() {
    this.addBaby(2.8, 2.5, Math.PI, 'idle');
    this._enableChair();
    this.hint('اضغط كتاب الوصفات 📖 وابدأ الطبخ!');
  }

  _enableChair() {
    this.addHit(this.chair, {
      label: 'اجلس الطفل للم希尔عة' .replace('希尔عة', 'أكل'),
      onClick: () => {
        const b = this.game.activeBaby;
        b.position.set(2.8, .62, 1.6);
        b.rotation.y = 0;
        b.animator.play('sit');
        this.game.audio.sfx('pop');
        this.game.rewards.toast('الطفل جاهز لتناول الطبق! 😋', '🪑');
      },
    });
  }

  openRecipeBook() {
    const g = this.game;
    const wrap = document.createElement('div');
    for (const r of RECIPES) {
      const row = document.createElement('div');
      row.className = 'recipe-row';
      const ings = [...new Set(r.ingredients)].map(i => INGREDIENTS[i].emoji).join(' + ');
      row.innerHTML = `<span class="ing">${r.dishEmoji}</span><span style="flex:1">${r.ar}</span>
        <span class="ing">${ings}</span><span class="ing">${TOOLS[r.tool].emoji} ${TOOLS[r.tool].ar}</span>`;
      const btn = document.createElement('button');
      btn.className = 'btn small pink';
      btn.textContent = 'اطبخ!';
      btn.onclick = () => { g.audio.sfx('click'); closeBook(); this._pickRecipe(r); };
      row.appendChild(btn);
      wrap.appendChild(row);
    }
    const closeBook = g.ui.modal({ title: 'كتاب الوصفات 📖', icon: '👨‍🍳', body: wrap });
  }

  _pickRecipe(r) {
    this._recipe = r;
    this._bowl = [];
    this._toolUsed = false;
    this.step('recipe');
    this.hint(`اطبخ ${r.ar} ${r.dishEmoji}: أضف ${[...new Set(r.ingredients)].map(i => INGREDIENTS[i].emoji).join('')} ثم استخدم ${TOOLS[r.tool].emoji}`);
    this.bowl.visible = true;
    this.game.rewards.toast(`وصفة جديدة: ${r.ar}`, r.dishEmoji);
  }

  _giveIngredient(id) {
    if (!this._recipe) { this.game.audio.sfx('error'); this.hint('اختر وصفة من الكتاب أولًا 📖'); return; }
    const need = this._recipe.ingredients.filter(i => i === id).length;
    const have = this._bowl.filter(i => i === id).length;
    const inRecipe = this._recipe.ingredients.includes(id);
    if (!inRecipe) {
      this.game.audio.sfx('error');
      this.game.rewards.toast(`${INGREDIENTS[id].ar} ليست في هذه الوصفة!`, '🤔');
      return;
    }
    if (have >= need) { this.game.audio.sfx('pop'); return; }
    this._bowl.push(id);
    this.game.audio.sfx('drop');
    const src = this._ingMeshes[id];
    const fly = emojiSprite(INGREDIENTS[id].emoji, { size: .4 });
    fly.position.copy(src.getWorldPosition(new (src.position.constructor)()));
    this.group.add(fly);
    tween(fly.position, { x: 1.4, y: 1, z: .9 }, {
      dur: .5,
      onDone: () => {
        this.group.remove(fly);
        this.game.fx.sparkles({ x: 1.4, y: 1, z: .9 }, 5);
        const total = this._recipe.ingredients.length;
        if (this._bowl.length >= total) {
          this.step('add');
          this.hint(`ممتاز! الآن استخدم ${TOOLS[this._recipe.tool].emoji} ${TOOLS[this._recipe.tool].ar}`);
        } else {
          this.hint(`أضفت ${this._bowl.length}/${total} — أكمل المكونات!`);
        }
      },
    });
  }

  _useTool(tool) {
    if (!this._recipe) { this.game.audio.sfx('error'); this.hint('اختر وصفة أولًا 📖'); return; }
    if (this._bowl.length < this._recipe.ingredients.length) { this.game.audio.sfx('error'); this.hint('أكمل المكونات أولًا!'); return; }
    if (tool !== this._recipe.tool) {
      this.game.audio.sfx('error');
      this.game.rewards.toast(`هذه الوصفة تحتاج ${TOOLS[this._recipe.tool].ar} ${TOOLS[this._recipe.tool].emoji}`, '❌');
      return;
    }
    if (this._toolUsed) { this.game.audio.sfx('pop'); return; }
    this._toolUsed = true;
    const t = TOOLS[tool];
    this.game.audio.startLoop(t.sound === 'fire' ? 'fire' : t.sound);
    const state = { p: 0 };
    this.hint(`${t.ar} جارٍ… ⏳`);
    // tool animation
    if (tool === 'blender') tween(this.blender.children[2].rotation, { z: 6 }, { dur: t.time });
    if (tool === 'oven') this._ovenLight.material = mat(0xff5252, { emissive: 0xff5252, emissiveIntensity: 1.4 });
    const steamLoop = setInterval(() => {
      this.game.fx.steam({ x: this.bowl.position.x, y: 1.2, z: this.bowl.position.z }, 2);
    }, 500);
    tween(state, { p: 1 }, {
      dur: t.time,
      onUpdate: () => { if (Math.random() < .1) this.game.audio.sfx('click'); },
      onDone: () => {
        clearInterval(steamLoop);
        this.game.audio.stopLoop(t.sound === 'fire' ? 'fire' : t.sound);
        this._ovenLight.material = mat(0xff5252, { emissive: 0x000000 });
        this.game.audio.sfx('success');
        this.game.fx.burstStars({ x: this.bowl.position.x, y: 1.3, z: this.bowl.position.z }, 16);
        this.step('tool');
        // dish appears!
        const dish = emojiSprite(this._recipe.dishEmoji, { size: .55 });
        dish.position.set(1.4, 1.15, .9);
        this.group.add(dish);
        this._dish = dish;
        this.hint(`طبق ${this._recipe.ar} جاهز! اضغط عليه لإطعام الطفل ${this._recipe.dishEmoji}`);
        this.game.rewards.toast(`اكتمل ${this._recipe.ar}! ${this._recipe.dishEmoji}`, '⭐', 'gold');
      },
    });
  }

  _feedDish() {
    if (!this._dish || !this._recipe) return;
    const b = this.game.activeBaby;
    tween(this._dish.position, { x: b.position.x, y: b.position.y + 1.5, z: b.position.z + .3 }, {
      dur: .6,
      onDone: () => {
        this.group.remove(this._dish);
        this._dish = null;
        b.setExpression('happy', true);
        this.game.audio.sfx('munch');
        this.game.audio.sfx('giggle');
        b.ai.apply({ hunger: this._recipe.hunger, happiness: this._recipe.happiness, comfort: 6 });
        this.game.fx.hearts({ x: b.position.x, y: 1.9, z: b.position.z }, 8);
        this.step('feed');
        this.game.rewards.celebrate(`قدمت ${this._recipe.ar} بنجاح! ${this._recipe.dishEmoji}`, '👨‍🍳');
        this._recipe = null;
        this.bowl.visible = false;
        setTimeout(() => { b.setExpression('excited'); b.animator.play('clap', { loop: false, onDone: () => b.animator.play('idle') }); }, 700);
      },
    });
  }

  update() {
    if (this._dish) this._dish.position.y = 1.15 + Math.sin(performance.now() / 300) * .06;
  }

  onAllStepsDone() {
    this.hint(null);
  }
}
