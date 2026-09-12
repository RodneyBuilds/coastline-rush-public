import { decodeFile } from "./decode.js";
import { unlock, context, musicBus } from "./engine.js";
const TRACKS = [{ id: 0, title: "PURE RACEWAY", style: "Synth racing \xB7 MintoDog" }, { id: 1, title: "BLACK DIAMOND", style: "Drum & bass \xB7 Joth" }, { id: 2, title: "HOT ROADWAY", style: "Techno \xB7 MintoDog" }], buffers =  new Map(), pending =  new Map(), failures =  new Set();
let source = null, channel = null, currentTrack = -1, request = 0, spectrum = null;
function readSpectrum(data) {
  spectrum ? spectrum.getByteFrequencyData(data) : data.fill(0);
}
async function prepare(id) {
  if (buffers.has(id)) return buffers.get(id);
  if (!pending.has(id)) {
    const task = (async () => {
      const buffer = await decodeFile("assets/audio/score-" + id);
      return buffers.set(id, buffer), failures.delete(id), buffer;
    })().catch((error) => {
      throw failures.add(id), error;
    }).finally(() => pending.delete(id));
    pending.set(id, task);
  }
  return pending.get(id);
}
async function prewarm() {
  await Promise.allSettled(TRACKS.map((t) => prepare(t.id)));
}
async function playTrack(id) {
  if (!TRACKS[id]) return false;
  const token = ++request;
  unlock();
  const ctx = context();
  if (!ctx) return false;
  if (currentTrack === id && source) return true;
  let buffer;
  try {
    buffer = await prepare(id);
  } catch {
    return false;
  }
  if (token !== request) return false;
  const now = ctx.currentTime;
  if (source) {
    const old = source, oldChannel = channel;
    oldChannel.gain.cancelScheduledValues(now), oldChannel.gain.setTargetAtTime(0, now, 0.08), old.onended = () => {
      old.disconnect(), oldChannel.disconnect();
    };
    try {
      old.stop(now + 0.4);
    } catch {
    }
  }
  return source = ctx.createBufferSource(), source.buffer = buffer, source.loop = true, channel = ctx.createGain(), channel.gain.setValueAtTime(0, now), channel.gain.linearRampToValueAtTime(1, now + 0.25), spectrum || (spectrum = ctx.createAnalyser(), spectrum.fftSize = 128, spectrum.smoothingTimeConstant = 0.8, spectrum.connect(musicBus())), source.connect(channel), channel.connect(spectrum), source.start(), currentTrack = id, true;
}
const playing = () => currentTrack, lateSynthesisCount = () => 0;
function resetSynthesisCounter() {
}
const readyCount = () => buffers.size;
function diagnostics() {
  return TRACKS.map((t) => ({ id: t.id, title: t.title, seconds: buffers.get(t.id)?.duration || 0, ready: buffers.has(t.id), failed: failures.has(t.id) }));
}
export {
  TRACKS,
  diagnostics,
  lateSynthesisCount,
  playTrack,
  playing,
  prewarm,
  readSpectrum,
  readyCount,
  resetSynthesisCounter
};
