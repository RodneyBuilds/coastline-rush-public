import { validateStage, checkStageSet } from "./loader.js";
const LOADERS = { "ri-edgewood": () => import("./defs/ri-edgewood.json"), "ct-mystic-harbor": () => import("./defs/ct-mystic-harbor.json"), "ct-new-london": () => import("./defs/ct-new-london.json"), "ny-hudson-shore": () => import("./defs/ny-hudson-shore.json"), "ny-five-boroughs": () => import("./defs/ny-five-boroughs.json"), "ny-brooklyn-bridge": () => import("./defs/ny-brooklyn-bridge.json") }, FIRST_STAGE = "ri-edgewood", STAGE_IDS = Object.keys(LOADERS), RUN_LENGTH = 3, cache =  new Map(), inflight =  new Map();
function loadStage(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  if (inflight.has(id)) return inflight.get(id);
  const loader = LOADERS[id];
  if (!loader) return Promise.reject(new Error(`No stage is registered under the id "${id}".`));
  const p = loader().then((mod) => {
    const def = validateStage(mod.default ?? mod, id);
    return cache.set(id, def), inflight.delete(id), def;
  }).catch((err) => {
    throw inflight.delete(id), err;
  });
  return inflight.set(id, p), p;
}
function cachedStage(id) {
  return cache.get(id);
}
function prefetchNext(stage) {
  if (!(!stage || !stage.fork)) for (const key of ["leftStage", "rightStage"]) {
    const id = stage.fork[key];
    id && !cache.has(id) && loadStage(id).catch(() => {
    });
  }
}
function nextStageId(stage, branch) {
  return stage.fork ? branch === "left" ? stage.fork.leftStage : stage.fork.rightStage : null;
}
function enumerateRoutes(stages, problems = []) {
  const routes = [], walk = (id, path) => {
    if (path.includes(id)) {
      problems.push(`the stage graph loops: ${[...path, id].join(" -> ")}. A route through the pyramid never revisits a stage`);
      return;
    }
    const stage = stages[id];
    if (!stage) return;
    const here = [...path, id], left = stage.fork ? stage.fork.leftStage : null, right = stage.fork ? stage.fork.rightStage : null;
    if (!left && !right) {
      routes.push(here);
      return;
    }
    left && walk(left, here), right && walk(right, here);
  };
  return walk(FIRST_STAGE, []), routes;
}
async function loadAllStages() {
  const loaded = await Promise.all(STAGE_IDS.map((id) => loadStage(id))), stages = {};
  loaded.forEach((s) => {
    stages[s.id] = s;
  });
  const problems = checkStageSet(loaded), routes = enumerateRoutes(stages, problems);
  routes.length !== 4 && problems.push(`the pyramid yields ${routes.length} routes and the locked brief calls for 4`);
  for (const r of routes) r.length !== RUN_LENGTH && problems.push(`route ${r.join(" -> ")} is ${r.length} stages long and a run is ${RUN_LENGTH}`);
  return { stages, problems, routes };
}
export {
  FIRST_STAGE,
  RUN_LENGTH,
  STAGE_IDS,
  cachedStage,
  enumerateRoutes,
  loadAllStages,
  loadStage,
  nextStageId,
  prefetchNext
};
