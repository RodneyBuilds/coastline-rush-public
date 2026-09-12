import * as THREE from "three";
import { FIXED_DT, WATERLINE, ROAD_MIN_CLEARANCE, DRIFT_BRAKE_SCALE, BRAKE_TAP_GRACE, shapeSteer } from "./physics/constants.js";
import { CARS, carIndexById } from "./physics/cars.js";
import { createPlayerState, Sim } from "./physics/drive.js";
import { attachInput, pollInput, input, clearKeys, anyKeyDown } from "./core/input.js";
import { createLoop } from "./core/loop.js";
import { createPerf, heapMB } from "./core/perf.js";
import { StateMachine, checkStateTable } from "./core/state.js";
import { loadSettings, saveSettings, getBestTime, recordBestTime, OWNED_KEYS } from "./core/storage.js";
import { installErrorLog, logError, entryCount, errorCount, setErrorListener, downloadLog, readLog, clearLog, flushLog } from "./core/errorlog.js";
import * as Voices from "./audio/voices.js";
import { createRenderer, applyStageFog, blendStageFog, frameCost } from "./render/renderer.js";
import { applyStageBloom, easeSunGlare } from "./render/bloom.js";
import { LightingRig } from "./render/lighting.js";
import { CloudLayer } from "./render/clouds.js";
import { ChaseCamera, CAM, CAM_SETTLED, sightLineAtCar, carRoofHeight } from "./render/camera.js";
import { installFrameRateSettings } from "./ui/frameRateSettings.js";
import { prepareTerrainJoin } from "./world/terrainJoin.js";
import { QualityGovernor } from "./render/quality.js";
import { Viewer } from "./render/view.js";
import { BODY_BUILDERS } from "./render/materials.js";
import { ROAD, TERRAIN, applyMaps, applyAnisotropy } from "./render/textures.js";
import { facadeCacheSize, facadeCanvases } from "./render/facade.js";
import { loadVehicleModel, buildFallbackBody, preloadTrafficModels, preloadPlayerModels, awaitPlayerModel, trafficModel } from "./render/vehicleModel.js";
import { disposeTree } from "./world/dispose.js";
import { RoadNetwork, roadStrip, framePlane } from "./world/road.js";
import { Terrain } from "./world/terrain.js";
import { Ocean, SEABED_Y } from "./world/ocean.js";
import { Scenery } from "./world/scenery.js";
import { Landmarks } from "./world/landmarks.js";
import { installDriveControls } from "./ui/driveControls.js";
import { raceCountdown, raceCelebration } from "./ui/raceSequence.js";
import { DriftScore } from "./physics/score.js";
import { FinishFestival } from "./world/finishFestival.js";
import { closeRoadDeck } from "./world/roadDeck.js";
import { prepareAnnouncements, announce } from "./audio/announcer.js";
import { shoulderRoadSamples, clearShoulderJunctions } from "./world/shoulderJunctions.js";
import { installGraphicsSettings } from "./ui/graphicsSettings.js";
import { installPlayerSettings } from "./ui/playerSettings.js";
import { installDrivingLesson } from "./ui/drivingLesson.js";
import { installCredits } from "./ui/credits.js";
import { Signage } from "./world/signage.js";
import { Bridge } from "./world/bridge.js";
import { RoadSupports } from "./world/roadSupports.js";
import { Traffic } from "./world/traffic.js";
import { loadStage, prefetchNext, nextStageId, FIRST_STAGE, loadAllStages, enumerateRoutes, cachedStage } from "./stages/registry.js";
import { checkBudget, validateStage, checkStageSet, PLACES } from "./stages/loader.js";
import * as Audio from "./audio/engine.js";
import * as Music from "./audio/music.js";
import * as Sfx from "./audio/sfx.js";
import { TyreSmoke } from "./render/tyreSmoke.js";
import { DemoDrive } from "./ui/demo.js";
import "./ui/presentation.css";
import { COPY, TRACK_CREDITS, auditCopy, auditStrings } from "./ui/copy.js";
import { settleLogotype, renderRouteMap } from "./ui/attract.js";
import { SelectScreen } from "./ui/select.js";
import { Hud } from "./ui/hud.js";
import { ResultsScreen } from "./ui/results.js";
const DEV = !!(import.meta.env && import.meta.env.DEV), $ = (id) => document.getElementById(id);
function bindCopy() {
  for (const el of document.querySelectorAll("[data-copy]")) {
    const path = el.getAttribute("data-copy").split(".");
    let v = COPY;
    for (const part of path) v = v === void 0 ? void 0 : v[part];
    typeof v == "string" ? el.textContent = v : logError("warn", "main/bindCopy", `no copy entry for "${el.getAttribute("data-copy")}"`);
  }
}
const SCREENS = ["attract", "select", "results", "stage-error"];
function showScreen(id) {
  for (const s of SCREENS) $(s).classList.toggle("show", s === id);
  $("hud").classList.toggle("show", id === null);
}
let toastTimer = 0;
function toast(message) {
  const t = $("toast");
  t.textContent = message, t.classList.add("show"), clearTimeout(toastTimer), toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}
