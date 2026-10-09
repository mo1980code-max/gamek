// rooms/petRoom.js — Pet Care Room: cat, dog, rabbit, hamster, fish, bird.
// Feed, brush, play — every pet reacts with its own synthesized sound.
import { RoomBase } from '../js/roomBase.js';
import * as THREE from 'three';
import { put, grp, box, cyl, sph, cone, torus, capsule, emojiSprite, textSprite, rug, ceilingLamp, mat } from '../js/kit.js';
import { tween } from '../js/tween.js';

export class PetRoom extends RoomBase {
  static def = {
    id: 'petRoom', nameAr: 'غرفة الحيوانات الأليفة', nameEn: 'Pet Care Room', emoji: '🐶',
    color: '#8bc34a', color2: '#aed581', music: 'garden', sky: 'indoor',
    rewardCoins: 20, rewardStars: 2, stat: 'petcare',
  };

  build() {
    const g = this.group;
    this.shell({ w: 11, d: 10.5, h: 4.5, floor: 0xe8f0d8, wall: 0xf4faeb, wallLeft: 0xf0f7e6, wainscot: 0xaed581 });

    this.pets = [];
    const defs = [
      { id: 'cat', ar: 'قطة', x: -3.8, z: -2.8, snd: 'cat', make: () => this._cat() },
      { id: 'dog', ar: 'كلب', x: -1.2, z: -3.2, snd: 'dog', make: () => this._dog() },
      { id: 'rabbit', ar: 'أرنب', x: 1.4, z: -3.2, snd: 'rabbit', make: () => this._rabbit() },
      { id: 'hamster', ar: 'هامستر', x: 3.8, z: -2.8, snd: 'hamster', make: () => this._hamster() },
      { id: 'fish', ar: 'سمكة', x: 4.4, z: .8, snd: 'fishpop', make: () => this._fishTank() },
      { id: 'bird', ar: 'طائر', x: -4.4, z: .8, snd: 'bird', make: () => this._birdCage() },
    ];
    defs.forEach(d => {
      const pet = d.make();
      pet.position.set(d.x, 0, d.z);
      g.add(pet);
      const rec = { id: d.id, ar: d.ar, mesh: pet, snd: d.snd, fed: false, brushed: false, played: false };
      this.pets.push(rec);
      this.addHit(pet, {
        label: `${d.ar} — اضغط للعب`,
        onClick: () => this._play(rec),
      });
    });

    // food bowls station
    const bowls = grp(g, 0, 0, -4.3);
    put(bowls, box(2.2, .08, .5, 0xa1887f), 0, .5, 0);
    ['🥩', '🥕', '🌰'].forEach((e, i) => {
      const bowl = grp(bowls, -.7 + i * .7, .6, 0);
      put(bowl, cyl(.16, .12, .1, [0xef5350, 0xff9800, 0x8d6e63][i]), 0, 0, 0);
      put(bowl, emojiSprite(e, { size: .26 }), 0, .22, 0);
      this.addHit(bowl, {
        label: 'مصدع طعام (اسحب للحيوان)',
        dragY: 0,
        onDragStart: () => this.game.audio.sfx('pop'),
        onDragMove: pt => bowl.position.set(pt.x, .55, pt.z),
        onDrop: pt => {
          // find nearest pet
          let best = null, bd = 1.6;
          for (const p of this.pets) {
            if (p.id === 'fish' || p.id === 'bird') continue;
            const d = Math.hypot(pt.x - p.mesh.position.x, pt.z - p.mesh.position.z);
            if (d < bd) { bd = d; best = p; }
          }
          if (best) this._feed(best);
          else { this.game.audio.sfx('drop'); }
          tween(bowl.position, { x: -.7 + ['🥩', '🥕', '🌰'].indexOf(bowls.children.indexOf(bowl)), y: .6, z: 0 }, { dur: .3, onDone: () => {} });
          // snap back regardless
          setTimeout(() => { bowl.position.set(bowl.userData.ox ?? bowl.position.x, .6, 0); }, 50);
        },
      });
      bowl.userData.ox = -.7 + i * .7;
    });

    // brush
    const brush = grp(g, 2.2, 0, 1.2);
    put(brush, box(.4, .08, .22, 0xf06292), 0, .6, 0);
    put(brush, cyl(.06, .06, .18, 0xff8fab), 0, .78, 0);
    put(brush, emojiSprite('🪮', { size: .3 }), 0, 1, 0);
    this.addHit(brush, {
      label: 'فرشاة الفرو',
      onClick: () => {
        this.game.audio.sfx('brush');
        this.game.rewards.toast('اضغط على حيوان لتمشيط فروه!', '🪮');
        this._brushArmed = true;
      },
    });

    // pet beds
    for (const [x, z] of [[-3.8, 3.4], [-1.2, 3.6]]) {
      const bed = grp(g, x, 0, z);
      put(bed, torus(.5, .16, 0xff8fab), 0, .16, 0).rotation.x = Math.PI / 2;
      put(bed, cyl(.42, .42, .08, 0xfff3e0), 0, .08, 0);
      this.addHit(bed, {
        label: 'سرير الحيوان',
        onClick: () => {
          this.game.audio.sfx('pop');
          this.game.fx.zzz({ x, y: .8, z });
          this.game.rewards.toast('سرير دافئ ومرتب 💤', '🛏️');
          if (!this.isStepDone('bed')) this.step('bed');
        },
      });
    }

    put(g, rug(3.6, 2.6, 0xdcedc8, { inner: 0xf1f8e9 }), 0, 0, 1.6);
    put(g, ceilingLamp(0xaed581), 0, 4.5, 0);
    const sign = textSprite('عيادة الحيوانات الصغيرة 🐾', { color: '#33691e', bg: 'rgba(255,255,255,.92)', fontPx: 46, height: .34 });
    sign.position.set(0, 3.6, -5.2);
    g.add(sign);

    this._fedPets = new Set();
    this.setSteps([
      { id: 'feed', icon: '🥩', label: 'أطعم حيوانين' },
      { id: 'brush', icon: '🪮', label: 'مشط فرو حيوان' },
      { id: 'play', icon: '🎾', label: 'العب مع 3 حيوانات' },
      { id: 'bed', icon: '🛏️', label: 'رتّب سرير حيوان' },
    ]);
  }

