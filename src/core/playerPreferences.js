const PREFERENCES_KEY = "coastline.player-settings.v1", DEFAULT_PREFERENCES = Object.freeze({ music: 1, engine: 1, effects: 1, announcer: 1, muted: false, captions: true, sensitivity: 1, deadzone: 0.1 }), limits = { music: [0, 1], engine: [0, 1], effects: [0, 1], announcer: [0, 1], sensitivity: [0.5, 1.5], deadzone: [0.05, 0.3] };
function normalizePreferences(value) {
  const result = { ...DEFAULT_PREFERENCES };
  if (!value || typeof value != "object") return result;
  for (const [key, [min, max]] of Object.entries(limits)) typeof value[key] == "number" && Number.isFinite(value[key]) && (result[key] = Math.max(min, Math.min(max, value[key])));
  for (const key of ["muted", "captions"]) typeof value[key] == "boolean" && (result[key] = value[key]);
  return result;
}
let saved;
try {
  saved = JSON.parse(globalThis.localStorage?.getItem(PREFERENCES_KEY));
} catch {
}
let preferences = normalizePreferences(saved);
const listeners =  new Set(), getPreferences = () => ({ ...preferences });
function setPreferences(patch) {
  preferences = normalizePreferences({ ...preferences, ...patch });
  try {
    globalThis.localStorage?.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
  }
  for (const listener of listeners) listener(getPreferences());
  return getPreferences();
}
function onPreferencesChange(listener) {
  return listeners.add(listener), () => listeners.delete(listener);
}
function controllerSteer(axis, settings = preferences) {
  if (!Number.isFinite(axis)) return 0;
  const magnitude = Math.abs(axis);
  return magnitude <= settings.deadzone ? 0 : Math.sign(axis) * Math.pow(Math.min(1, (magnitude - settings.deadzone) / (1 - settings.deadzone)), 1 / settings.sensitivity);
}
export {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  controllerSteer,
  getPreferences,
  normalizePreferences,
  onPreferencesChange,
  setPreferences
};
