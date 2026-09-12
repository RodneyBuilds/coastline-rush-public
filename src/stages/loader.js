import { tightestRadius, segmentsLength, segmentsRise, segmentsProfile } from "../world/road.js";
import { KIT_IDS } from "../world/scenery.js";
import { CHAIN_DESCENT, CHAIN_DESCENT_SLACK } from "../physics/constants.js";
const SCHEMA_VERSION = 1, MIN_DRIFT_RADIUS = 80, MAX_DRIFT_RADIUS = 250, DEFAULT_BUDGET = { drawCalls: 260, triangles: 14e5 }, REGIONS = ["rhode-island", "connecticut", "new-york"], LOD_TIERS = ["hero", "mid", "far"], PLACES = { edgewood: "rhode-island", cranston: "rhode-island", pawtuxet: "rhode-island", providence: "rhode-island", warwick: "rhode-island", narragansett: "rhode-island", jamestown: "rhode-island", stonington: "connecticut", mystic: "connecticut", groton: "connecticut", "new-london": "connecticut", "old-saybrook": "connecticut", "new-haven": "connecticut", bronx: "new-york", queens: "new-york", brooklyn: "new-york", "staten-island": "new-york", manhattan: "new-york", "upper-new-york-bay": "new-york", palisades: "new-york" }, LANDMARK_KINDS = ["massing", "span", "ridge"];
class StageValidationError extends Error {
  constructor(stageId, field, why) {
    super(`Stage "${stageId}" is not valid: ${field} ${why}`), this.name = "StageValidationError", this.stageId = stageId, this.field = field, this.why = why;
  }
}
const isNum = (v) => typeof v == "number" && Number.isFinite(v), isStr = (v) => typeof v == "string" && v.length > 0;
function validateSegments(id, where, segs) {
  if (!Array.isArray(segs) || segs.length === 0) throw new StageValidationError(id, where, "must be a non-empty array of road segments");
  segs.forEach((s, i) => {
    const at = `${where}[${i}]`;
    if (!s || typeof s != "object") throw new StageValidationError(id, at, "must be an object");
    if (!isNum(s.len) || s.len <= 0) throw new StageValidationError(id, `${at}.len`, "must be a positive number of world units");
    if (s.curve !== void 0 && !isNum(s.curve)) throw new StageValidationError(id, `${at}.curve`, "must be a number (1/radius, signed, positive is right)");
    if (s.grade !== void 0 && !isNum(s.grade)) throw new StageValidationError(id, `${at}.grade`, "must be a number (rise per unit travelled)");
    if (s.curve) {
      const r = Math.abs(1 / s.curve);
      if (r < MIN_DRIFT_RADIUS || r > MAX_DRIFT_RADIUS) throw new StageValidationError(id, `${at}.curve`, `describes a radius of ${r.toFixed(0)}, outside the drivable band ${MIN_DRIFT_RADIUS} to ${MAX_DRIFT_RADIUS}`);
    }
  });
}
function hasSBend(segs) {
  let lastSign = 0;
  for (const s of segs) {
    const sign = Math.sign(s.curve || 0);
    if (sign !== 0) {
      if (lastSign !== 0 && sign !== lastSign) return true;
      lastSign = sign;
    }
  }
  return false;
}
function longestCorner(segs) {
  let best = 0, run = 0, sign = 0;
  for (const s of segs) {
    const sg = Math.sign(s.curve || 0);
    sg !== 0 && sg === sign ? run += s.len : sg !== 0 ? (sign = sg, run = s.len) : (run = 0, sign = 0), best = Math.max(best, run);
  }
  return best;
}
function validateLandmark(id, l, i, region) {
  const at = `landmarks[${i}]`;
  if (!l || typeof l != "object") throw new StageValidationError(id, at, "must be an object");
  if (!isStr(l.id)) throw new StageValidationError(id, `${at}.id`, "must be a non-empty kebab-case id");
  if (!isNum(l.at) || l.at < 0 || l.at > 1) throw new StageValidationError(id, `${at}.at`, "must be an arc fraction between 0 and 1");
  if (!isNum(l.offset)) throw new StageValidationError(id, `${at}.offset`, "must be a signed distance in metres from the centreline");
  if (!isNum(l.heading)) throw new StageValidationError(id, `${at}.heading`, "must be a heading in radians");
  if (!isNum(l.scale) || l.scale <= 0) throw new StageValidationError(id, `${at}.scale`, "must be a positive metres-per-model-unit scale");
  if (!LOD_TIERS.includes(l.lodTier)) throw new StageValidationError(id, `${at}.lodTier`, `must be one of ${LOD_TIERS.join(", ")}`);
  if (l.kind !== void 0 && !LANDMARK_KINDS.includes(l.kind)) throw new StageValidationError(id, `${at}.kind`, `must be one of ${LANDMARK_KINDS.join(", ")} when present`);
  if (!isStr(l.place)) throw new StageValidationError(id, `${at}.place`, `is required: name the town or borough this landmark is in. Known places: ${Object.keys(PLACES).join(", ")}`);
  if (!PLACES[l.place]) throw new StageValidationError(id, `${at}.place`, `is "${l.place}", which is not a place on this route. Known places: ${Object.keys(PLACES).join(", ")}`);
  if (region && PLACES[l.place] !== region) throw new StageValidationError(id, `${at}.place`, `is "${l.place}", which is in ${PLACES[l.place]}, on a stage in ${region}`);
  if (typeof l.inWater != "boolean") throw new StageValidationError(id, `${at}.inWater`, "is required: true when this landmark stands in the water on purpose, false when it stands on land");
  if (l.leg !== void 0 && !["main", "left", "right"].includes(l.leg)) throw new StageValidationError(id, `${at}.leg`, "must be main, left or right when present");
  if (l.forward !== void 0 && !isNum(l.forward)) throw new StageValidationError(id, `${at}.forward`, "must be a distance in metres along the road tangent when present");
  if (!l.footprint || !isNum(l.footprint.w) || !isNum(l.footprint.d) || !isNum(l.footprint.h)) throw new StageValidationError(id, `${at}.footprint`, "must carry numeric w, d and h in metres, so a missing model can still be placed at the right size");
}
function validateFork(id, fork, roadWidth) {
  for (const k of ["leftLabel", "rightLabel"]) if (!isStr(fork[k])) throw new StageValidationError(id, `fork.${k}`, "must be a non-empty label");
  for (const k of ["leftStage", "rightStage"]) {
    if (fork[k] !== null && !isStr(fork[k])) throw new StageValidationError(id, `fork.${k}`, "must be a stage id or null on a terminal stage");
    if (fork[k] === id) throw new StageValidationError(id, `fork.${k}`, "points back at this same stage, which is a loop rather than a route");
  }
  if (!isNum(fork.offset)) throw new StageValidationError(id, "fork.offset", "must be a number of metres");
  if (fork.offset < roadWidth / 2) throw new StageValidationError(id, "fork.offset", `is ${fork.offset}, below the required roadWidth/2 (${roadWidth / 2}). Below that the two branches overlap at the split and no island can exist between them`);
  if (!isNum(fork.throatLen) || fork.throatLen <= 0) throw new StageValidationError(id, "fork.throatLen", "must be a positive number of world units");
  if (!isNum(fork.islandHeight) || fork.islandHeight < 0.3) throw new StageValidationError(id, "fork.islandHeight", "must be at least 0.3m: a raised kerb reads at speed and paint does not");
  validateSegments(id, "fork.leftSegments", fork.leftSegments), validateSegments(id, "fork.rightSegments", fork.rightSegments);
}
function validateBridge(id, b, i) {
  const at = `bridges[${i}]`;
  if (!b || typeof b != "object") throw new StageValidationError(id, at, "must be an object");
  if (!isStr(b.id)) throw new StageValidationError(id, `${at}.id`, "must be a non-empty kebab-case id");
  if (!isStr(b.name)) throw new StageValidationError(id, `${at}.name`, "must be the player-facing name of the crossing");
  if (!["main", "left", "right"].includes(b.leg)) throw new StageValidationError(id, `${at}.leg`, "must name the leg the crossing carries: main, left or right");
  for (const k of ["fromS", "toS"]) if (!isNum(b[k]) || b[k] < 0 || b[k] > 1) throw new StageValidationError(id, `${at}.${k}`, "must be an arc fraction between 0 and 1");
  if (b.toS <= b.fromS) throw new StageValidationError(id, `${at}.toS`, "must be beyond fromS");
  if (!Array.isArray(b.towerAt) || b.towerAt.length !== 2) throw new StageValidationError(id, `${at}.towerAt`, "must be two fractions along the crossing, one per tower");
  for (const t of b.towerAt) if (!isNum(t) || t <= 0 || t >= 1) throw new StageValidationError(id, `${at}.towerAt`, "must be fractions strictly between 0 and 1, so both towers stand on the crossing");
  if (b.towerAt[1] <= b.towerAt[0]) throw new StageValidationError(id, `${at}.towerAt`, "must be in order along the crossing");
  if (!isNum(b.waterHalfWidth) || b.waterHalfWidth < 60) throw new StageValidationError(id, `${at}.waterHalfWidth`, "must be at least 60 metres: below that the ground closes in under the deck and the crossing reads as a bridge lying on a hillside");
}
function validateChapters(id, chapters, fork) {
  if (!Array.isArray(chapters) || chapters.length === 0) throw new StageValidationError(id, "chapters", "must be a non-empty array when present");
  if (fork) throw new StageValidationError(id, "chapters", "are declared on a stage that also forks: a chapter is a stretch of one road, and past a split there are two");
  let expect = 0;
  if (chapters.forEach((c, i) => {
    const at = `chapters[${i}]`;
    if (!isStr(c.id)) throw new StageValidationError(id, `${at}.id`, "must be a non-empty id");
    if (!isStr(c.sceneryKit)) throw new StageValidationError(id, `${at}.sceneryKit`, "must name a scenery kit");
    if (!KIT_IDS.includes(c.sceneryKit)) throw new StageValidationError(id, `${at}.sceneryKit`, `is "${c.sceneryKit}", which is not a scenery kit this build has. Known kits: ${KIT_IDS.join(", ")}`);
    if (!isNum(c.fromS) || !isNum(c.toS)) throw new StageValidationError(id, `${at}`, "must carry numeric fromS and toS arc fractions");
    if (Math.abs(c.fromS - expect) > 1e-6) throw new StageValidationError(id, `${at}.fromS`, `is ${c.fromS} but the previous chapter ended at ${expect}: chapters must be contiguous with no gap and no overlap`);
    if (c.toS <= c.fromS) throw new StageValidationError(id, `${at}.toS`, "must be greater than fromS");
    expect = c.toS;
  }), Math.abs(expect - 1) > 1e-6) throw new StageValidationError(id, "chapters", `end at ${expect} rather than covering the whole stage to 1`);
}
function validateStage(def, expectId) {
  const id = def && def.id || expectId || "(unnamed)";
  if (!def || typeof def != "object") throw new StageValidationError(id, "the file", "did not parse as an object");
  if (def.schemaVersion !== SCHEMA_VERSION) throw new StageValidationError(id, "schemaVersion", `is ${JSON.stringify(def.schemaVersion)}, and this build only understands version ${SCHEMA_VERSION}`);
  if (!isStr(def.id)) throw new StageValidationError(id, "id", "must be a non-empty kebab-case id");
  if (expectId && def.id !== expectId) throw new StageValidationError(id, "id", `is "${def.id}" but the file is registered as "${expectId}"`);
  if (!isStr(def.name)) throw new StageValidationError(id, "name", "must be the player-facing stage name");
  if (!REGIONS.includes(def.region)) throw new StageValidationError(id, "region", `must be one of ${REGIONS.join(", ")}`);
  if (!(Array.isArray(def.chapters) && def.chapters.length > 0) || def.sceneryKit !== void 0) {
    if (!isStr(def.sceneryKit)) throw new StageValidationError(id, "sceneryKit", "must name a region scenery kit");
    if (!KIT_IDS.includes(def.sceneryKit)) throw new StageValidationError(id, "sceneryKit", `is "${def.sceneryKit}", which is not a scenery kit this build has. Known kits: ${KIT_IDS.join(", ")}`);
  }
  if (!isNum(def.roadWidth) || def.roadWidth <= 0) throw new StageValidationError(id, "roadWidth", "must be a positive width in metres");
  if (!isNum(def.startHeading)) throw new StageValidationError(id, "startHeading", "must be a heading in radians");
  if (!isNum(def.timeLimit) || def.timeLimit <= 0) throw new StageValidationError(id, "timeLimit", "must be a positive number of seconds");
  if (validateSegments(id, "segments", def.segments), !hasSBend(def.segments)) throw new StageValidationError(id, "segments", "contain no S-bend: every stage needs one corner that runs straight into its opposite");
  if (!def.lighting || typeof def.lighting != "object") throw new StageValidationError(id, "lighting", "must be an object of sky and fog values");
  for (const k of ["skyTurbidity", "rayleigh", "sunElevation", "sunAzimuth", "exposure", "fogNear", "fogFar", "bloomThreshold"]) if (!isNum(def.lighting[k])) throw new StageValidationError(id, `lighting.${k}`, "must be a number");
  if (!isNum(def.lighting.fogColor)) throw new StageValidationError(id, "lighting.fogColor", "must be a numeric colour, for example 0xf0bd90");
  if (def.fork === void 0) throw new StageValidationError(id, "fork", "must be present, as an object or null");
  if (def.fork !== null && validateFork(id, def.fork, def.roadWidth), !Array.isArray(def.checkpoints)) throw new StageValidationError(id, "checkpoints", "must be an array");
  let prev = 0;
  if (def.checkpoints.forEach((c, i) => {
    if (!isNum(c.at) || c.at <= 0 || c.at >= 1) throw new StageValidationError(id, `checkpoints[${i}].at`, "must be an arc fraction strictly between 0 and 1");
    if (c.at <= prev) throw new StageValidationError(id, `checkpoints[${i}].at`, "must be greater than the previous checkpoint");
    if (!isNum(c.bonus) || c.bonus <= 0) throw new StageValidationError(id, `checkpoints[${i}].bonus`, "must be a positive number of seconds");
    if (c.label !== void 0 && !isStr(c.label)) throw new StageValidationError(id, `checkpoints[${i}].label`, "must be the place name the arch shows when present, or absent to fall back to the plain checkpoint sign");
    prev = c.at;
  }), def.markers !== void 0) {
    if (!Array.isArray(def.markers)) throw new StageValidationError(id, "markers", "must be an array when present");
    let last = -1;
    def.markers.forEach((m, i) => {
      const at = `markers[${i}]`;
      if (!isStr(m.label)) throw new StageValidationError(id, `${at}.label`, "must be the place name the sign shows");
      if (!isNum(m.at) || m.at <= 0 || m.at >= 1) throw new StageValidationError(id, `${at}.at`, "must be an arc fraction strictly between 0 and 1 of the main leg");
      if (m.at <= last) throw new StageValidationError(id, `${at}.at`, "must be further along than the previous marker");
      last = m.at;
    });
  }
  if (def.gateway !== void 0 && def.gateway !== null) {
    if (!isStr(def.gateway.label)) throw new StageValidationError(id, "gateway.label", "must be the place name the opening arch shows");
    if (!isNum(def.gateway.at) || def.gateway.at <= 0 || def.gateway.at >= 0.5) throw new StageValidationError(id, "gateway.at", "must be an arc fraction between 0 and 0.5: a gateway stands at the head of the stage, not in the middle of it");
  }
  const tr = def.traffic;
  if (!tr || typeof tr != "object") throw new StageValidationError(id, "traffic", "must be an object");
  if (!isNum(tr.density) || tr.density < 0 || tr.density > 1) throw new StageValidationError(id, "traffic.density", "must be a number between 0 and 1");
  if (!Number.isInteger(tr.lanesUsed) || tr.lanesUsed < 1 || tr.lanesUsed > 4) throw new StageValidationError(id, "traffic.lanesUsed", "must be a whole number of lanes between 1 and 4");
  if (!Array.isArray(tr.palette) || tr.palette.length === 0) throw new StageValidationError(id, "traffic.palette", "must be a non-empty array of colours");
  if (!Array.isArray(def.landmarks)) throw new StageValidationError(id, "landmarks", "must be an array, empty only with a written reason");
  if (def.landmarks.length === 0 && !isStr(def.landmarksEmptyReason)) throw new StageValidationError(id, "landmarks", "is empty, which is allowed only alongside a landmarksEmptyReason saying why this place has none yet");
  if (def.landmarks.forEach((l, i) => validateLandmark(id, l, i, def.region)), def.shore !== void 0 && def.shore !== null) {
    if (!isNum(def.shore.offset)) throw new StageValidationError(id, "shore.offset", "must be a distance in metres");
    if (![1, -1].includes(def.shore.side)) throw new StageValidationError(id, "shore.side", "must be 1 (driver left) or -1 (driver right)");
    if (!Array.isArray(def.shore.legs) || def.shore.legs.length === 0) throw new StageValidationError(id, "shore.legs", "must name at least one leg the coastline runs along");
  }
  if (def.bridges !== void 0) {
    if (!Array.isArray(def.bridges)) throw new StageValidationError(id, "bridges", "must be an array when present");
    def.bridges.forEach((b, i) => validateBridge(id, b, i));
  }
  if (def.chapters !== void 0 && validateChapters(id, def.chapters, def.fork), def.budget !== void 0 && (!isNum(def.budget.drawCalls) || !isNum(def.budget.triangles))) throw new StageValidationError(id, "budget", "must carry numeric drawCalls and triangles when present");
  return def;
}
function chainDescent(stages) {
  const byId = new Map(stages.map((s) => [s.id, s])), pointedAt =  new Set();
  for (const s of stages) if (s.fork) for (const k of ["leftStage", "rightStage"]) s.fork[k] && pointedAt.add(s.fork[k]);
  let worst = 0;
  const walk = (id, y, path) => {
    const s = byId.get(id);
    if (!s || path.includes(id)) return;
    const main = segmentsProfile(s.segments);
    worst = Math.min(worst, y + main.lo);
    const afterMain = y + main.net;
    if (!s.fork) {
      worst = Math.min(worst, afterMain);
      return;
    }
    for (const side of ["left", "right"]) {
      const b = segmentsProfile(s.fork[`${side}Segments`]);
      worst = Math.min(worst, afterMain + b.lo, afterMain + b.net);
      const next = s.fork[`${side}Stage`];
      next && walk(next, afterMain + b.net, [...path, id]);
    }
  };
  for (const root of stages.filter((s) => !pointedAt.has(s.id))) walk(root.id, 0, []);
  return -worst;
}
function checkStageSet(stages) {
  const problems = [], byId = new Map(stages.map((s) => [s.id, s]));
  for (const s of stages) if (s.fork) for (const k of ["leftStage", "rightStage"]) {
    const target = s.fork[k];
    target !== null && !byId.has(target) && problems.push(`${s.id}: fork.${k} points at "${target}", which is not a registered stage`);
  }
  const descent = chainDescent(stages);
  descent > CHAIN_DESCENT ? problems.push(`routes descend ${descent.toFixed(1)}m below the start line and CHAIN_DESCENT is ${CHAIN_DESCENT}: raise it, or the road ends up under the sea`) : CHAIN_DESCENT - descent > CHAIN_DESCENT_SLACK && problems.push(`routes descend only ${descent.toFixed(1)}m and CHAIN_DESCENT is ${CHAIN_DESCENT}: lower it, or the game starts ${(CHAIN_DESCENT - descent).toFixed(1)}m higher above the water than any road needs`);
  const kits =  new Map();
  for (const s of stages) {
    const named = [s.sceneryKit, ...(s.chapters || []).map((c) => c.sceneryKit)].filter(Boolean);
    for (const kit of named) kits.has(kit) && kits.get(kit) !== s.region && problems.push(`scenery kit "${kit}" is shared across regions, and a kit is never a recolour of another`), kits.set(kit, s.region);
  }
  const finales = stages.filter((s) => Array.isArray(s.chapters) && s.chapters.length === 5);
  if (finales.length !== 1 && problems.push(`expected exactly 1 chaptered finale, found ${finales.length}: the length-ratio rule in ACCEPTANCE H6 is only satisfiable with one`), finales.length === 1) {
    const finale = finales[0];
    finale.chapters.length !== 5 && problems.push(`${finale.id}: the New York finale must declare exactly 5 chapters, one per borough, and declares ${finale.chapters.length}`);
    const lengthOf = (s) => segmentsLength(s.segments) + (s.fork ? Math.max(segmentsLength(s.fork.leftSegments), segmentsLength(s.fork.rightSegments)) : 0), others = stages.filter((s) => s.id !== finale.id), mean = others.reduce((a, s) => a + lengthOf(s), 0) / Math.max(1, others.length), ratio = lengthOf(finale) / mean;
    ratio < 1.8 && problems.push(`${finale.id}: is ${ratio.toFixed(2)}x the mean of the other stages, and the brief requires at least 1.8x`);
    const maxOther = Math.max(...others.map((s) => s.checkpoints.length));
    finale.checkpoints.length <= maxOther && problems.push(`${finale.id}: carries ${finale.checkpoints.length} checkpoints and must carry more than any other stage, which has ${maxOther}`), finale.landmarks.some((l) => l.id === "statue-of-liberty") || problems.push(`${finale.id}: must carry a landmark with id "statue-of-liberty", placed so it is in frame at the finish`);
  }
  for (const s of stages) {
    const legs = [["segments", s.segments]];
    s.fork && legs.push(["fork.leftSegments", s.fork.leftSegments], ["fork.rightSegments", s.fork.rightSegments]);
    for (const [where, segs] of legs) {
      longestCorner(segs) < 200 && problems.push(`${s.id}: ${where} holds no corner of 200+ units, which is under 5 seconds of drift at racing speed`), segmentsRise(segs) <= 3 && problems.push(`${s.id}: ${where} has ${segmentsRise(segs).toFixed(1)}m of elevation change and needs more than 3m`);
      const r = tightestRadius(segs);
      r !== 1 / 0 && (r < MIN_DRIFT_RADIUS || r > MAX_DRIFT_RADIUS) && problems.push(`${s.id}: ${where} has a radius of ${r.toFixed(0)}, outside ${MIN_DRIFT_RADIUS} to ${MAX_DRIFT_RADIUS}`);
    }
  }
  return problems;
}
function checkBudget(def, measured, strict) {
  const budget = def.budget || DEFAULT_BUDGET, over = [];
  if (measured.drawCalls > budget.drawCalls && over.push(`${measured.drawCalls} draw calls against a budget of ${budget.drawCalls}`), measured.triangles > budget.triangles && over.push(`${measured.triangles.toLocaleString()} triangles against a budget of ${budget.triangles.toLocaleString()}`), !over.length) return null;
  const msg = `Stage "${def.id}" is over its rendering budget: ${over.join(" and ")}`;
  if (strict) throw new StageValidationError(def.id, "budget", over.join(" and "));
  return msg;
}
export {
  DEFAULT_BUDGET,
  LANDMARK_KINDS,
  MAX_DRIFT_RADIUS,
  MIN_DRIFT_RADIUS,
  PLACES,
  SCHEMA_VERSION,
  StageValidationError,
  chainDescent,
  checkBudget,
  checkStageSet,
  hasSBend,
  longestCorner,
  validateStage
};
