import { tyreSlip } from "../render/tyreSmoke.js";
import { getPreferences, onPreferencesChange } from "../core/playerPreferences.js";
let ctx = null, musicGain = null, sfxGain = null, engineNodes = null, screechNodes = null, masterGain = null, engineGain = null, announcerGain = null, musicLevel = null;
function applyLevels(immediate = false) {
  if (!ctx) return;
  const p = getPreferences();
  for (const [node, value] of [[masterGain, p.muted ? 0 : 1], [musicLevel, p.music], [sfxGain, 0.9 * p.effects], [engineGain, 0.9 * p.engine], [announcerGain, 0.9 * p.announcer]]) node.gain.cancelScheduledValues(ctx.currentTime), immediate ? node.gain.value = value : node.gain.setTargetAtTime(value, ctx.currentTime, 0.025);
}
onPreferencesChange(() => applyLevels());
function unlock() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
    masterGain = ctx.createGain(), masterGain.connect(ctx.destination), musicLevel = ctx.createGain(), musicLevel.connect(masterGain), engineGain = ctx.createGain(), engineGain.connect(masterGain), announcerGain = ctx.createGain(), announcerGain.connect(masterGain), musicGain = ctx.createGain(), musicGain.gain.value = 0.55, musicGain.connect(musicLevel), sfxGain = ctx.createGain(), sfxGain.gain.value = 0.9, sfxGain.connect(masterGain), applyLevels(true);
  }
  return ctx.state === "suspended" && ctx.resume(), ctx;
}
function context() {
  return ctx;
}
function musicBus() {
  return musicGain;
}
function sfxBus() {
  return sfxGain;
}
function announcerBus() {
  return announcerGain;
}
function engineBus() {
  return engineGain;
}
function suspend() {
  ctx && ctx.state === "running" && ctx.suspend();
}
function resume() {
  ctx && ctx.state === "suspended" && ctx.resume();
}
function duck(amount = 0.35, secs = 0.5) {
  if (!ctx || !musicGain) return;
  const now = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(now), musicGain.gain.setValueAtTime(musicGain.gain.value, now), musicGain.gain.linearRampToValueAtTime(0.55 * (1 - amount), now + 0.03), musicGain.gain.setTargetAtTime(0.55, now + 0.08, secs / 3);
}
function startEngine() {
  if (!ctx || engineNodes) return;
  const o1 = ctx.createOscillator();
  o1.type = "sawtooth";
  const o2 = ctx.createOscillator();
  o2.type = "triangle";
  const f = ctx.createBiquadFilter();
  f.type = "lowpass", f.frequency.value = 500, f.Q.value = 0.65;
  const g = ctx.createGain();
  g.gain.value = 0, o1.connect(f), o2.connect(f), f.connect(g), g.connect(engineGain), o1.start(), o2.start(), engineNodes = { o1, o2, f, g };
  const nb = ctx.createBuffer(1, 44100, 44100), d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = nb, s.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass", bp.frequency.value = 1400, bp.Q.value = 2.8;
  const sg = ctx.createGain();
  sg.gain.value = 0, s.connect(bp), bp.connect(sg), sg.connect(sfxGain), s.start();
  const tone = ctx.createOscillator();
  tone.type = "triangle", tone.frequency.value = 780;
  const harmonic = ctx.createOscillator();
  harmonic.type = "sine", harmonic.frequency.value = 1170;
  const tg = ctx.createGain();
  tg.gain.value = 0, tone.connect(tg), harmonic.connect(tg), tg.connect(sfxGain);
  const flutter = ctx.createOscillator();
  flutter.frequency.value = 17;
  const depth = ctx.createGain();
  depth.gain.value = 24, flutter.connect(depth), depth.connect(tone.frequency), tone.start(), harmonic.start(), flutter.start(), screechNodes = { sg, bp, tone, harmonic, tg };
}
function engineFrame(speedNorm, throttle, drifting, dt, brake = 0, brakeHeld = 0) {
  if (!engineNodes) return;
  const base = 48 + speedNorm * 160;
  engineNodes.o1.frequency.setTargetAtTime(base, ctx.currentTime, 0.09), engineNodes.o2.frequency.setTargetAtTime(base / 2, ctx.currentTime, 0.12), engineNodes.f.frequency.setTargetAtTime(260 + speedNorm * 1100 + throttle * 350, ctx.currentTime, 0.1);
  const target = 0.025 + speedNorm * 0.055 + throttle * 0.025;
  engineNodes.g.gain.value += (target - engineNodes.g.gain.value) * Math.min(1, dt * 10);
  const slip = tyreSlip(speedNorm * 55, drifting, brake, brakeHeld), st = slip * 0.1;
  screechNodes.sg.gain.value += (st - screechNodes.sg.gain.value) * Math.min(1, dt * 14), screechNodes.bp.frequency.value = 1100 + speedNorm * 850;
  const now = ctx.currentTime;
  screechNodes.tone.frequency.setTargetAtTime(640 + speedNorm * 520, now, 0.045), screechNodes.harmonic.frequency.setTargetAtTime(970 + speedNorm * 640, now, 0.07), screechNodes.tg.gain.setTargetAtTime(slip * 0.052, now, slip > 0 ? 0.035 : 0.12);
}
function stopEngineSound() {
  engineNodes && (engineNodes.g.gain.value = 0), screechNodes && (screechNodes.sg.gain.value = 0), screechNodes && (screechNodes.tg.gain.cancelScheduledValues(ctx.currentTime), screechNodes.tg.gain.value = 0);
}
function state() {
  return { created: !!ctx, state: ctx ? ctx.state : "none", sampleRate: ctx ? ctx.sampleRate : null };
}
export {
  announcerBus,
  context,
  duck,
  engineBus,
  engineFrame,
  musicBus,
  resume,
  sfxBus,
  startEngine,
  state,
  stopEngineSound,
  suspend,
  unlock
};
