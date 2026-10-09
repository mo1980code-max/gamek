// audioManager.js — 100% procedural sound with the Web Audio API.
// Every effect, instrument and music track is synthesized at runtime, so the
// game ships with zero audio files (see README for production notes).
const midi2f = m => 440 * Math.pow(2, (m - 69) / 12);

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicVol = .7;
    this.sfxVol = .9;
    this.loops = new Map();       // name -> {nodes, gain}
    this._noiseBuf = null;
    this.music = null;            // {key, notes, bpm, idx, loop, nextTime, timer}
    this.muted = false;
  }

  /* ---------------- core ---------------- */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.master);
      this._buildNoise();
      if (this._pendingMusic) this.playMusic(this._pendingMusic);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  _buildNoise() {
    const len = this.ctx.sampleRate * 1.2;
    this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this._noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setMusic(v) { this.musicVol = v; if (this.musicGain) this.musicGain.gain.value = this.muted ? 0 : v; }
  setSfx(v) { this.sfxVol = v; if (this.sfxGain) this.sfxGain.gain.value = this.muted ? 0 : v; }
  setMuted(m) {
    this.muted = m;
    if (this.musicGain) this.musicGain.gain.value = m ? 0 : this.musicVol;
    if (this.sfxGain) this.sfxGain.gain.value = m ? 0 : this.sfxVol;
  }
  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  /* ---------------- primitive voices ---------------- */
  tone({ f0 = 440, f1 = null, at = 0, dur = .2, type = 'sine', vol = .5, dest = null, attack = .008, bend = 'exp' }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 !== null) {
      if (bend === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      else o.frequency.linearRampToValueAtTime(Math.max(20, f1), t + dur);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + .05);
  }
  noise({ at = 0, dur = .2, vol = .4, type = 'lowpass', f0 = 1000, f1 = null, q = 1, dest = null, attack = .004 }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = this._noiseBuf; src.loop = true;
    src.playbackRate.value = .8 + Math.random() * .4;
    const fl = c.createBiquadFilter();
    fl.type = type; fl.frequency.setValueAtTime(f0, t); fl.Q.value = q;
    if (f1 !== null) fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(dest || this.sfxGain);
    src.start(t); src.stop(t + dur + .05);
  }

  /* ---------------- instruments ---------------- */
  note(instr, midi, at = 0, dur = .3, vol = .5, dest = null) {
    const f = midi2f(midi);
    switch (instr) {
      case 'piano':
        this.tone({ f0: f, at, dur, type: 'triangle', vol: vol * .9, dest });
        this.tone({ f0: f * 2, at, dur: dur * .5, type: 'sine', vol: vol * .3, dest });
        break;
      case 'xylo':
        this.tone({ f0: f, at, dur: dur * .8, type: 'sine', vol, dest });
        this.tone({ f0: f * 4, at, dur: dur * .2, type: 'sine', vol: vol * .25, dest });
        break;
      case 'bell':
        this.tone({ f0: f, at, dur: dur * 1.6, type: 'sine', vol: vol * .8, dest });
        this.tone({ f0: f * 2.76, at, dur: dur, type: 'sine', vol: vol * .3, dest });
        break;
      case 'guitar':
        this.tone({ f0: f, at, dur: dur, type: 'sawtooth', vol: vol * .4, dest });
        this.tone({ f0: f, at, dur: dur * .9, type: 'triangle', vol: vol * .5, dest });
        this.noise({ at, dur: .04, vol: vol * .3, type: 'highpass', f0: 2000, dest });
        break;
      case 'flute':
        this.tone({ f0: f, at, dur, type: 'triangle', vol: vol * .7, dest, attack: .05 });
        this.noise({ at, dur, vol: vol * .06, type: 'bandpass', f0: f * 2, q: 6, dest });
        break;
      case 'drum':
        this.tone({ f0: 150, f1: 45, at, dur: .18, type: 'sine', vol, dest });
        this.noise({ at, dur: .08, vol: vol * .5, f0: 400, f1: 100, dest });
        break;
      case 'tom':
        this.tone({ f0: 220, f1: 90, at, dur: .15, type: 'sine', vol, dest });
        break;
      case 'hat':
        this.noise({ at, dur: .05, vol: vol * .5, type: 'highpass', f0: 6000, dest });
        break;
      case 'tamb':
        for (let i = 0; i < 3; i++)
          this.noise({ at: at + i * .012, dur: .06, vol: vol * .4, type: 'highpass', f0: 5000 + i * 800, dest });
        break;
      default:
        this.tone({ f0: f, at, dur, type: 'sine', vol, dest });
    }
  }

  /* ---------------- SFX dictionary ---------------- */
  sfx(name, o = {}) {
    if (!this.ctx || this.muted) return;
    const N = (i, m, at, d, v) => this.note(i, m, at, d, v);
    switch (name) {
      case 'click': this.tone({ f0: 660, f1: 330, dur: .08, type: 'square', vol: .18 }); break;
      case 'hover': this.tone({ f0: 880, dur: .05, type: 'sine', vol: .07 }); break;
      case 'toggle': this.tone({ f0: 520, f1: 700, dur: .06, type: 'square', vol: .15 }); break;
      case 'success': N('piano', 76, 0, .18, .5); N('piano', 80, .1, .18, .5); N('piano', 83, .2, .18, .5); N('piano', 88, .3, .4, .6); break;
      case 'error': this.tone({ f0: 220, f1: 160, dur: .18, type: 'sawtooth', vol: .2 }); this.tone({ f0: 180, f1: 120, at: .16, dur: .22, type: 'sawtooth', vol: .2 }); break;
      case 'reward': for (let i = 0; i < 5; i++) N('bell', 84 + i * 4, i * .07, .3, .35); break;
      case 'coin': N('bell', 88, 0, .09, .3); N('bell', 95, .07, .18, .3); break;
      case 'star': N('xylo', 91, 0, .2, .4); N('xylo', 96, .09, .3, .4); break;
      case 'unlock': N('piano', 72, 0, .15, .5); N('piano', 76, .12, .15, .5); N('piano', 79, .24, .15, .5); N('piano', 84, .36, .5, .6); break;
      case 'levelup': [72, 76, 79, 84, 79, 84].forEach((m, i) => N('piano', m, i * .11, .2, .5)); break;
      case 'complete': [72, 74, 76, 77, 79, 81, 83, 84].forEach((m, i) => N('bell', m, i * .08, .35, .35)); break;
      case 'whoosh': this.noise({ dur: .35, vol: .25, f0: 300, f1: 3000, type: 'bandpass', q: 2 }); break;
      case 'doorOpen': this.tone({ f0: 90, f1: 160, dur: .4, type: 'sawtooth', vol: .12 }); this.noise({ dur: .3, vol: .1, f0: 500, f1: 1500 }); break;
      case 'doorClose': this.tone({ f0: 120, f1: 50, dur: .16, type: 'sine', vol: .4 }); this.noise({ dur: .1, vol: .25, f0: 300, f1: 80 }); break;
      case 'step': this.noise({ dur: .06, vol: .08, f0: 700, f1: 300 }); break;
      case 'pop': this.tone({ f0: 400, f1: 900, dur: .07, type: 'sine', vol: .3 }); this.noise({ dur: .03, vol: .2, type: 'highpass', f0: 2500 }); break;
      case 'bubble': this.tone({ f0: 250 + Math.random() * 250, f1: 900, dur: .12, type: 'sine', vol: .16 }); break;
      case 'splash': this.noise({ dur: .4, vol: .4, f0: 2500, f1: 400 }); this.tone({ f0: 300, f1: 80, dur: .25, type: 'sine', vol: .2 }); break;
      case 'pour': this.noise({ dur: .8, vol: .25, f0: 800, f1: 1600, type: 'bandpass', q: 3 }); break;
      case 'munch': for (let i = 0; i < 3; i++) this.noise({ at: i * .14, dur: .08, vol: .3, f0: 900 + i * 200, f1: 250 }); break;
      case 'drink': for (let i = 0; i < 4; i++) this.tone({ f0: 300 + i * 60, f1: 200, at: i * .16, dur: .12, type: 'sine', vol: .18 }); break;
      case 'giggle': { const base = 620 + Math.random() * 160; [0, .11, .22, .33].forEach((at, i) => this.tone({ f0: base + i * 40, f1: base - 60, at, dur: .1, type: 'sine', vol: .3 })); break; }
      case 'laugh': for (let i = 0; i < 5; i++) this.tone({ f0: 500 + (i % 2) * 120, f1: 380, at: i * .13, dur: .12, type: 'sawtooth', vol: .16 }); break;
      case 'cry': { const b = 480 + Math.random() * 120; this.tone({ f0: b, f1: b * 1.3, dur: .35, type: 'sawtooth', vol: .2 }); this.tone({ f0: b * 1.25, f1: b * .7, at: .38, dur: .5, type: 'sawtooth', vol: .22 }); break; }
      case 'yawn': this.tone({ f0: 330, f1: 170, dur: .8, type: 'sine', vol: .25, attack: .15 }); break;
      case 'snore': this.noise({ dur: .9, vol: .18, f0: 200, f1: 90, attack: .3 }); break;
      case 'babble': { const n = 3 + ((Math.random() * 3) | 0); for (let i = 0; i < n; i++) this.tone({ f0: 350 + Math.random() * 350, f1: 250 + Math.random() * 300, at: i * .15, dur: .12, type: 'sine', vol: .25 }); break; }
      case 'sneeze': this.noise({ dur: .12, vol: .3, f0: 1200, f1: 500 }); this.tone({ f0: 700, f1: 250, at: .1, dur: .2, type: 'sawtooth', vol: .2 }); break;
      case 'clap': this.noise({ dur: .09, vol: .4, type: 'highpass', f0: 1200 }); this.noise({ at: .02, dur: .07, vol: .3, type: 'bandpass', f0: 2500, q: 2 }); break;
      case 'chime': N('bell', 88, 0, .6, .35); break;
      case 'magic': for (let i = 0; i < 6; i++) N('xylo', 80 + i * 3, i * .05, .25, .25); break;
      case 'camera': this.tone({ f0: 800, dur: .03, type: 'square', vol: .2 }); this.noise({ at: .05, dur: .08, vol: .3, type: 'highpass', f0: 3000 }); break;
      case 'heart': this.tone({ f0: 65, f1: 40, dur: .12, type: 'sine', vol: .5 }); this.tone({ f0: 60, f1: 38, at: .22, dur: .14, type: 'sine', vol: .4 }); break;
      case 'beep': this.tone({ f0: 1200, dur: .08, type: 'square', vol: .15 }); break;
      case 'bandage': this.noise({ dur: .25, vol: .3, type: 'bandpass', f0: 1500, f1: 3500, q: 4 }); break;
      case 'shutter': this.sfx('camera'); break;
      case 'balloon': this.noise({ dur: .6, vol: .15, type: 'bandpass', f0: 500, f1: 1200, q: 3 }); break;
      case 'blow': this.noise({ dur: .35, vol: .3, f0: 900, f1: 300, type: 'bandpass', q: 1.5 }); break;
      case 'candle': this.noise({ dur: .15, vol: .2, f0: 1800, f1: 600 }); break;
      case 'gift': for (let i = 0; i < 4; i++) this.noise({ at: i * .07, dur: .09, vol: .2, type: 'highpass', f0: 2000 }); break;
      case 'spray': this.noise({ dur: .22, vol: .3, type: 'highpass', f0: 4000, f1: 2000 }); break;
      case 'brush': for (let i = 0; i < 3; i++) this.noise({ at: i * .1, dur: .07, vol: .12, type: 'bandpass', f0: 900, q: 2 }); break;
      case 'comb': for (let i = 0; i < 5; i++) this.noise({ at: i * .06, dur: .04, vol: .1, type: 'bandpass', f0: 1400, q: 3 }); break;
      case 'shaver': this.tone({ f0: 110, dur: .5, type: 'sawtooth', vol: .1 }); break;
      case 'switch': this.tone({ f0: 900, f1: 500, dur: .05, type: 'square', vol: .2 }); break;
      case 'belltoy': N('bell', 90, 0, .5, .3); break;
      case 'bird': { const b = 2200 + Math.random() * 800; this.tone({ f0: b, f1: b * 1.5, dur: .09, type: 'sine', vol: .12 }); this.tone({ f0: b * 1.4, f1: b * .9, at: .12, dur: .1, type: 'sine', vol: .1 }); break; }
      case 'cat': this.tone({ f0: 440, f1: 620, dur: .18, type: 'sawtooth', vol: .14 }); this.tone({ f0: 620, f1: 380, at: .18, dur: .3, type: 'sawtooth', vol: .14 }); break;
      case 'dog': this.tone({ f0: 170, f1: 90, dur: .13, type: 'sawtooth', vol: .35 }); this.tone({ f0: 160, f1: 80, at: .17, dur: .16, type: 'sawtooth', vol: .3 }); break;
      case 'rabbit': this.tone({ f0: 900, f1: 1300, dur: .09, type: 'sine', vol: .15 }); break;
      case 'hamster': for (let i = 0; i < 2; i++) this.tone({ f0: 1100 + i * 200, f1: 1500, at: i * .12, dur: .07, type: 'sine', vol: .13 }); break;
      case 'fishpop': this.tone({ f0: 300, f1: 800, dur: .08, type: 'sine', vol: .15 }); break;
      case 'swing': this.tone({ f0: 95, f1: 70, dur: .18, type: 'sawtooth', vol: .09 }); break;
      case 'slide': this.tone({ f0: 500, f1: 900, dur: .5, type: 'sine', vol: .12 }); break;
      case 'boing': this.tone({ f0: 150, f1: 400, dur: .2, type: 'sine', vol: .3 }); this.tone({ f0: 400, f1: 150, at: .2, dur: .25, type: 'sine', vol: .22 }); break;
      case 'goal': N('piano', 76, 0, .12, .5); N('piano', 83, .1, .12, .5); N('bell', 88, .2, .4, .5); break;
      case 'washer': this.noise({ dur: .5, vol: .2, f0: 300, f1: 500 }); this.tone({ f0: 800, at: .5, dur: .1, type: 'square', vol: .12 }); break;
      case 'washerDone': [80, 84, 87, 92].forEach((m, i) => N('bell', m, i * .14, .35, .4)); break;
      case 'detergent': this.noise({ dur: .5, vol: .18, f0: 600, f1: 1400, type: 'bandpass', q: 2 }); break;
      case 'iron': this.noise({ dur: .4, vol: .12, f0: 500, f1: 200 }); break;
      case 'fireworks': this.noise({ dur: .6, vol: .3, f0: 3000, f1: 200 }); for (let i = 0; i < 8; i++) N('xylo', 84 + ((Math.random() * 12) | 0), .1 + i * .05, .2, .2); break;
      case 'wrong': this.tone({ f0: 300, f1: 200, dur: .2, type: 'square', vol: .15 }); break;
      case 'match': N('xylo', 84, 0, .15, .35); N('xylo', 91, .1, .2, .35); break;
      case 'flip': this.noise({ dur: .12, vol: .18, type: 'bandpass', f0: 900, f1: 2000, q: 2 }); break;
      case 'puzzle': this.tone({ f0: 500, f1: 700, dur: .07, type: 'square', vol: .15 }); break;
      case 'drop': this.tone({ f0: 300, f1: 150, dur: .1, type: 'sine', vol: .25 }); break;
      case 'car': this.tone({ f0: 180, f1: 320, dur: .5, type: 'sawtooth', vol: .08 }); break;
      case 'train': this.tone({ f0: 330, f1: 330, dur: .35, type: 'square', vol: .12 }); this.tone({ f0: 415, at: .38, dur: .45, type: 'square', vol: .12 }); break;
      case 'mirror': N('bell', 96, 0, .4, .2); break;
      case 'heatwave': this.tone({ f0: 400, f1: 800, dur: .3, type: 'sine', vol: .1 }); break;
      default: this.sfx('click');
    }
  }

  /* ---------------- loops ---------------- */
  startLoop(name) {
    if (!this.ctx || this.loops.has(name) || this.muted) return;
    const c = this.ctx;
    const g = c.createGain();
    g.connect(this.sfxGain);
    const nodes = [];
    const addNoise = (type, f, vol, lfoRate = 0) => {
      const src = c.createBufferSource();
      src.buffer = this._noiseBuf; src.loop = true;
      const fl = c.createBiquadFilter();
      fl.type = type; fl.frequency.value = f;
      const gg = c.createGain(); gg.gain.value = vol;
      src.connect(fl); fl.connect(gg); gg.connect(g);
      if (lfoRate) {
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = lfoRate; lg.gain.value = vol * .6;
        lfo.connect(lg); lg.connect(gg.gain);
        lfo.start(); nodes.push(lfo);
      }
      src.start(); nodes.push(src, fl, gg);
    };
    switch (name) {
      case 'water': addNoise('lowpass', 900, .14, .8); break;
      case 'shower': addNoise('highpass', 1500, .16, 2.5); break;
      case 'washer': addNoise('lowpass', 250, .2, 1.4); break;
      case 'dryer': addNoise('lowpass', 400, .12, 3); break;
      case 'snore': {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 75;
        const og = c.createGain(); og.gain.value = 0;
        const lfo = c.createOscillator(); lfo.frequency.value = .45;
        const lg = c.createGain(); lg.gain.value = .06;
        lfo.connect(lg); lg.connect(og.gain);
        o.connect(og); og.connect(g);
        o.start(); lfo.start(); nodes.push(o, lfo);
        break;
      }
      case 'birds': {
        const tick = setInterval(() => { if (Math.random() < .5) this.sfx('bird'); }, 2600);
        this.loops.set(name, { nodes: [{ stop: () => clearInterval(tick) }], gain: g });
        return;
      }
      case 'fire': addNoise('lowpass', 600, .1, 3); break;
    }
    g.gain.value = 1;
    this.loops.set(name, { nodes, gain: g });
  }
  stopLoop(name) {
    const l = this.loops.get(name);
    if (!l) return;
    try { l.gain.gain.setTargetAtTime(0, this.t, .1); } catch (e) { /* noop */ }
    setTimeout(() => { for (const n of l.nodes) { try { n.stop?.(); } catch (e) { /* already stopped */ } try { n.disconnect?.(); } catch (e) { /* noop */ } } }, 400);
    this.loops.delete(name);
  }
  stopAllLoops() { for (const name of [...this.loops.keys()]) this.stopLoop(name); }

  /* ---------------- music sequencer ---------------- */
  // pattern: { bpm, root, loop, notes: [[beat, midi, lenBeats, instr, vol], ...], bass: [[beat, midi, lenBeats]] }
  playMusic(key) {
    if (!this.ctx) { this._pendingMusic = key; return; }
    if (this.music?.key === key) return;
    this.stopMusic();
    const def = MUSIC[key];
    if (!def) return;
    this.music = { key, def, idx: 0, start: this.t + .1, timer: setInterval(() => this._schedule(), 90) };
    this._schedule();
  }
  stopMusic() {
    if (this.music) { clearInterval(this.music.timer); this.music = null; }
    this._pendingMusic = null;
  }
  _schedule() {
    const m = this.music; if (!m) return;
    const spb = 60 / m.def.bpm;
    const totalBeats = m.def.len;
    const ahead = this.t + .3;
    for (let guard = 0; guard < 64; guard++) {
      const [beat, midi, len = 1, instr, vol] = m.def.notes[m.idx];
      const iter = Math.floor(m.idx / m.def.notes.length);
      const t0 = m.start + (iter * totalBeats + beat) * spb;
      if (t0 > ahead) break;
      if (t0 > this.t - .1 && !this.muted) {
        const at = Math.max(0, t0 - this.t);
        this.note(instr || 'piano', midi + (m.def.shift || 0), at, len * spb * .95, (vol ?? .4) * .8, this.musicGain);
      }
      m.idx++;
      if (m.idx >= m.def.notes.length) m.idx = 0;
    }
  }
}

