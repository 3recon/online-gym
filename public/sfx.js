/* 온라인 헬스장 — 효과음 (WebAudio 합성, 파일 없음) */
window.GymSfx = (function () {
  'use strict';
  let ctx = null;
  let out = null;
  let on = false;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.6;
      out.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, opt) {
    opt = opt || {};
    const c = ac();
    if (!c) return;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
    if (opt.vib) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = opt.vib;
      depth.gain.value = freq * 0.035;
      lfo.connect(depth);
      depth.connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
    }
    const v = opt.vol == null ? 0.2 : opt.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function noise(start, dur, opt) {
    opt = opt || {};
    const c = ac();
    if (!c) return;
    const t = c.currentTime + start;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const ch = buf.getChannelData(0);
    const decay = opt.decay == null ? 3 : opt.decay;
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = opt.filter || 'lowpass';
    f.frequency.value = opt.freq || 1200;
    const g = c.createGain();
    g.gain.value = opt.vol == null ? 0.3 : opt.vol;
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t);
  }

  const api = {
    get enabled() { return on; },
    setEnabled(v) {
      on = !!v;
      if (on) ac();
    },
    tick() {
      if (on) tone(1250, 0, 0.03, { type: 'square', vol: 0.018 });
    },
    hit(perfect) {
      if (!on) return;
      tone(perfect ? 880 : 660, 0, 0.09, { type: 'triangle', vol: 0.12 });
      if (perfect) tone(1320, 0.05, 0.1, { type: 'triangle', vol: 0.08 });
    },
    miss() {
      if (on) tone(160, 0, 0.15, { type: 'sawtooth', vol: 0.05, to: 90 });
    },
    clank() {
      if (!on) return;
      noise(0, 0.2, { filter: 'bandpass', freq: 2600, vol: 0.55 });
      tone(610, 0, 0.4, { type: 'triangle', vol: 0.07 });
      tone(1470, 0, 0.28, { type: 'triangle', vol: 0.04 });
    },
    success() {
      if (!on) return;
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.085, 0.22, { type: 'square', vol: 0.05 }));
      api.clank();
    },
    pr() {
      if (!on) return;
      const seq = [[523, 0, 0.14], [523, 0.15, 0.14], [523, 0.3, 0.14], [698, 0.45, 0.5], [784, 0.95, 0.16], [1047, 1.12, 0.7]];
      seq.forEach(([f, s, d]) => {
        tone(f, s, d, { type: 'square', vol: 0.05 });
        tone(f / 2, s, d, { type: 'triangle', vol: 0.06 });
      });
      api.clank();
    },
    fail() {
      if (!on) return;
      noise(0, 0.5, { freq: 160, vol: 0.9, decay: 2 });
      [392, 370, 349].forEach((f, i) => tone(f, 0.3 + i * 0.33, 0.3, { type: 'sawtooth', vol: 0.06 }));
      tone(330, 1.29, 1.0, { type: 'sawtooth', vol: 0.06, vib: 6 });
    },
    gulp() {
      if (!on) return;
      [0, 0.17, 0.34].forEach((s) => tone(240, s, 0.12, { to: 90, vol: 0.16 }));
      tone(660, 0.6, 0.12, { type: 'square', vol: 0.04 });
      tone(990, 0.7, 0.18, { type: 'square', vol: 0.04 });
    },
    shout() {
      if (!on) return;
      tone(880, 0, 0.08, { type: 'square', vol: 0.035 });
      tone(1320, 0.08, 0.11, { type: 'square', vol: 0.035 });
    },
  };
  return api;
})();
