import { context } from "./engine.js";
let offline = null;
function decoderContext() {
  const Ctor = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (Ctor && !offline) {
    try { offline = new Ctor(2, 1, 44100); } catch {}
  }
  return offline || context();
}
async function decodeFile(base) {
  const decoder = decoderContext();
  if (!decoder) throw new Error("Audio is unavailable. Tap to enable sound.");
  const formats = document.createElement("audio").canPlayType('audio/ogg; codecs="vorbis"') ? ["ogg", "mp3"] : ["mp3", "ogg"];
  for (const extension of formats) {
    try {
      const response = await fetch(`${base}.${extension}`);
      if (response.ok) return await decoder.decodeAudioData(await response.arrayBuffer());
    } catch {}
  }
  throw new Error("Audio could not be decoded.");
}
export { decoderContext, decodeFile };