  enter() {
    this.addBaby(0, 1.8, Math.PI, 'idle');
    this.hint('اسحب أطباق الطعام للحيوانات واضغط عليها للعب! 🐾');
  }

  /* ---------- pet meshes ---------- */
  _cat() {
    const g = new THREE.Group();
    const orange = 0xffa726;
    const body = sph(.3, orange); body.scale.set(1, .8, 1.3); body.position.y = .3; g.add(body);
    const head = sph(.22, orange); head.position.set(0, .58, .3); g.add(head);
    for (const sx of [-1, 1]) {
      const ear = cone(.08, .14, orange);
      ear.position.set(sx * .13, .78, .28);
      g.add(ear);
    }
    const tail = torus(.18, .04, orange, { arc: Math.PI * 1.2 });
    tail.position.set(0, .38, -.42);
    tail.rotation.y = Math.PI / 2;
    g.add(tail);
    for (const sx of [-1, 1]) {
      const eye = sph(.035, 0x33691e, { shadow: false });
      eye.position.set(sx * .09, .6, .48);
      g.add(eye);
    }
    put(g, sph(.03, 0xf48fb1, { shadow: false }), 0, .53, .52);
    return g;
  }
  _dog() {
    const g = new THREE.Group();
    const brown = 0x8d6e63;
    const body = sph(.34, brown); body.scale.set(1, .85, 1.3); body.position.y = .34; g.add(body);
    const head = sph(.25, brown); head.position.set(0, .66, .34); g.add(head);
    const snout = sph(.12, 0xd7ccc8); snout.position.set(0, .6, .55); g.add(snout);
    put(g, sph(.03, 0x3e2723, { shadow: false }), 0, .63, .66);
    for (const sx of [-1, 1]) {
      const ear = sph(.1, 0x5d4037); ear.scale.set(.5, 1, .7); ear.position.set(sx * .22, .74, .3); g.add(ear);
      const eye = sph(.035, 0x263238, { shadow: false }); eye.position.set(sx * .1, .7, .55); g.add(eye);
    }
    const tail = cyl(.04, .02, .3, brown);
    tail.position.set(0, .5, -.45); tail.rotation.x = -.8;
    g.add(tail);
    return g;
  }
  _rabbit() {
    const g = new THREE.Group();
    const white = 0xf5f5f5;
    const body = sph(.26, white); body.scale.set(1, .9, 1.2); body.position.y = .26; g.add(body);
    const head = sph(.2, white); head.position.set(0, .52, .24); g.add(head);
    for (const sx of [-1, 1]) {
      const ear = capsule(.05, .3, white);
      ear.position.set(sx * .09, .85, .15);
      ear.rotation.z = sx * .15;
      g.add(ear);
      const eye = sph(.03, 0x4e342e, { shadow: false });
      eye.position.set(sx * .08, .55, .4);
      g.add(eye);
    }
    put(g, sph(.05, 0xff8fab, { shadow: false }), 0, .47, .43);
    return g;
  }
  _hamster() {
    const g = new THREE.Group();
    const gold = 0xffca28;
    const body = sph(.2, gold); body.scale.set(1, .9, 1.15); body.position.y = .2; g.add(body);
    const head = sph(.15, gold); head.position.set(0, .38, .18); g.add(head);
    for (const sx of [-1, 1]) {
      const ear = sph(.045, 0xffe0b2);
      ear.position.set(sx * .08, .5, .1);
      g.add(ear);
      const eye = sph(.022, 0x3e2723, { shadow: false });
      eye.position.set(sx * .06, .4, .3);
      g.add(eye);
    }
    // wheel
    const wheel = torus(.32, .025, 0xb0bec5, { seg: 8, seg2: 22 });
    wheel.position.set(0, .35, -.45);
    wheel.rotation.y = Math.PI / 2;
    g.add(wheel);
    g.userData.wheel = wheel;
    return g;
  }
  _fishTank() {
    const g = new THREE.Group();
    put(g, box(1.1, 1.2, .8, 0xb3e5fc, { mat: mat(0xb3e5fc, { transparent: true, opacity: .45 }) }), 0, .8, 0);
    put(g, box(1.15, .12, .85, 0x78909c), 0, .18, 0);
    put(g, box(1.15, .1, .85, 0x4dd0e1), 0, 1.45, 0);
    put(g, sph(.12, 0xffca28, { shadow: false }), 0, .5, -.15).scale.set(.5, 1.4, .5);  // castle-ish
    const fish = new THREE.Group();
    const body = sph(.12, 0xef5350, { shadow: false });
    body.scale.set(1.3, .8, .6);
    fish.add(body);
    const tail = cone(.08, .14, 0xff8a80, { shadow: false });
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -.17;
    fish.add(tail);
    fish.position.set(0, 1, .1);
    g.add(fish);
    g.userData.fish = fish;
    const bubble = emojiSprite('🫧', { size: .2 });
    bubble.position.set(.3, 1.3, .1);
    g.add(bubble);
    g.userData.bubble = bubble;
    return g;
  }
  _birdCage() {
    const g = new THREE.Group();
    put(g, cyl(.5, .55, .1, 0x8d6e63), 0, .05, 0);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffd54f, { metal: .5, rough: .4 }));
    dome.position.y = .1;
    g.add(dome);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bar = torus(.45, .012, 0xffd54f, { arc: Math.PI, seg: 6, seg2: 12 });
      bar.rotation.set(0, a, 0);
      bar.position.y = .1;
      bar.rotation.x = 0;
      g.add(bar);
    }
    const bird = new THREE.Group();
    put(bird, sph(.1, 0x29b6f6, { shadow: false }), 0, 0, 0);
    put(bird, sph(.05, 0x4fc3f7, { shadow: false }), 0, .1, .02);
    put(bird, cone(.03, .07, 0xff9800, { shadow: false }), 0, .08, .11).rotation.x = Math.PI / 2;
    bird.position.y = .5;
    g.add(bird);
    g.userData.bird = bird;
    put(g, cyl(.02, .02, .3, 0x8d6e63), 0, .3, 0);
    return g;
  }

  /* ---------- interactions ---------- */
  _feed(pet) {
    if (pet.id === 'fish' || pet.id === 'bird') { this.game.audio.sfx(pet.snd); return; }
    this.game.audio.sfx('munch');
    this.game.audio.sfx(pet.snd);
    this.game.fx.hearts({ x: pet.mesh.position.x, y: 1, z: pet.mesh.position.z }, 4);
    this.game.rewards.toast(`${pet.ar} أكلت وشبعت! 😋`, '🥩');
    pet.mesh.scale.y = 1;
    tween(pet.mesh.scale, { y: 1.12 }, { dur: .2, onDone: () => tween(pet.mesh.scale, { y: 1 }, { dur: .25 }) });
    this._fedPets.add(pet.id);
    if (this._fedPets.size >= 2 && !this.isStepDone('feed')) {
      this.step('feed');
      this.game.tasks.count('petcare');
      this.hint('الآن اضغط الفرشاة ثم مشط حيوانًا 🪮');
    }
  }

  _play(pet) {
    const g = this.game;
    g.audio.sfx(pet.snd);
    // jump animation
    const y0 = pet.mesh.position.y;
    tween(pet.mesh.position, { y: y0 + .3 }, { dur: .18, onDone: () => tween(pet.mesh.position, { y: y0 }, { dur: .2 }) });
    g.fx.hearts({ x: pet.mesh.position.x, y: 1.1, z: pet.mesh.position.z }, 3);
    if (this._brushArmed) {
      this._brushArmed = false;
      g.audio.sfx('brush');
      g.fx.sparkles({ x: pet.mesh.position.x, y: .8, z: pet.mesh.position.z }, 6);
      g.rewards.toast(`فرو ${pet.ar} ناعم ولامع! ✨`, '🪮');
      pet.brushed = true;
      if (!this.isStepDone('brush')) { this.step('brush'); this.hint('الآن العب مع 3 حيوانات! 🎾'); }
      return;
    }
    pet.played = true;
    pet.mesh.userData.playedAt = performance.now();
    const playedCount = this.pets.filter(p => p.played).length;
    if (playedCount >= 3 && !this.isStepDone('play')) {
      this.step('play');
      g.rewards.toast('الحيوانات تحبك! 💖', '🐾', 'gold');
    }
  }

  update(dt, time) {
    // ambient pet life
    for (const p of this.pets) {
      if (p.id === 'fish' && p.mesh.userData.fish) {
        const f = p.mesh.userData.fish;
        f.position.x = Math.sin(time * .8) * .3;
        f.rotation.y = Math.cos(time * .8) > 0 ? 0 : Math.PI;
        p.mesh.userData.bubble.position.y = 1.1 + ((time * .4) % .5);
      }
      if (p.id === 'bird' && p.mesh.userData.bird) {
        p.mesh.userData.bird.position.y = .5 + Math.abs(Math.sin(time * 3)) * .12;
        if (Math.random() < dt * .08) this.game.audio.sfx('bird');
      }
      if (p.id === 'hamster' && p.mesh.userData.wheel) {
        p.mesh.userData.wheel.rotation.x = time * 1.5;
      }
      if (p.id === 'cat') p.mesh.rotation.y = Math.sin(time * .4) * .3;
      if (p.id === 'dog' && Math.random() < dt * .05) this.game.audio.sfx('dog');
    }
  }
}
