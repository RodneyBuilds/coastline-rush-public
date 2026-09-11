import { decodeFile, decoderContext } from "./decode.js";
import { context, announcerBus, duck } from "./engine.js";
import { getPreferences } from "../core/playerPreferences.js";
import script from "./announcerScript.json";
import { createCheerPicker } from "./cheerSelection.js";
const buffers =  new Map();
let lastCheerAt = -1 / 0, priorityUntil = 0, activeSource = null;
const chooseCheer = createCheerPicker(), captionListeners =  new Set(), ANNOUNCEMENT_TEXT = Object.freeze(script);
function onAnnouncement(listener) {
  return captionListeners.add(listener), () => captionListeners.delete(listener);
}
let preparation = null;
function prepareAnnouncements() {
  if (!decoderContext()) return Promise.resolve();
  if (!preparation) preparation = Promise.allSettled(Object.keys(script).filter(name => !buffers.has(name)).map(async name => {
    buffers.set(name, await decodeFile(`assets/audio/voice-${name}`));
  })).finally(() => { preparation = null; });
  return preparation;
}
function announce(name, tier = 1) {
  const now = performance.now() / 1e3, cheer = name.startsWith("cheer");
  if (cheer && (now - lastCheerAt < 7 || now < priorityUntil) || (name === "cheer" && (name = chooseCheer(tier)), !ANNOUNCEMENT_TEXT[name])) return false;
  const ctx = context(), buffer = buffers.get(name);
  cheer ? lastCheerAt = now : priorityUntil = now + (buffer?.duration || (["three", "two", "one"].includes(name) ? 0.65 : 1.7));
  for (const listener of captionListeners) listener({ text: ANNOUNCEMENT_TEXT[name], seconds: Math.max(2, buffer?.duration || 0) });
  if (activeSource) {
    try {
      activeSource.stop();
    } catch {
    }
    activeSource.disconnect();
  }
  if (activeSource = null, !ctx || !buffer) return true;
  const source = ctx.createBufferSource();
  return activeSource = source, source.buffer = buffer, source.connect(announcerBus()), source.start(), source.onended = () => {
    source.disconnect(), activeSource === source && (activeSource = null);
  }, !getPreferences().muted && getPreferences().announcer > 0 && duck(0.35, buffer.duration), true;
}
export {
  ANNOUNCEMENT_TEXT,
  announce,
  onAnnouncement,
  prepareAnnouncements
};
