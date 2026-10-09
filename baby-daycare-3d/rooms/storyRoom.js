// rooms/storyRoom.js — Story Room: cozy library with 5 original Arabic
// picture-stories. Page flipping, narrator (speech synthesis with melodic
// fallback), tappable page characters that react.
import { RoomBase } from '../js/roomBase.js';
import { put, grp, box, cyl, sph, emojiSprite, textSprite, rug, ceilingLamp, windowPane, bookStack, shelfUnit, starDecor, torus, mat } from '../js/kit.js';
import { speak } from './classroom.js';

const STORIES = [
  {
    title: 'الأرنب والنجمة', emoji: '🐰', cover: '🌙',
    pages: [
      { art: '🐰🌙', text: 'في ليلة هادئة، خرج الأرنب نونو ليشاهد النجوم.' },
      { art: '⭐', text: 'سقطت نجمة صغيرة من السماء وبكت: «أنا تائحة!»' },
      { art: '🤝', text: 'قال نونو: «لا تحزني، سأساعدك للعودة!»' },
      { art: '🎈', text: 'ربط نونو النجمة ببالون ملون وأطلقها للأعلى.' },
      { art: '🌟💙', text: 'وعادت النجمة لتملأ السماء ضوءًا، وقالت شكرًا!' },
    ],
  },
  {
    title: 'البطة تبحث عن صديق', emoji: '🦆', cover: '🦆',
    pages: [
      { art: '🦆🦆🦆', text: 'عاشت بطّة صغيرة اسمها ماما في بحيرة جميلة.' },
      { art: '🐟', text: 'قالت: «أريد صديقًا يلعب معي كل يوم!»' },
      { art: '🐸', text: 'قابلت ضفدعًا أخضر يقفز فوق الزنابق.' },
      { art: '💦', text: 'لعبا معًا وقفزا في الماء ورشّا الموجات!' },
      { art: '💛', text: 'وصارت صديقين لا يفترقان أبدًا.' },
    ],
  },
  {
    title: 'سيارة الألوان', emoji: '🚗', cover: '🌈',
    pages: [
      { art: '🚗', text: 'سيارة صغيرة قررت أن تلوّن المدينة كلها!' },
      { art: '🎨', text: 'مرّت على البيت الأبيض فلوّنته أحمر جميل.' },
      { art: '🌳', text: 'ورشّت الأشجار بأخضر لامع.' },
      { art: '🌈', text: 'ورسمت قوس قزح كبير فوق المدرسة.' },
      { art: '😄', text: 'وأجمل ما رسمته كانت الابتسمات على الوجوه!' },
    ],
  },
  {
    title: 'الكعكة الطيبة', emoji: '🍰', cover: '🎂',
    pages: [
      { art: '🍰', text: 'خبزت الجدة كعكة لطيفة ووضعتها على الطاولة.' },
      { art: '🐶', text: 'شمّ الجرو رائحتها فقال: «تبدو لذيذة!»' },
      { art: '🐰', text: 'جاء الأرنب وقطة أيضًا، وكلهم جوعان.' },
      { art: '✂️🍰', text: 'قطعت الجدة الكعكة وأعطت كل واحد قطعة عادلة.' },
      { art: '🤗', text: 'جلسوا معًا يأكلون ويضحكون — الطعم أحلى بالمشاركة!' },
    ],
  },
  {
    title: 'سحابة السفر', emoji: '☁️', cover: '☁️',
    pages: [
      { art: '☁️', text: 'سحابة صغيرة حلمت أن ترى العالم.' },
      { art: '🌊', text: 'طارت فوق البحر الأزرق الواسع.' },
      { art: '🏔️', text: 'وقبلت قمم الجبال العالية.' },
      { art: '🏜️', text: 'وسقت زهرة صغيرة في الصحراء!' },
      { art: '🏡💛', text: 'ثم عادت إلى الحديقة عندنا وقالت: «لا مكان مثل الحضانة!»' },
    ],
  },
];

