const BEST_TIMES_KEY = "clr.bestTimes.v1", SETTINGS_KEY = "clr.settings.v1", ERROR_LOG_KEY = "clr.errors.v1", OWNED_KEYS = [BEST_TIMES_KEY, SETTINGS_KEY, ERROR_LOG_KEY, "coastline.graphics", "coastline.frameLimit", "coastline.player-settings.v1", "coastline.drive-mode"], DEFAULT_SETTINGS = Object.freeze({ carId: "crv", musicId: 1, easyMode: false, reducedMotion: null });
function available() {
  try {
    const probe = "__clr_probe__";
    return localStorage.setItem(probe, "1"), localStorage.removeItem(probe), true;
  } catch {
    return false;
  }
}
const HAS_STORAGE = available(), memory =  new Map();
function readJSON(key, fallback) {
  try {
    const raw = HAS_STORAGE ? localStorage.getItem(key) : memory.get(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || typeof parsed != "object" ? fallback : parsed;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  try {
    const raw = JSON.stringify(value);
    return HAS_STORAGE ? localStorage.setItem(key, raw) : memory.set(key, raw), true;
  } catch {
    return false;
  }
}
function loadSettings() {
  const raw = readJSON(SETTINGS_KEY, {});
  return { carId: typeof raw.carId == "string" ? raw.carId : DEFAULT_SETTINGS.carId, musicId: Number.isInteger(raw.musicId) && raw.musicId >= 0 ? raw.musicId : DEFAULT_SETTINGS.musicId, easyMode: typeof raw.easyMode == "boolean" ? raw.easyMode : DEFAULT_SETTINGS.easyMode, reducedMotion: typeof raw.reducedMotion == "boolean" ? raw.reducedMotion : DEFAULT_SETTINGS.reducedMotion };
}
function saveSettings(settings) {
  return writeJSON(SETTINGS_KEY, { carId: settings.carId, musicId: settings.musicId, easyMode: !!settings.easyMode, reducedMotion: settings.reducedMotion });
}
function bestKey(stageId, carId) {
  return `${stageId}:${carId}`;
}
function loadBestTimes() {
  const raw = readJSON(BEST_TIMES_KEY, {}), out = {};
  for (const k of Object.keys(raw)) {
    const v = raw[k];
    typeof v == "number" && Number.isFinite(v) && v > 0 && (out[k] = v);
  }
  return out;
}
function getBestTime(stageId, carId) {
  const v = loadBestTimes()[bestKey(stageId, carId)];
  return typeof v == "number" ? v : null;
}
function recordBestTime(stageId, carId, seconds) {
  const all = loadBestTimes(), key = bestKey(stageId, carId), prev = all[key], isNew = typeof prev != "number" || seconds < prev;
  return isNew && (all[key] = seconds, writeJSON(BEST_TIMES_KEY, all)), { best: isNew ? seconds : prev, isNew };
}
function clearAll() {
  for (const k of OWNED_KEYS) removeKey(k);
}
function removeKey(key) {
  try {
    HAS_STORAGE ? localStorage.removeItem(key) : memory.delete(key);
  } catch {
  }
}
export {
  BEST_TIMES_KEY,
  ERROR_LOG_KEY,
  OWNED_KEYS,
  SETTINGS_KEY,
  bestKey,
  clearAll,
  getBestTime,
  loadBestTimes,
  loadSettings,
  readJSON,
  recordBestTime,
  removeKey,
  saveSettings,
  writeJSON
};
