import * as THREE from "three";
import { buildTrafficCar } from "../render/materials.js";
import { disposeTree } from "./dispose.js";
import { laneChangeTick } from "./laneChanges.js";
const UP = new THREE.Vector3(0, 1, 0), _p = new THREE.Vector3(), _t = new THREE.Vector3(), _s = new THREE.Vector3(), _look = new THREE.Vector3(), CARS_PER_LEG_AT_FULL = 16, SPEED_LO = 11, SPEED_HI = 14, RIG_EVERY = 9, RIG_OFFSET = 4, RIG_SPEED_LO = 8.4, RIG_SPEED_HI = 9.8;
function isRig(i) {
  return (i % RIG_EVERY + RIG_EVERY) % RIG_EVERY === RIG_OFFSET;
}
const RESPAWN_BEHIND = 190, FORK_MERGE_UNITS = 60;
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
}
class Traffic {
  constructor(scene, roads, stage, opts = {}) {
    this.scene = scene, this.roads = roads, this.stage = stage, this.agents = [], this.successor = null, this.target = 0, opts.defer || this._spawn();
  }
  setSuccessor(next) {
    this.successor = next && next !== this ? next : null;
  }
  *spawnSteps() {
    this.agents.length || (yield* this._spawnSteps());
  }
  _spawn() {
    const steps = this._spawnSteps();
    for (; !steps.next().done; ) ;
  }
  *_spawnSteps() {
    const { density, lanesUsed, palette } = this.stage.traffic, rnd = rng(793175 ^ this.stage.id.length * 2654435761), lanes = [0, 3, 1, 2].slice(0, Math.max(1, Math.min(4, lanesUsed))).map((i) => this.roads.lanes[i]);
    this.target = 0;
    for (const legName of this.roads.legNames) {
      const legScale = legName === "right" ? 1.15 : legName === "left" ? 0.85 : 1, count = Math.max(1, Math.round(CARS_PER_LEG_AT_FULL * density * legScale));
      this.target += count;
      for (let i = 0; i < count; i++) {
        const t = ((i + 0.5) / count + (rnd() - 0.5) * 0.35 / count + 1) % 1, heavy = isRig(i), mesh = buildTrafficCar(palette[(heavy ? Math.floor(i / RIG_EVERY) : i) % palette.length], i, heavy);
        this.scene.add(mesh);
        const agent = { leg: legName, t: Math.min(0.985, Math.max(0.02, t)), speed: heavy ? RIG_SPEED_LO + rnd() * (RIG_SPEED_HI - RIG_SPEED_LO) : SPEED_LO + rnd() * (SPEED_HI - SPEED_LO), lane: lanes[i % lanes.length], mesh, leaving: false, tick: -1, mergeOffset: 0, mergeLeft: 0, unseen: 0 };
        this._place(agent), this.agents.push(agent), yield "traffic.car";
      }
    }
    this._lanes = lanes, this._palette = palette, this._cursor = this.agents.length;
  }
  _nextLegHere(c) {
    return c.leg !== "main" || !this.roads.legs.left ? null : c.lane >= 0 ? "left" : "right";
  }
  _place(c) {
    const curve = this.roads.legs[c.leg];
    if (!curve) return;
    const t = Math.min(1, Math.max(0, c.t)), p = curve.getPointAt(t, _p), tan = curve.getTangentAt(t, _t), side = _s.crossVectors(UP, tan).normalize(), merge = c.mergeLeft > 0 ? c.mergeOffset * (c.mergeLeft / FORK_MERGE_UNITS) : 0;
    c.mesh.position.copy(p).addScaledVector(side, c.lane + merge), c.mesh.lookAt(_look.copy(c.mesh.position).add(tan).addScaledVector(side, Math.tan(c.laneYaw || 0)));
  }
  update(dt, view) {
    const tick = view ? view.tick : -1;
    for (let i = this.agents.length - 1; i >= 0; i--) {
      const c = this.agents[i];
      if (tick >= 0 && c.tick === tick) continue;
      const curve = this.roads.legs[c.leg];
      if (!curve) continue;
      if (c.leaving && view) {
        if (view.canSee(c.mesh)) c.unseen = 0;
        else if (++c.unseen >= 2) {
          this._remove(i);
          continue;
        }
      }
      const len = curve.getLength();
      laneChangeTick(c, this.agents, this.roads, view?.player, dt, i);
      const advance = c.speed * dt;
      if (c.dist = (c.dist || 0) + advance, c.mesh.userData.turnWheels && c.mesh.userData.turnWheels(c.dist, 0), c.mergeLeft > 0 && (c.mergeLeft = Math.max(0, c.mergeLeft - advance)), c.t += advance / len, c.t >= 1) {
        const went = this._carryOn(i, c, (c.t - 1) * len, tick);
        if (went === "handed") continue;
        went || (c.t = 1, c.leaving = true);
      }
      this._place(c);
    }
    view && view.ownedByPlayer && this._keepPopulation(view);
  }
  _carryOn(i, c, overshoot, tick) {
    const here = this._nextLegHere(c);
    if (here) return c.leg = here, c.t = Math.min(0.999, overshoot / this.roads.legs[here].getLength()), c.tick = tick, c.mergeOffset = (here === "left" ? -1 : 1) * this.roads.forkOffset, c.mergeLeft = FORK_MERGE_UNITS, "here";
    const to = this.successor;
    if (!to || !to.roads.legs.main) return false;
    this.agents.splice(i, 1), this.scene.remove(c.mesh), to.scene.add(c.mesh), to.agents.push(c), c.leg = "main", c.t = Math.min(0.999, overshoot / to.roads.legs.main.getLength()), c.tick = tick, c.leaving = false, c.unseen = 0;
    const lanes = to.roads.lanes;
    let near = lanes[0];
    for (const L of lanes) Math.abs(L - c.lane) < Math.abs(near - c.lane) && (near = L);
    return c.mergeOffset = c.lane - near, c.mergeLeft = c.mergeOffset === 0 ? 0 : FORK_MERGE_UNITS, c.lane = near, to._place(c), "handed";
  }
  retireAll() {
    for (const c of this.agents) c.leaving = true;
  }
  anySeen(view) {
    if (!view) return true;
    for (const c of this.agents) if (view.canSee(c.mesh)) return true;
    return false;
  }
  _remove(i) {
    const c = this.agents[i];
    this.agents.splice(i, 1), this.scene.remove(c.mesh), disposeTree(c.mesh);
  }
  _keepPopulation(view) {
    const live = this.agents.filter((c) => !c.leaving);
    if (live.length > this.target) {
      let worst = null;
      for (const c of live) {
        const d = view.aheadOf(c.mesh);
        (!worst || d < worst.d) && (worst = { c, d });
      }
      worst && worst.d < 0 && (worst.c.leaving = true);
      return;
    }
    if (live.length >= this.target || !view.playerLeg) return;
    const curve = this.roads.legs[view.playerLeg];
    if (!curve) return;
    const t = view.playerS - RESPAWN_BEHIND / curve.getLength();
    t <= 0.01 || this._restore(view, view.playerLeg, t);
  }
  _restore(view, leg, t) {
    const lanes = this._lanes || this.roads.lanes, palette = this._palette || this.stage.traffic.palette, i = this._cursor = (this._cursor || 0) + 1, heavy = isRig(i), mesh = buildTrafficCar(palette[(heavy ? Math.floor(i / RIG_EVERY) : i) % palette.length], i, heavy), c = { leg, t, speed: heavy ? RIG_SPEED_LO + i * 0.37 % 1 * (RIG_SPEED_HI - RIG_SPEED_LO) : SPEED_LO + i * 0.37 % 1 * (SPEED_HI - SPEED_LO), lane: lanes[i % lanes.length], mesh, leaving: false, tick: -1, mergeOffset: 0, mergeLeft: 0, unseen: 0 };
    if (this.scene.add(mesh), this._place(c), view.canSee(mesh)) {
      this.scene.remove(mesh), disposeTree(mesh);
      return;
    }
    this.agents.push(c);
  }
  dispose() {
    for (const c of this.agents) this.scene.remove(c.mesh), disposeTree(c.mesh);
    this.agents.length = 0, this.successor = null;
  }
}
export {
  Traffic
};