export class StoryRoom extends RoomBase {
  static def = {
    id: 'storyRoom', nameAr: 'غرفة القصص', nameEn: 'Story Room', emoji: '📚',
    color: '#8d6e63', color2: '#a1887f', music: 'sleep', sky: 'indoor',
    rewardCoins: 18, rewardStars: 2, stat: 'stories',
  };

  build() {
    const g = this.group;
    this.shell({ w: 10, d: 10, h: 4.5, floor: 0xd7c9b8, wall: 0xf5efe6, wallLeft: 0xefe6d8, wainscot: 0xbcAAA4 });

    // library shelves full of books
    for (const [x, ry] of [[-4.55, Math.PI / 2], [0, 0], [4.55, -Math.PI / 2]]) {
      const sh = shelfUnit(3.6, 2.6, 0x8d6e63, 3);
      sh.position.set(x, 0, -4.6);
      sh.rotation.y = ry;
      g.add(sh);
      const bookCols = [0xef5350, 0xffca28, 0x42a5f5, 0x66bb6a, 0xf06292, 0xba68c8, 0x4dd0e1, 0xff8a65];
      for (let r = 0; r < 3; r++) {
        for (let b = 0; b < 7; b++) {
          put(sh, box(.14, .42, .3, bookCols[(r * 7 + b) % 8]), -1.35 + b * .38, .45 + r * .85, .05);
        }
      }
      this.addHit(sh, { label: 'المكتبة', onClick: () => this.openBookShelf() });
    }

    // sofa + rug + lamp
    const sofa = grp(g, 0, 0, 2.6);
    put(sofa, box(2.4, .5, .95, 0xffb74d), 0, .28, 0);
    put(sofa, box(2.4, .65, .22, 0xffb74d), 0, .72, -.38);
    put(sofa, box(.22, .5, .95, 0xffb74d), -1.1, .5, 0);
    put(sofa, box(.22, .5, .95, 0xffb74d), 1.1, .5, 0);
    this.addHit(sofa, { label: 'أريكة القصص', onClick: () => this.openBookShelf() });
    put(g, rug(3.6, 2.8, 0xffccbc, { inner: 0xfbe9e7 }), 0, 0, 2.2);

    const lamp = grp(g, -3.2, 0, 3);
    put(lamp, cyl(.18, .22, .08, 0x8d6e63), 0, .04, 0);
    put(lamp, cyl(.03, .03, 1.1, 0xa1887f), 0, .6, 0);
    const shade = cyl(.24, .3, .3, 0xffd54f, { open: true });
    put(lamp, shade, 0, 1.25, 0);
    this.addHit(lamp, {
      label: 'مصباح القصص',
      onClick: () => { this.game.audio.sfx('toggle'); this.game.rewards.toast('إضاءة دافئة للقراءة 💛', '🛋️'); },
    });

    // glowing stars on the ceiling
    for (let i = 0; i < 10; i++) {
      const st = starDecor(0xfff176);
      st.position.set(Math.sin(i * 2.4) * 3.4, 3.9, -3 + Math.cos(i * 1.7) * 2);
      st.rotation.x = Math.PI / 2;
      g.add(st);
    }

    // big storybook prop on a table
    const book = grp(g, 2.8, 0, 1.2);
    put(book, cyl(.5, .4, .5, 0x8d6e63), 0, .25, 0);
    put(book, box(.7, .12, .9, 0xef5350), 0, .56, 0);
    put(book, box(.68, .04, .88, 0xfff8e1), -.17, .63, 0);
    put(book, box(.68, .04, .88, 0xfff8e1), .17, .63, 0);
    put(book, emojiSprite('📖', { size: .4 }), 0, .85, 0);
    this.addHit(book, {
      label: 'الكتاب الكبير',
      onClick: () => this.openBookShelf(),
    });

    put(g, ceilingLamp(0xffcc80), 0, 4.5, 0);
    const w = windowPane(1.3, 1.4, 0xffffff, 0x5c6bc0);
    w.position.set(-2.4, 2.5, -5.4);
    g.add(w);
    const sign = textSprite('ركن القصص 📖', { color: '#5d4037', bg: 'rgba(255,255,255,.92)', fontPx: 50, height: .36 });
    sign.position.set(2, 3.4, -5.4);
    g.add(sign);

    this.setSteps([
      { id: 'read', icon: '📖', label: 'اقرأ قصة كاملة' },
    ]);
  }

