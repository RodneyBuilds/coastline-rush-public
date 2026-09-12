import { context, sfxBus, duck } from "./engine.js";
function blip(freq, t0, dur, vol, type = "square") {
  const ctx = context();
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = type, o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0), g.gain.linearRampToValueAtTime(vol, t0 + 8e-3), g.gain.exponentialRampToValueAtTime(1e-3, t0 + dur), o.connect(g), g.connect(sfxBus()), o.start(t0), o.stop(t0 + dur + 0.02);
}
function checkpoint() {
  const ctx = context();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => blip(f, t0 + i * 0.07, 0.18, 0.25)), duck(0.3, 0.5);
}
function fork() {
  const ctx = context();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  [392, 523].forEach((f, i) => blip(f, t0 + i * 0.09, 0.15, 0.2, "triangle"));
}
function collision() {
  const ctx = context();
  if (!ctx) return;
  const t0 = ctx.currentTime, o = ctx.createOscillator();
  o.type = "triangle", o.frequency.setValueAtTime(160, t0), o.frequency.exponentialRampToValueAtTime(60, t0 + 0.15);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.5, t0), g.gain.exponentialRampToValueAtTime(1e-3, t0 + 0.2), o.connect(g), g.connect(sfxBus()), o.start(t0), o.stop(t0 + 0.22), blip(90, t0, 0.1, 0.3, "sawtooth"), duck(0.4, 0.4);
}
function boost() {
  const ctx = context();
  if (!ctx) return;
  const t0 = ctx.currentTime, o = ctx.createOscillator();
  o.type = "sawtooth", o.frequency.setValueAtTime(220, t0), o.frequency.exponentialRampToValueAtTime(880, t0 + 0.25);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.18, t0), g.gain.exponentialRampToValueAtTime(1e-3, t0 + 0.3), o.connect(g), g.connect(sfxBus()), o.start(t0), o.stop(t0 + 0.32);
}
function driftStart() {
  const ctx = context();
  if (!ctx) return;
  const t0 = ctx.currentTime, o = ctx.createOscillator();
  o.type = "sawtooth", o.frequency.setValueAtTime(900, t0), o.frequency.exponentialRampToValueAtTime(420, t0 + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.14, t0), g.gain.exponentialRampToValueAtTime(1e-3, t0 + 0.22), o.connect(g), g.connect(sfxBus()), o.start(t0), o.stop(t0 + 0.24);
}
function driftChain() {
  const ctx = context();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  [660, 880, 1175].forEach((f, i) => blip(f, t0 + i * 0.05, 0.12, 0.2, "triangle"));
}
function select() {
  const ctx = context();
  ctx && blip(660, ctx.currentTime, 0.09, 0.2);
}
function confirm() {
  const ctx = context();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  [523, 784].forEach((f, i) => blip(f, t0 + i * 0.06, 0.12, 0.22));
}
export {
  boost,
  checkpoint,
  collision,
  confirm,
  driftChain,
  driftStart,
  fork,
  select
};