function wantsReducedMotion(settings2) {
  return typeof settings2.reducedMotion == "boolean" ? settings2.reducedMotion : matchMedia("(prefers-reduced-motion: reduce)").matches;
}
class StageWorld {
  constructor(scene2, stage2, qualityLevel, opts = {}) {
    if (this.root = new THREE.Group(), this.root.visible = !opts.hidden, scene2.add(this.root), this.scene = scene2, this.stage = stage2, this.deferred = !!opts.defer, this.roadMeshes = [], this.bridges = [], this.chapters = [], this.activeChapter = -1, this.buildMarks = { totalMs: 0, phases: [] }, this.initializing = this.initializeSteps(stage2, qualityLevel, opts), !this.deferred || !opts.deferInitialization) {
      for (const unused of this.initializing) ;
      this.initializing = null;
    }
  }
  *initializeSteps(stage2, qualityLevel, opts) {
    const parent = this.root, marks = this.buildMarks.phases;
    let last = performance.now(), cpuMs = 0;
    const mark = (name) => {
      const now = performance.now(), elapsed = now - last;
      cpuMs += elapsed, marks.push({ name, ms: +elapsed.toFixed(1) }), this.buildMarks.totalMs = +cpuMs.toFixed(1), last = now;
    }, pause = function* (name) {
      mark(name), yield name, last = performance.now();
    };
    this.roads = new RoadNetwork(stage2, opts.entry), yield* pause("roads"), this.roadMeshes = [];
    const asphaltMat = applyMaps(new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, normalScale: new THREE.Vector2(0.04, 0.04) }), ROAD, 3355962);
    this.asphaltMat = asphaltMat;
    const shoulderMat = applyMaps(new THREE.MeshStandardMaterial({ color: 7307853, roughness: 1, envMapIntensity: 0.12, normalScale: new THREE.Vector2(0.18, 0.18) }), TERRAIN, 7307853);
    shoulderMat.roughnessMap = null, this.shoulderMat = shoulderMat;
    const shoulderSamples = shoulderRoadSamples(this.roads);
    for (const name of this.roads.legNames) {
      const curve = this.roads.legs[name], width = (t) => this.roads.widthAt(name, t), shoulderWidth = (t) => {
        const w = 24 + (this.roads.widthAt(name, t) - this.roads.roadWidth);
        return w + (this.roads.widthAt(name, t) - w) * this.roads.bridgeMix(name, t);
      }, segs = name === "main" ? 320 : 220, marked = () => this.roads.roadWidth, forks = name === "main" && !!stage2.fork, mix = (t) => this.roads.throatMix(name, t), strips = forks ? [{ off: (t) => -this.roads.forkOffset * mix(t), tFrom: 0 }, { off: (t) => this.roads.forkOffset * mix(t), tFrom: Math.max(0, 1 - this.roads.throatLen / this.roads.mainLength) }] : [{ off: 0, tFrom: 0 }];
      for (const strip of strips) {
        const span = 1 - strip.tFrom, road = new THREE.Mesh(closeRoadDeck(roadStrip(curve, marked, Math.max(24, Math.round(segs * span)), 0.02, strip.off, null, this.roads.roadWidth, this.roads.legPhase(name), { tFrom: strip.tFrom })), asphaltMat);
        road.userData.leg = name, road.receiveShadow = true, parent.add(road), this.roadMeshes.push(road), yield* pause(`road.strip.${name}`);
      }
      const shoulder = new THREE.Mesh(clearShoulderJunctions(roadStrip(curve, shoulderWidth, segs, -0.06, 0, null, this.roads.roadWidth, this.roads.legPhase(name)), name, shoulderSamples), shoulderMat);
      shoulder.userData.leg = name, shoulder.receiveShadow = true, parent.add(shoulder), this.roadMeshes.push(shoulder), yield* pause(`road.shoulder.${name}`);
    }
    yield* pause("roadMeshes"), this.terrain = new Terrain(parent, this.roads, stage2, { deferMesh: this.deferred, prevBounds: opts.prevBounds, prevTerrain: opts.prevTerrain }), this.roadSupports = new RoadSupports(parent, this.roads, this.terrain), this.deferred || this.roadSupports.rebuild(), yield* pause("terrain"), this.scenery = new Scenery(parent, this.terrain, stage2.sceneryKit || "", qualityLevel, { defer: this.deferred }), yield* pause("scenery"), this.landmarks = new Landmarks(parent, this.roads, stage2, this.terrain), yield* pause("landmarks"), this.traffic = new Traffic(parent, this.roads, stage2, { defer: this.deferred }), yield* pause("traffic");
    const next = stage2.fork ? { leftName: nameOf(stage2.fork.leftStage), rightName: nameOf(stage2.fork.rightStage), leftRegion: regionOf(stage2.fork.leftStage), rightRegion: regionOf(stage2.fork.rightStage) } : {};
    if (this.signage = new Signage(parent, this.roads, next, { defer: !!opts.deferInitialization }), opts.deferInitialization) for (const slice of this.signage.finishSteps()) yield* pause(slice);
    yield* pause("signage");
    for (const bridge of stage2.bridges || []) this.bridges.push(new Bridge(parent, this.roads, bridge)), yield* pause("bridge");
    if (this.finishFestival = stage2.fork ? null : new FinishFestival(parent, this.roads), yield* pause("finishFestival"), this.chapters = [], Array.isArray(stage2.chapters)) {
      for (const c of stage2.chapters) this.chapters.push({ def: c, scenery: new Scenery(parent, this.terrain, c.sceneryKit, qualityLevel, { defer: this.deferred, arc: [c.fromS, c.toS] }) }), yield* pause("chapter");
      for (const c of this.chapters) c.scenery.setVisible(true);
    }
    this.activeChapter = -1, mark("signageAndChapters");
  }
  *finishSteps() {
    if (this.deferred) {
      this.initializing && (yield* this.initializing, this.initializing = null), yield* this.terrain.finishSteps(), yield* this.roadSupports.rebuildSteps(), yield* this.scenery.finishSteps(), yield* this.traffic.spawnSteps();
      for (const c of this.chapters) yield* c.scenery.finishSteps(), c.scenery.setVisible(true);
      this.deferred = false;
    }
  }
  setVisible(on) {
    this.root.visible = !!on;
  }
  setBackdrop() {
    this.backdrop = true;
    const keep = new Set(this.landmarks.placed.map((p) => p.object));
    keep.add(this.terrain.mesh);
    for (const c of this.traffic.agents) keep.add(c.mesh);
    this.traffic.retireAll();
  }
  visibleRoadside(view) {
    if (!view.camera) return true;
    const kits = [this.scenery, ...this.chapters.map((c) => c.scenery)];
    for (const kit of kits) for (const mesh of kit.meshes) if (!(!mesh.visible || !mesh.boundingSphere) && !(mesh.boundingSphere.distanceToPoint(view.camera.position) > 650) && view.frustum.intersectsObject(mesh)) return true;
    return false;
  }
  cullSceneryToOwnedGround() {
    this.landmarks.reconcileGround(), this.roadSupports.rebuild();
    let n = this.scenery.cullToOwnedGround();
    for (const c of this.chapters) n += c.scenery.cullToOwnedGround();
    return n;
  }
  updateChapters(progress, lighting2, stageLighting) {
    if (!this.chapters.length) return;
    let index = this.chapters.findIndex((c) => progress >= c.def.fromS && progress < c.def.toS);
    index < 0 && (index = progress >= 1 ? this.chapters.length - 1 : 0), index !== this.activeChapter && (this.chapters.forEach((c) => c.scenery.setVisible(true)), this.activeChapter = index);
    const here = this.chapters[index].def, next = this.chapters[index + 1], span = here.toS - here.fromS, local = span > 0 ? (progress - here.fromS) / span : 0, BAND = 0.2;
    next && local > 1 - BAND ? lighting2.applyBlend(here.lighting || stageLighting, next.def.lighting || stageLighting, (local - (1 - BAND)) / BAND) : lighting2.apply(here.lighting || stageLighting);
  }
  update(dt, view) {
    this.traffic.update(dt, view), this.finishFestival?.update(dt, view);
  }
  dispose() {
    this.initializing?.return(), this.initializing = null;
    for (const backdrop of this.retainedBackgrounds || []) backdrop.dispose();
    this.retainedBackgrounds?.clear(), this.finishFestival?.dispose(), this.roadSupports?.dispose();
    for (const m of this.roadMeshes) this.root.remove(m), m.geometry.dispose();
    this.roadMeshes.length = 0, this.asphaltMat?.dispose(), this.shoulderMat?.dispose(), this.traffic?.dispose(), this.signage?.dispose();
    for (const b of this.bridges) b.dispose();
    this.bridges.length = 0, this.landmarks?.dispose(), this.scenery?.dispose();
    for (const c of this.chapters) c.scenery.dispose();
    this.chapters.length = 0, this.terrain?.dispose(), this.scene.remove(this.root);
  }
}
function nameOf(id) {
  if (!id) return;
  const s = cachedStage(id);
  return s ? s.name : void 0;
}
function regionOf(id) {
  if (!id) return;
  const s = cachedStage(id);
  return s ? s.region : void 0;
}
const settings = loadSettings(), reducedMotion = wantsReducedMotion(settings), game = { state: "boot", carIndex: carIndexById(settings.carId), musicIndex: Math.max(0, Math.min(TRACK_CREDITS.length - 1, settings.musicId)), easyMode: settings.easyMode, timeLeft: 0, checkpointHit: false, forkChosen: null, paused: false, reducedMotion, route: [], finished: false, runTime: 0, start() {
  return startRun();
}, finish() {
  return onStageFinished();
}, timeOut() {
  onTimeout();
} }, machine = new StateMachine({ onReject: (from, to) => logError("warn", "core/state", `refused transition ${from} to ${to}`) });
function go(next) {
  machine.state = game.state;
  const ok = machine.go(next);
  return ok && (game.state = machine.state), ok;
}
const canvas = $("game-canvas"), { renderer, scene, camera, composer, bloomPass, aoPass } = createRenderer(canvas);
applyAnisotropy(renderer), preloadTrafficModels(), preloadPlayerModels();
const lighting = new LightingRig(scene, renderer), clouds = new CloudLayer(scene), ocean = new Ocean(scene), chase = new ChaseCamera(camera), viewer = new Viewer();
chase.shakeEnabled = !reducedMotion, ocean.animated = !reducedMotion;
const P = createPlayerState(), quality = new QualityGovernor({ targetFPS: () => loop.getFrameLimit(), renderer, bloomPass, aoPass, onLevel: (level) => { lighting.setQuality(level); composer.setPixelRatio(renderer.getPixelRatio()); } });
let lastCounts = { programs: 0, textures: 0, geometries: 0, heap: 0 }, lastFrameDelta = {};
function renderCounts() {
  const m = performance.memory;
  return { programs: renderer.info.programs ? renderer.info.programs.length : 0, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, heap: m ? Math.round(m.usedJSHeapSize / 1048576) : 0 };
}
const perf = createPerf({ context: () => {
  const d = lastFrameDelta;
  return { state: game.state, leg: P.leg, s: +P.s.toFixed(3), speed: +P.speed.toFixed(1), quality: quality.level, ...d };
} }), hud = new Hud(), tyreSmoke = new TyreSmoke(scene), demo = new DemoDrive(), results = new ResultsScreen(), select = new SelectScreen({ onCar: (i) => {
  game.carIndex = i, Voices.play("select"), persist();
}, onMusic: (i) => {
  game.musicIndex = i, Voices.play("select"), previewMusic(i), persist();
}, onEasy: (on) => {
  game.easyMode = on, Voices.play("select"), persist();
}, onGo: () => {
  Voices.play("confirm"), startRun();
} });
let world = null, sim = null, stage = null, routes = [], stageIndex =  new Map();
async function previewMusic(id) {
  $("music-status").textContent = "Loading soundtrack\u2026", $("music-retry").hidden = true;
  const played = await Music.playTrack(id);
  game.musicIndex === id && ($("music-status").textContent = played ? Audio.state().state !== "running" ? "Click Retry Audio to enable sound." : "Playing" : "Track unavailable. Retry or choose another.", $("music-retry").hidden = !(!played || Audio.state().state !== "running"));
}
function persist() {
  saveSettings({ carId: CARS[game.carIndex].id, musicId: game.musicIndex, easyMode: game.easyMode, reducedMotion: settings.reducedMotion });
}
const fx = { driftStart: () => Voices.play("driftStart"), chain: (n) => {
  Voices.play("driftChain"), hud.chain(n);
}, boost: (tier, chain) => {
  hud.driftReward(tier, chain);
}, checkpoint: (bonus) => {
  Voices.play("checkpoint"), hud.checkpoint(bonus);
}, fork: (branch) => {
  game.forkChosen = branch, beginPrebuild(nextStageId(stage, branch), branch), Voices.play("fork");
  const label = branch === "left" ? stage.fork.leftLabel : stage.fork.rightLabel;
  hud.forkChosen(label);
}, collision: () => {
  Voices.play("collision"), toast("Contact slows you down. Leave room to recover.");
}, shake: (amount) => chase.addShake(amount), finish: () => onStageFinished() };
let entering = false;
const BUILD_SLICE_MS = 3, BLOCKING_SLICE_MS = 16, stageSwaps = [], buildSlices = { count: 0, worstMs: 0, worstAt: "", over33: 0, totalMs: 0, breaches: [], driving: { count: 0, worstMs: 0, worstAt: "", over33: 0, samples: [] } };
function recordSlice(ms, where, driving = false) {
  if (buildSlices.count++, buildSlices.totalMs += ms, ms > buildSlices.worstMs && (buildSlices.worstMs = +ms.toFixed(1), buildSlices.worstAt = where), ms > 33 && (buildSlices.over33++, buildSlices.breaches.length < 12 && buildSlices.breaches.push({ ms: +ms.toFixed(1), where, driving })), !driving) return;
  const d = buildSlices.driving;
  d.count++, ms > d.worstMs && (d.worstMs = +ms.toFixed(1), d.worstAt = where), ms > 33 && d.over33++, d.samples.length < 600 && d.samples.push(+ms.toFixed(2));
}
function schedulePrebuild(fn) {
  document.hidden ? setTimeout(fn, 50) : requestAnimationFrame(fn);
}
function schedule(fn) {
  let fired = false;
  const once = () => {
    fired || (fired = true, fn());
  };
  requestAnimationFrame(once), setTimeout(once, 0);
}
function runSteps(steps) {
  return new Promise((resolve, reject) => {
    const pump = () => {
      const t0 = performance.now(), until = t0 + BLOCKING_SLICE_MS;
      let where = "start";
      try {
        do {
          const r = steps.next();
          if (r.value && (where = r.value), r.done) {
            recordSlice(performance.now() - t0, where), resolve();
            return;
          }
        } while (performance.now() < until);
      } catch (err) {
        reject(err);
        return;
      }
      recordSlice(performance.now() - t0, where), schedule(pump);
    };
    schedule(pump);
  });
}
let prebuilt = null;
function takePrebuilt(id) {
  if (!prebuilt) return null;
  const hit = prebuilt.id === id && prebuilt.steps === null, held = prebuilt;
  return prebuilt = null, hit ? held.world : (world && world.traffic && world.traffic.setSuccessor(null), discardPrebuilt(held), null);
}
function* prepareAttachment(current, arriving, plane) {
  const join = yield* prepareTerrainJoin(current.terrain, arriving.terrain, plane), supportCommits = [];
  let committed = false;
  try {
    const commits = [];
    for (const [stage2, terrain] of [[current, join.current], [arriving, join.next]]) {
      const support = yield* stage2.roadSupports.rebuildSteps({ terrain, deferCommit: true });
      if (!support) throw new Error("Road support preparation was superseded");
      supportCommits.push(support), commits.push(support);
      for (const scenery of [stage2.scenery, ...stage2.chapters.map((c) => c.scenery)]) commits.push(yield* scenery.prepareGroundCull(terrain));
    }
    yield "attachment.prepared";
    const start = performance.now();
    join.commit();
    for (const commit of commits) commit();
    current.landmarks.reconcileGround(), arriving.landmarks.reconcileGround(), arriving.setVisible(true), current.traffic.setSuccessor(arriving.traffic), arriving.buildMarks.attachment = [{ name: "commit", ms: +(performance.now() - start).toFixed(1) }], committed = true;
  } finally {
    if (join.dispose(), !committed) for (const commit of supportCommits) commit.dispose();
  }
}
function beginPrebuild(id, branch) {
  if (prebuilt || entering || !id || !world) return;
  cancelRetirement();
  const initiatingWorld = world, entry = initiatingWorld.roads.exitFrame(branch), plane = framePlane(entry);
  loadStage(id).then((def) => {
    if (prebuilt || entering || game.state !== "drive" || world !== initiatingWorld) return;
    const w = new StageWorld(scene, def, quality.level, { defer: true, deferInitialization: true, hidden: true, entry, prevBounds: world.terrain.world, prevTerrain: world.terrain }), currentWorld = world, steps = (function* () {
      yield* w.finishSteps(), yield* prepareAttachment(currentWorld, w, plane);
    })(), held = { id, def, world: w, steps, entry, plane, leg: branch, ready: false };
    prebuilt = held;
    const pump = () => {
      if (prebuilt !== held) return;
      const t0 = performance.now(), until = t0 + BUILD_SLICE_MS;
      let where = "prebuild";
      try {
        do {
          const r = held.steps.next();
          if (r.value && (where = r.value), r.done) {
            held.steps = null, recordSlice(performance.now() - t0, where, true), held.ready = true;
            return;
          }
        } while (performance.now() < until);
      } catch (err) {
        logError("error", "main/prebuild", `could not build "${id}" ahead of time`, err), prebuilt = null, held.steps?.return(), w.dispose();
        return;
      }
      recordSlice(performance.now() - t0, where, true), schedulePrebuild(pump);
    };
    schedulePrebuild(pump);
  }).catch((err) => logError("warn", "stages/registry", `prebuild of "${id}" could not load`, err));
}
function discardPrebuilt(held) {
  held.steps?.return(), held.ready && world && held.world !== world ? (world.retainedBackgrounds ||=  new Set()).add(held.world) : held.world.dispose();
}
function dropPrebuild() {
  if (cancelRetirement(), !prebuilt) return;
  const held = prebuilt;
  prebuilt = null, world && world.traffic && world.traffic.setSuccessor(null), discardPrebuilt(held);
}
const RETIRE_DISTANCE = 260, RETIRE_LATEST = 1600;
let retiring = null, retirementPreparation = null;
function cancelRetirement() {
  const pending = retirementPreparation;
  retirementPreparation = null, pending?.steps?.return(), pending?.commit?.dispose();
}
function retirementEligible(previous = retiring) {
  if (!previous) return false;
  const past = P.distance - previous.from;
  return past > RETIRE_LATEST && !previous.world.landmarks.anyInFrustum(camera) || past > RETIRE_DISTANCE && !previous.world.visibleRoadside(viewer) && !previous.world.landmarks.anyInFrustum(camera) && !previous.world.traffic.anySeen(viewer);
}
function beginRetirement() {
  if (retirementPreparation || !retiring || !world || entering || prebuilt?.steps) return;
  const owner = world, previous = retiring, pending = { owner, previous, steps: owner.terrain.releasePreviousSteps(previous.world.terrain, { deferCommit: true }), commit: null };
  retirementPreparation = pending;
  const pump = () => {
    if (retirementPreparation !== pending) return;
    if (world !== owner || retiring !== previous || entering || prebuilt?.steps || game.state !== "drive") {
      cancelRetirement();
      return;
    }
    const start = performance.now(), until = start + BUILD_SLICE_MS;
    let where = "terrain.retirement";
    try {
      do {
        const result = pending.steps.next();
        if (result.done) {
          if (pending.steps = null, pending.commit = result.value, recordSlice(performance.now() - start, where, true), !retirementEligible(previous)) {
            cancelRetirement();
            return;
          }
          pending.commit ? retireNow(pending.commit) : retireNow();
          return;
        }
        result.value && (where = result.value);
      } while (performance.now() < until);
    } catch (err) {
      cancelRetirement(), logError("error", "main/retirement", "could not prepare previous terrain release", err);
      return;
    }
    recordSlice(performance.now() - start, where, true), schedulePrebuild(pump);
  };
  schedulePrebuild(pump);
}
function retireNow(preparedRelease = null) {
  if (preparedRelease && !preparedRelease()) {
    cancelRetirement();
    return;
  }
  cancelRetirement(), retiring && (retiring.world.traffic && retiring.world.traffic.setSuccessor(null), world && !preparedRelease && world.terrain.releasePrevious(retiring.world.terrain), retiring.world.dispose(), retiring = null);
}
async function enterStage(id, keepClock) {
  entering = true;
  const run = (async () => {
    try {
      await enterStageInner(id, keepClock);
    } finally {
      entering = false;
    }
  })();
  enterPromise = run;
  try {
    await run;
  } finally {
    enterPromise === run && (enterPromise = null);
  }
}
let enterPromise = null;
async function enterStageInner(id, keepClock) {
  const def = await loadStage(id), carried = game.timeLeft, swapT0 = performance.now(), entry = keepClock && world ? world.roads.exitFrame(P.leg) : void 0;
  let next = takePrebuilt(id);
  const wasReady = !!next;
  if (next || (next = new StageWorld(scene, def, quality.level, { defer: true, deferInitialization: true, hidden: true, entry, prevBounds: entry && world ? world.terrain.world : void 0, prevTerrain: entry && world ? world.terrain : void 0 }), await runSteps(next.finishSteps()), entry && world && await runSteps(prepareAttachment(world, next, framePlane(entry)))), retireNow(), world && (wasReady || entry ? (world.setBackdrop(), retiring = { world, from: P.distance }) : world.dispose()), stage = def, world = next, world.setVisible(true), ocean.setTerrain(world.terrain), retiring && retiring.world.traffic && retiring.world.traffic.setSuccessor(world.traffic), stageSwaps.push({ id, prebuilt: wasReady, ms: +(performance.now() - swapT0).toFixed(0) }), stageSwaps.length > 24 && stageSwaps.shift(), applyStageBloom(bloomPass, def.lighting), applyStageFog(scene, camera, def.lighting), lighting.apply(def.lighting), sim = new Sim({ roads: world.roads, stage: def, traffic: world.traffic.agents, fx, P, clock: game }), entry ? (sim.handOver(CARS[game.carIndex], game.easyMode), game.timeLeft = carried + def.timeLimit) : (sim.reset(CARS[game.carIndex], game.easyMode), chase.snapTo(P)), hud.setStage(def), game.forkChosen = null, game.route.push(id), prefetchNext(def), DEV && !retiring) {
    composer.render();
    const cost = frameCost(renderer, scene, camera), over = checkBudget(def, cost, false);
    over && logError("warn", "stages/loader", over);
  }
}
const warmedCars =  new Set();
async function ensurePlayerCar() {
  const car = CARS[game.carIndex];
  if (P.mesh && P.mesh.userData.carId === car.id) return;
  const model = await awaitPlayerModel(car.id);
  P.mesh && (scene.remove(P.mesh), disposeTree(P.mesh)), P.mesh = model || buildFallbackBody(car.id) || (BODY_BUILDERS[car.builder] || BODY_BUILDERS.crv)(), P.mesh.userData.carId = car.id, model && (P.mesh.userData.modelled = true), scene.add(P.mesh), chase.fitToCar(P.mesh), warmedCars.has(car.id) || (warmedCars.add(car.id), renderer.compile(scene, camera)), model || swapInVehicleModel(car);
}
async function swapInVehicleModel(car) {
  let model = null;
  try {
    model = await loadVehicleModel(car.id);
  } catch (err) {
    logError("warn", "render/vehicle", `could not load a model for ${car.id}`, err);
    return;
  }
  if (model) {
    if (!P.mesh || P.mesh.userData.carId !== car.id || P.mesh.userData.modelled) {
      disposeTree(model);
      return;
    }
    model.userData.carId = car.id, model.userData.modelled = true, model.position.copy(P.mesh.position), model.rotation.copy(P.mesh.rotation), scene.remove(P.mesh), disposeTree(P.mesh), P.mesh = model, scene.add(P.mesh), chase.fitToCar(P.mesh), renderer.compile(scene, camera);
  }
}
const _glareForward = new THREE.Vector3();
let starting = false, runGeneration = 0;
const driftScore = new DriftScore();
let announcedDriftTier = 0;
async function startRun() {
  if (!starting) {
    starting = true;
    try {
      await startRunInner();
    } finally {
      starting = false;
    }
  }
}
async function startRunInner() {
  if (enterPromise) try {
    await enterPromise;
  } catch {
  }
  dropPrebuild(), retireNow(), game.route = [], runGeneration++, game.paused = false, game.finished = false, game.runTime = 0, hud.freeDrive = !!game.freeDrive, driftScore.reset(), $("drift-score").textContent = "SCORE 0", tyreSmoke.clear(), game.checkpointHit = false, perf.reset(), Music.resetSynthesisCounter();
  try {
    await enterStage(FIRST_STAGE, false);
  } catch (err) {
    return showStageError(err);
  }
  await ensurePlayerCar(), sim.tick(FIXED_DT, input);
  const culled = [];
  scene.traverseVisible((object) => {
    object.isMesh && object.frustumCulled && (culled.push(object), object.frustumCulled = false);
  });
  try {
    composer.render();
  } finally {
    for (const object of culled) object.frustumCulled = true;
  }
  loop.reseed(), showScreen(null), go("drive") || (go("select"), go("drive")), quality.reset(), Audio.startEngine(), await raceCountdown(game), loop.reseed();
}
async function onStageFinished() {
  if (game.finished) return;
  const branch = sim.forkChosen, nextId = branch ? nextStageId(stage, branch) : null;
  if (nextId) {
    try {
      await enterStage(nextId, true);
    } catch (err) {
      showStageError(err);
    }
    return;
  }
  game.finished = true;
  const generation = runGeneration;
  await raceCelebration({ game, player: P, curve: world.roads.legs[P.leg], place: () => sim._placeMesh(), reducedMotion: game.reducedMotion, cancelled: () => generation !== runGeneration }), generation === runGeneration && toResults(true);
}
function onTimeout() {
  game.finished = false, toResults(false);
}
function toResults(finished) {
  dropPrebuild(), retireNow(), Audio.stopEngineSound();
  const car = CARS[game.carIndex], stageId = `route-v2/${game.route.join("/")}/${game.easyMode ? "easy" : "standard"}`;
  let best = getBestTime(stageId, car.id), isNewBest = false;
  if (finished && !game.freeDrive) {
    const recorded = recordBestTime(stageId, car.id, game.runTime);
    best = recorded.best, isNewBest = recorded.isNew;
  }
  const routeName = game.route.map((id) => (cachedStage(id) || {}).name).filter(Boolean).join(" \xB7 ");
  results.render({ finished, distance: P.distance, time: game.runTime, best, isNewBest, routeName, carName: car.name, animate: !game.reducedMotion, score: driftScore.total + driftScore.slide, bestSlide: Math.max(driftScore.best, driftScore.slide), easyMode: game.easyMode, freeDrive: game.freeDrive }), showScreen("results"), go("results");
}
function showStageError(err) {
  logError("error", "stages/registry", err.message || String(err), err), $("stage-error-detail").textContent = err && err.message ? err.message : "", showScreen("stage-error"), game.state = "results", machine.state = "results";
}
function menuFrame() {
  switch (game.state) {
    case "attract":
      (input.confirmEdge || anyKeyDown()) && (settleLogotype(), Audio.unlock(), previewMusic(game.musicIndex), clearKeys(), showScreen("select"), go("select"), select.render());
      break;
    case "select":
      select.handleInput(input), input.confirmEdge && (Voices.play("confirm"), startRun()), input.backEdge && (showScreen("attract"), go("attract"));
      break;
    case "results":
      input.confirmEdge && (showScreen("select"), go("select"), select.render());
      break;
    default:
      break;
  }
}
function step(dt) {
  if (!sim || entering || starting || game.finished) return;
  sim.tick(dt, input);
  const banked = driftScore.tick(dt, P), cheerTier = driftScore.seconds >= 12 ? 3 : driftScore.seconds >= 7 ? 2 : driftScore.seconds >= 3 ? 1 : 0;
  cheerTier > announcedDriftTier && announce("cheer", cheerTier) && (announcedDriftTier = cheerTier), driftScore.active || (announcedDriftTier = 0), banked > 0 && toast(`+${banked.toLocaleString()} drift points secured`), banked >= 1e3 && announce("cheer", banked >= 7e3 ? 3 : banked >= 3e3 ? 2 : 1), game.freeDrive || (game.timeLeft -= dt), game.runTime += dt, !game.freeDrive && game.timeLeft <= 0 && game.state === "drive" && onTimeout(), stepWatch && stepWatch();
}
let stepWatch = null;
const LIGHT_BLEND_UNITS = 420;
function blendIntoNextStage() {
  if (!prebuilt || !prebuilt.ready || !sim || P.leg !== prebuilt.leg) return;
  const left = (1 - P.s) * world.roads.legLength(P.leg), k = THREE.MathUtils.clamp(1 - left / LIGHT_BLEND_UNITS, 0, 1);
  k <= 0 || (lighting.applyBlend(stage.lighting, prebuilt.def.lighting, k), blendStageFog(scene, camera, stage.lighting, prebuilt.def.lighting, k));
}
function frame(dt, rawSeconds = dt) {
  if (menuFrame(), game.state === "drive" && sim && world && !entering) {
    const progress = sim.progress();
    chase.update(P, world.roads.legs[P.leg], dt), lighting.follow(P.pos), viewer.begin(camera, P), viewer.ownedByPlayer = true, starting || world.update(dt, viewer), prebuilt && prebuilt.ready && (viewer.ownedByPlayer = false, prebuilt.world.update(dt, viewer), prebuilt.world.landmarks.update(camera.position)), retiring && retiring.world !== world && (viewer.ownedByPlayer = false, retiring.world.update(dt, viewer)), retiring && !prebuilt?.steps && retirementEligible() && beginRetirement(), blendIntoNextStage(), world.updateChapters(progress, lighting, stage.lighting), world.landmarks.update(camera.position);
    const nearFork = !!stage.fork && P.leg === "main" && P.s > 0.72;
    const scoreText = driftScore.active ? `DRIFT +${Math.floor(driftScore.slide).toLocaleString()}  \xD7${driftScore.multiplier}` : `SCORE ${driftScore.total.toLocaleString()}`;
    const scoreLabel = $("drift-score");
    if (scoreLabel.textContent !== scoreText) scoreLabel.textContent = scoreText;
    hud.update(P, game.timeLeft, progress, nearFork), tyreSmoke.update(dt, P, input, renderer.domElement.height), Audio.engineFrame(P.speed / P.carDef.maxSpeed, input.throttle, P.drifting, dt, input.brake, input.brakeHeld);
  } else world && !entering && (game.state === "attract" && P.mesh && sim ? (demo.update(dt, { P, world, sim, chase, lighting, reducedMotion: game.reducedMotion }), tyreSmoke.update(dt, P, { brake: 0, brakeHeld: 0 }, renderer.domElement.height)) : (tyreSmoke.clear(), chase.menuOrbit(performance.now() / 1e3, world.roads.entry, !game.reducedMotion)), world.update(dt));
  ocean.update(dt), clouds.update(dt, camera), !entering && !starting && !game.paused && quality.update(rawSeconds), camera.getWorldDirection(_glareForward), easeSunGlare(bloomPass, lighting.easeGlare(_glareForward)), composer.render();
  const counts = renderCounts();
  lastFrameDelta = { dPrograms: counts.programs - lastCounts.programs, dTextures: counts.textures - lastCounts.textures, dGeometries: counts.geometries - lastCounts.geometries, dHeapMB: counts.heap - lastCounts.heap };
  for (const key of Object.keys(lastFrameDelta)) lastFrameDelta[key] || delete lastFrameDelta[key];
  lastCounts = counts;
}
const loop = createLoop({ onInput: dt => { pollInput(dt); }, onFrame: frame, onStep: step, stepping: () => game.state === "drive" && !entering, paused: () => game.paused || document.hidden, perf });
let driveControls;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) game.paused = true, game.state === "drive" && go("paused"), Audio.suspend();
  else {
    if (driveControls?.manualPaused) return;
    game.paused = false, game.state === "paused" && go("drive"), loop.reseed(), Audio.resume();
  }
});
async function boot() {
  installErrorLog(), prepareAnnouncements(), driveControls = installDriveControls({ game, go, loop, audio: Audio, renderer, composer, toast, saveReport: () => clrHooks.saveReport() }), installGraphicsSettings(quality), installFrameRateSettings(loop), installPlayerSettings(), installDrivingLesson(game), installCredits(), bindCopy(), attachInput({ toast: (kind) => toast(kind === "connected" ? COPY.micro.padConnected : COPY.micro.padDisconnected), gesture: () => { Audio.unlock(); prepareAnnouncements(); } }), select.restore({ carIndex: game.carIndex, musicIndex: game.musicIndex, easyMode: game.easyMode }), $("btn-start").addEventListener("click", () => {
    dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })), dispatchEvent(new KeyboardEvent("keyup", { key: "Enter" }));
  }), $("btn-demo").addEventListener("click", () => {
    clearKeys(), showScreen("attract"), go("attract");
  }), $("btn-again").addEventListener("click", () => {
    dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })), dispatchEvent(new KeyboardEvent("keyup", { key: "Enter" }));
  }), $("btn-error-back").addEventListener("click", () => {
    dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })), dispatchEvent(new KeyboardEvent("keyup", { key: "Enter" }));
  }), $("log-download").addEventListener("click", () => downloadLog()), addEventListener("keydown", (e) => {
    e.key === "F9" && (e.preventDefault(), clrHooks.saveReport());
  });
  try {
    await enterStage(FIRST_STAGE, false);
  } catch (err) {
    showStageError(err);
  }
  if (loadAllStages().then(({ stages, problems, routes: found }) => {
    routes = found, stageIndex = stages, renderRouteMap($("route-map-attract"), routes, stages, FIRST_STAGE), renderRouteMap($("route-map-select"), routes, stages, FIRST_STAGE);
    for (const p of problems) logError("warn", "stages/registry", p);
  }).catch((err) => logError("error", "stages/registry", "could not load the stage set", err)), DEV) {
    for (const p of checkStateTable()) logError("warn", "core/state", p);
    for (const p of auditCopy()) logError("warn", "ui/copy", p);
  }
  renderer.compile(scene, camera), await ensurePlayerCar(), Music.prewarm();
  const showLogLink = () => $("log-download").classList.add("show");
  errorCount() > 0 && showLogLink(), setErrorListener(showLogLink), window.__clr = clrHooks, showScreen("attract"), go("attract"), loop.start();
}
const clrHooks = { game, P, input, CARS, shapeSteer, camera, CAM, quality, perf, scene, renderer, composer, THREE, chase, lighting, aoPass, bloomPass, sightLineAtCar, carRoofHeight, buildSlices, stageSwaps, saveReport() {
  const report = { when: ( new Date()).toISOString(), agent: navigator.userAgent, screen: `${innerWidth}x${innerHeight} @${devicePixelRatio}`, state: game.state, route: game.route.slice(), stage: stage ? stage.id : null, easyMode: game.easyMode, car: CARS[game.carIndex].id, padConnected: input.padConnected, padName: input.padName, perf: perf.stats(), graphics: { level: quality.level, pixelRatio: renderer.getPixelRatio(), frameLimit: loop.getFrameLimit(), automatic: quality.enabled }, buildSlices: { ...buildSlices }, stageSwaps: stageSwaps.slice(), lastBuild: world ? world.buildMarks : null, heapMB: heapMB(), errors: readLog().slice(-80) }, blob = new Blob([JSON.stringify(report, null, 1)], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a");
  return a.href = url, a.download = `coastline-rush-report-${report.when.replace(/[:.]/g, "-")}.json`, document.body.appendChild(a), a.click(), a.remove(), setTimeout(() => URL.revokeObjectURL(url), 0), console.log("[clr] report saved to your downloads folder"), report;
}, Audio, Music, Sfx, Voices, tyreSmoke, WATERLINE, ROAD_MIN_CLEARANCE, SEABED_Y, DRIFT_BRAKE_SCALE, BRAKE_TAP_GRACE, CAM_SETTLED, get stage() {
  return stage;
}, get sim() {
  return sim;
}, get world() {
  return world;
}, get viewer() {
  return viewer;
}, get LEGS() {
  return world ? world.roads.legs : null;
}, get LEG_SEGMENTS() {
  return world ? world.roads.segmentsByLeg : null;
}, get ROAD_W() {
  return world ? world.roads.roadWidth : 15;
}, get LANES() {
  return world ? world.roads.lanes : [];
}, get FORK_OFFSET() {
  return world ? world.roads.forkOffset : 0;
}, get THROAT_W() {
  return world ? world.roads.throatWidth : 0;
}, get THROAT_LEN() {
  return world ? world.roads.throatLen : 0;
}, get THROAT_GROW() {
  return world ? world.roads.throatGrow : 0;
}, get MAIN_LEN() {
  return world ? world.roads.mainLength : 0;
}, get ISLAND_H() {
  return stage && stage.fork ? stage.fork.islandHeight : 0;
}, get ROAD_BASE_Y() {
  return world ? world.roads.baseY : 0;
}, get WORLD() {
  return world ? world.terrain.world : null;
}, get START_TIME() {
  return stage ? stage.timeLimit : 0;
}, get CHECKPOINT_BONUS() {
  return stage && stage.checkpoints[0] ? stage.checkpoints[0].bonus : 0;
}, get routes() {
  return routes;
}, get stages() {
  return stageIndex;
}, halfRoadAt: (leg, t) => world.roads.halfRoadAt(leg, t), railOffsetAt: (leg, t) => world.roads.railOffsetAt(leg, t), throatMix: (leg, t) => world.roads.throatMix(leg, t), terrainHeight: (x, z) => world.terrain.heightAt(x, z), roadInfluence: (x, z) => world.terrain.roadInfluence(x, z), stageProgress: () => sim ? sim.progress() : 0, heapMB, frameCost: () => frameCost(renderer, scene, camera), landmarkInFrustum: (id) => world ? world.landmarks.inFrustum(id, camera) : false, validateStage, checkStageSet, loadAllStages, enumerateRoutes, auditCopy, auditStrings, checkStateTable, PLACES, facadeCacheSize, facadeCanvases, buildStageWorld: (def, opts) => new StageWorld(scene, def, quality.level, opts), trafficModel, pollInput, storageKeys: OWNED_KEYS, errorLog: { read: readLog, clear: clearLog, count: entryCount, errors: errorCount, write: logError, flush: flushLog }, get entering() {
  return entering;
}, get nextStage() {
  return prebuilt ? { id: prebuilt.id, ready: prebuilt.ready, visible: prebuilt.world.root.visible, entry: { ...prebuilt.entry }, leg: prebuilt.leg, world: prebuilt.world } : null;
}, get retiringWorld() {
  return retiring ? retiring.world : null;
}, watchSteps(fn) {
  stepWatch = fn || null;
}, tick(n) {
  for (let i = 0; i < n && game.state === "drive" && (step(FIXED_DT), !(!game.freeDrive && game.timeLeft <= 0)); i++) ;
}, frameOnce(dt = 1 / 60) {
  world && world.update(dt), sim && chase.update(P, world.roads.legs[P.leg], dt), sim && lighting.follow(P.pos), sim && hud.update(P, game.timeLeft, sim.progress(), false), composer.render();
}, captureFrame(dt = 1 / 60) {
  const steps = world && sim ? chase.settle(P, world.roads.legs[P.leg], dt) : 0;
  return clrHooks.frameOnce(dt), steps;
}, cameraOnly(dt = 1 / 60) {
  world && chase.update(P, world.roads.legs[P.leg], dt);
}, async autopilot(branches, maxTicks = 120 * 600, yieldEvery = 240, cadence = "timer") {
  const plan = Array.isArray(branches) ? branches : [branches];
  let ticks = 0;
  for (; ticks < maxTicks && game.state === "drive"; ) {
    if (game.finished) {
      await new Promise((r) => setTimeout(r, 16));
      continue;
    }
    const roads = world.roads, branch = plan[Math.min(plan.length - 1, Math.max(0, game.route.length - 1))], target = P.leg === "main" && stage.fork ? (branch === "left" ? roads.forkOffset : -roads.forkOffset) * Math.min(1, Math.max(0, (P.s - 0.75) / 0.2)) : 0, tan = world.roads.legs[P.leg].getTangentAt(P.s), roadHeading = Math.atan2(tan.x, tan.z), wantLateralSpeed = Math.max(-6, Math.min(6, (target - P.lateral) * 1.4)), speed = Math.max(6, P.speed);
    let headingError = roadHeading + Math.asin(Math.max(-0.5, Math.min(0.5, wantLateralSpeed / speed))) - P.heading;
    for (; headingError > Math.PI; ) headingError -= Math.PI * 2;
    for (; headingError < -Math.PI; ) headingError += Math.PI * 2;
    input.steerRaw = Math.max(-1, Math.min(1, -headingError * 3)), input.steer = shapeSteer(input.steerRaw), input.steerTarget = input.steerRaw, input.analog = true, input.throttle = P.speed < P.carDef.maxSpeed * 0.62 ? 1 : 0, input.brake = 0, input.brakeHeld = 0, input.brakeEdge = false, input.tapWindow = 0, game.timeLeft = Math.max(game.timeLeft, 30), step(FIXED_DT), ticks++, ticks % yieldEvery === 0 && await new Promise((r) => cadence === "animation" ? requestAnimationFrame(r) : setTimeout(r, 0));
  }
  return { finished: game.state !== "drive", ticks, route: game.route.slice(), leg: P.leg, s: P.s };
} };
boot().catch((err) => {
  logError("error", "main/boot", err.message || String(err), err), window.__clr = clrHooks;
});