  enter() {
    const b = this.addBaby(-.6, 2, Math.PI * .9, 'sit');
    b.position.y = .34;
    this.addNPCBaby('coco', .6, 2.1, Math.PI * .9, 'sit');
    this.hint('اجلس على الأريكة واختر قصة جميلة! 📚');
  }

  openBookShelf() {
    const g = this.game;
    const grid = document.createElement('div');
    grid.className = 'map-grid';
    STORIES.forEach((s, i) => {
      const card = document.createElement('button');
      card.className = 'room-card';
      card.style.background = 'linear-gradient(135deg, #8d6e63, #a1887f)';
      card.innerHTML = `<span class="rc-emoji">${s.cover}</span><span>${s.title}</span><small>${s.pages.length} صفحات</small>`;
      card.onclick = () => { g.audio.sfx('flip'); this._read(i); };
      grid.appendChild(card);
    });
    g.ui.modal({ title: 'مكتبة القصص 📚', icon: '📖', body: grid });
  }

  _read(idx) {
    const g = this.game;
    const story = STORIES[idx];
    let page = 0;
    const wrap = document.createElement('div');
    const book = document.createElement('div');
    book.className = 'book';
    const art = document.createElement('div');
    art.className = 'b-art';
    const titleEl = document.createElement('div');
    titleEl.className = 'b-title';
    titleEl.textContent = story.title;
    const text = document.createElement('div');
    text.className = 'b-text';
    const pageEl = document.createElement('div');
    pageEl.className = 'b-page';
    book.append(art, titleEl, text, pageEl);
    wrap.appendChild(book);

    const render = () => {
      const p = story.pages[page];
      art.textContent = p.art;
      text.textContent = p.text;
      pageEl.textContent = `${page + 1} / ${story.pages.length} • اضغط الرسم لسماع صوت`;
      book.classList.remove('page-flip');
      void book.offsetWidth;
      book.classList.add('page-flip');
      g.audio.sfx('flip');
      speak(p.text);
    };

    const prev = document.createElement('button');
    prev.className = 'btn small ghost';
    prev.textContent = '◀ السابق';
    prev.onclick = () => { if (page > 0) { page--; render(); } };
    const next = document.createElement('button');
    next.className = 'btn small pink';
    next.textContent = 'التالي ▶';
    next.onclick = () => {
      if (page < story.pages.length - 1) { page++; render(); }
      else {
        // finished!
        closeBook();
        g.tasks.count('stories');
        this.step('read');
        g.audio.sfx('complete');
        g.rewards.celebrate(`أنهيت قصة «${story.title}»! 📖⭐`, '📚');
        g.rewards.grant(10, 1);
        const b = g.activeBaby;
        b.setExpression('happy');
        b.animator.play('clap', { loop: false, onDone: () => b.animator.play('sit') });
      }
    };
    art.onclick = () => {
      // tappable story characters
      const sounds = ['babble', 'pop', 'giggle', 'bird', 'bubble', 'magic'];
      g.audio.sfx(sounds[(Math.random() * sounds.length) | 0]);
      g.fx.hearts({ x: g.activeBaby.position.x, y: 1.8, z: g.activeBaby.position.z }, 3);
    };
    const closeBook = g.ui.modal({ title: story.title, icon: story.cover, body: wrap, foot: [prev, next] });
    render();
  }
}
