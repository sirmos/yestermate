// A small lo-fi band made with the Web Audio API. No audio files.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let echo: GainNode | null = null;
let noise: AudioBuffer | null = null;
let timer: number | undefined;
let nextTime = 0;
let step = 0;
let vol = 0.7;

const BPM = 92;
const SIXTEENTH = 60 / BPM / 4;
const SWING = 0.035;
const CHORDS = [
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [48, 52, 55, 59],
  [55, 59, 62, 66],
];
const ROOTS = [33, 29, 36, 31];
const SCALE = [69, 72, 74, 76, 79, 81, 84];
const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function setup() {
  if (ctx) return;
  ctx = new AudioContext();
  const comp = ctx.createDynamicsCompressor();
  master = ctx.createGain();
  master.gain.value = 0.9 * vol;
  master.connect(comp);
  comp.connect(ctx.destination);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = (60 / BPM) * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  echo = ctx.createGain();
  echo.gain.value = 0.45;
  echo.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

function env(g: GainNode, t: number, peak: number, dur: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function kick(t: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  env(g, t, 1, 0.28);
  o.connect(g);
  g.connect(master!);
  o.start(t);
  o.stop(t + 0.3);
}

function hit(t: number, type: BiquadFilterType, freq: number, dur: number, peak: number) {
  const c = ctx!;
  const s = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  s.buffer = noise;
  f.type = type;
  f.frequency.value = freq;
  env(g, t, peak, dur);
  s.connect(f);
  f.connect(g);
  g.connect(master!);
  s.start(t);
  s.stop(t + dur + 0.02);
}

function note(t: number, n: number, dur: number, peak: number, type: OscillatorType, cutoff: number, send = 0) {
  const c = ctx!;
  const o = c.createOscillator();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = hz(n);
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  env(g, t, peak, dur);
  o.connect(f);
  f.connect(g);
  g.connect(master!);
  if (send > 0) {
    const s = c.createGain();
    s.gain.value = send;
    g.connect(s);
    s.connect(echo!);
  }
  o.start(t);
  o.stop(t + dur + 0.05);
}

function play(i: number, t0: number) {
  const bar = Math.floor(i / 16) % 4;
  const s = i % 16;
  const t = t0 + (s % 2 === 1 ? SWING : 0);
  if (s === 0 || s === 7 || s === 10) kick(t);
  if (s === 4 || s === 12) hit(t, 'bandpass', 1900, 0.14, 0.5);
  if (s % 2 === 0) hit(t, 'highpass', 7500, s % 4 === 2 ? 0.07 : 0.035, s % 4 === 2 ? 0.22 : 0.12);
  if (s === 0 || s === 3 || s === 8 || s === 11) note(t, ROOTS[bar]! + 12 + (s === 11 ? 7 : 0), 0.28, 0.5, 'sawtooth', 500);
  if (s === 0 || s === 7 || s === 10) {
    const dur = s === 0 ? 0.9 : 0.3;
    for (const n of CHORDS[bar]!) note(t, n, dur, 0.09, 'triangle', 1800, 0.1);
  }
  if (s % 3 === 2 && ((i * 2654435761) >>> 0) % 100 < 55) {
    note(t, SCALE[(i * 7 + bar) % SCALE.length]!, 0.25, 0.16, 'sine', 3000, 0.5);
  }
}

function tick() {
  const c = ctx!;
  while (nextTime < c.currentTime + 0.15) {
    play(step, nextTime);
    nextTime += SIXTEENTH;
    step++;
  }
}

export function setMusic(on: boolean) {
  if (!on) {
    window.clearInterval(timer);
    timer = undefined;
    return;
  }
  if (timer !== undefined) return;
  setup();
  void ctx!.resume();
  nextTime = ctx!.currentTime + 0.1;
  timer = window.setInterval(tick, 30);
}

export function setMusicVol(v: number) {
  vol = v;
  if (master) master.gain.value = 0.9 * v;
}