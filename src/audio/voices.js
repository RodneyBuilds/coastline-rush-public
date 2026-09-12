import * as Sfx from "./sfx.js";
const VOICE_NAMES = ["driftStart", "driftChain", "boost", "checkpoint", "fork", "collision", "select", "confirm"], synth = { driftStart: () => Sfx.driftStart(), driftChain: () => Sfx.driftChain(), boost: () => Sfx.boost(), checkpoint: () => Sfx.checkpoint(), fork: () => Sfx.fork(), collision: () => Sfx.collision(), select: () => Sfx.select(), confirm: () => Sfx.confirm() }, silent = Object.fromEntries(VOICE_NAMES.map((n) => [n, () => {
}])), SETS = { synth, silent };
let activeName = "synth", active = SETS[activeName];
const unknownAsked =  new Set();
function use(name) {
  return SETS[name] ? (activeName = name, active = SETS[name], true) : false;
}
function current() {
  return activeName;
}
function sets() {
  return Object.keys(SETS);
}
function play(name, ...args) {
  const voice = active[name];
  if (!voice) {
    unknownAsked.add(name);
    return;
  }
  voice(...args);
}
function unknown() {
  return [...unknownAsked];
}
function missingIn(name) {
  const set = SETS[name];
  return set ? VOICE_NAMES.filter((v) => typeof set[v] != "function") : VOICE_NAMES.slice();
}
export {
  VOICE_NAMES,
  current,
  missingIn,
  play,
  sets,
  unknown,
  use
};