/* ---------------- music library (all original tunes) ---------------- */
const P = 60; // middle C in MIDI
function seq(notes) { return notes; }
const MUSIC = {
  menu: {
    bpm: 108, len: 8,
    notes: seq([
      [0, 72, .5], [.5, 76, .5], [1, 79, .5], [1.5, 84, .5],
      [2, 83, .5], [2.5, 79, .5], [3, 76, .5], [3.5, 74, .5],
      [4, 72, .5], [4.5, 76, .5], [5, 79, .5], [5.5, 84, .5],
      [6, 86, .5], [6.5, 84, .5], [7, 79, 1],
    ]),
  },
  sleep: {
    bpm: 66, len: 12,
    notes: seq([
      [0, 76, 1.5, 'music-box', .3], [1.5, 74, .5, 'music-box', .25], [2, 72, 2, 'music-box', .3],
      [4, 74, 1.5, 'music-box', .3], [5.5, 71, .5, 'music-box', .25], [6, 69, 2, 'music-box', .3],
      [8, 76, 1.5, 'music-box', .28], [9.5, 79, .5, 'music-box', .25], [10, 76, 2, 'music-box', .28],
      [8, 60, 4, 'flute', .12], [10, 64, 2, 'flute', .1],
    ]),
  },
  play: {
    bpm: 126, len: 8,
    notes: seq([
      [0, 72, .25, 'xylo', .3], [.25, 76, .25, 'xylo', .3], [.5, 79, .25, 'xylo', .3], [.75, 84, .5, 'xylo', .35],
      [1.5, 83, .25, 'xylo', .3], [1.75, 79, .25, 'xylo', .3], [2, 76, .5, 'xylo', .3],
      [3, 74, .25, 'xylo', .3], [3.25, 77, .25, 'xylo', .3], [3.5, 81, .5, 'xylo', .35],
      [4, 72, .25, 'xylo', .3], [4.25, 76, .25, 'xylo', .3], [4.5, 79, .25, 'xylo', .3], [4.75, 84, .5, 'xylo', .35],
      [5.5, 86, .25, 'xylo', .3], [5.75, 84, .25, 'xylo', .3], [6, 81, .5, 'xylo', .3], [6.5, 79, 1.5, 'xylo', .3],
    ]),
  },
  kitchen: {
    bpm: 116, len: 8,
    notes: seq([
      [0, 67, .5, 'piano', .3], [.5, 70, .5, 'piano', .3], [1, 72, .5, 'piano', .35], [1.5, 74, .5, 'piano', .3],
      [2, 75, .5, 'piano', .3], [2.5, 74, .5, 'piano', .3], [3, 70, .5, 'piano', .3], [3.5, 67, .5, 'piano', .3],
      [4, 65, .5, 'piano', .3], [4.5, 69, .5, 'piano', .3], [5, 72, .5, 'piano', .35], [5.5, 76, .5, 'piano', .3],
      [6, 74, .75, 'piano', .3], [6.75, 72, .25, 'piano', .25], [7, 67, 1, 'piano', .3],
    ]),
  },
  garden: {
    bpm: 100, len: 8,
    notes: seq([
      [0, 69, .75, 'flute', .3], [1, 72, .75, 'flute', .3], [2, 76, 1.5, 'flute', .35],
      [4, 74, .75, 'flute', .3], [5, 72, .75, 'flute', .3], [6, 69, 2, 'flute', .3],
      [0, 57, 2, 'piano', .14], [2, 62, 2, 'piano', .14], [4, 57, 2, 'piano', .14], [6, 64, 2, 'piano', .14],
    ]),
  },
  party: {
    // "Happy Birthday" traditional melody
    bpm: 120, len: 16,
    notes: seq([
      [0, 67, .33, 'piano', .45], [.5, 67, .17, 'piano', .4], [1, 69, .5, 'piano', .45], [2, 67, .5, 'piano', .45], [3, 72, .5, 'piano', .45], [4, 71, 1, 'piano', .5],
      [5, 67, .33, 'piano', .45], [5.5, 67, .17, 'piano', .4], [6, 69, .5, 'piano', .45], [7, 67, .5, 'piano', .45], [8, 74, .5, 'piano', .45], [9, 72, 1, 'piano', .5],
      [10, 67, .33, 'piano', .45], [10.5, 67, .17, 'piano', .4], [11, 79, .5, 'piano', .45], [12, 76, .5, 'piano', .45], [13, 72, .5, 'piano', .45], [14, 74, .5, 'piano', .45], [15, 69, .9, 'piano', .5],
    ]),
  },
  learning: {
    bpm: 92, len: 8,
    notes: seq([
      [0, 60, .5, 'bell', .3], [1, 62, .5, 'bell', .3], [2, 64, .5, 'bell', .3], [3, 65, .5, 'bell', .3],
      [4, 67, .5, 'bell', .35], [5, 69, .5, 'bell', .3], [6, 71, .5, 'bell', .3], [7, 72, 1, 'bell', .4],
    ]),
  },
  bath: {
    bpm: 84, len: 8,
    notes: seq([
      [0, 64, 1, 'music-box', .28], [1, 67, .5, 'music-box', .25], [1.5, 69, .5, 'music-box', .25],
      [2, 71, 2, 'music-box', .3], [4, 69, 1, 'music-box', .28], [5, 67, .5, 'music-box', .25], [5.5, 64, .5, 'music-box', .25],
      [6, 62, 2, 'music-box', .28],
    ]),
  },
};
export { MUSIC };
