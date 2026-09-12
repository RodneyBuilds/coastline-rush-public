import * as THREE from "three";
import { BRAKE_BITE_START, BRAKE_TAP_WINDOW, BRAKE_FORCE, DRIFT_BRAKE_SCALE, COAST_DECAY, BOOST_DECAY, STEER_SPEED_DAMP, STEER_MOVING_SPEED, GRAVEL_DRAG, GRAVEL_FLOOR, RAIL_MARGIN, RAIL_ALIGN, RAIL_NOSE_ALIGN, RAIL_SLIP_SCRUB, RAIL_SPEED_KEEP, RAIL_SCRAPE_SPEED, RAIL_COOLDOWN, BUMP_RADIUS, BUMP_SPEED_KEEP, BUMP_PUSH, BUMP_COOLDOWN, EASY_AUTO_THROTTLE, EASY_STEER_ASSIST, EASY_GRAVEL_SCALE, GRAVEL_INSET, BUMP_SHAKE, WRECK_SECONDS, WRECK_SPIN, WRECK_SPIN_DECAY, WRECK_DRAG, WRECK_EXIT_SPEED, WRECK_RAIL_CLOSING, WRECK_TRAFFIC_CLOSING, WRECK_BOUNCE_KEEP, WRECK_BOUNCE_SPIN, BUMP_KICK, BUMP_KICK_MAX, BUMP_YAW } from "./constants.js";
import { CARS, DEFAULT_CAR_INDEX } from "./cars.js";
import { angleDiff, shouldEnterDrift, enterDrift, gripTick, driftTick } from "./drift.js";
import { resolveOnLeg, frameAt, legTransition, stageProgress } from "./project.js";
const UP = new THREE.Vector3(0, 1, 0), _cp = new THREE.Vector3(), _tan = new THREE.Vector3(), _side = new THREE.Vector3(), _push = new THREE.Vector3();
function createPlayerState() {
  return { carDef: CARS[DEFAULT_CAR_INDEX], mesh: null, pos: new THREE.Vector3(), heading: Math.PI, velDir: Math.PI, speed: 0, leg: "main", s: 0.02, lateral: 0, slope: 0, drifting: false, slip: 0, driftDir: 0, driftTotal: 0, chain: 0, driftEntrySpeed: 0, counterTime: 0, softCounter: 0, centreTime: 0, recovering: false, recoverTime: 0, recoverRate: 0, wreck: 0, wreckSpin: 0, wreckCause: "", wrecks: 0, pendingTier: 0, pendingChain: 0, boost: 0, finished: false, distance: 0, exitReason: "", easyMode: false, roadConsequences: true, steerInput: 0, _railCooldown: 0, _bumpCooldown: 0 };
}
class Sim {
  constructor({ roads, stage, traffic = [], fx = {}, P, clock }) {
    this.roads = roads, this.stage = stage, this.traffic = traffic, this.fx = fx, this.P = P, this.clock = clock, this.hasFork = !!stage.fork, this.forkChosen = null, this.checkpointsHit =  new Set(), this.finished = false;
  }
  reset(car, easyMode) {
    const P = this.P;
    P.carDef = car, P.easyMode = !!easyMode;
    const e = this.roads.entry;
    P.pos.set(e.x + Math.sin(e.heading) * 5, e.y, e.z + Math.cos(e.heading) * 5), P.heading = e.heading, P.velDir = e.heading, P.speed = 0, P.boost = 0, P.finished = false, P.drifting = false, P.slip = 0, P.driftDir = 0, P.driftTotal = 0, P.chain = 0, P.counterTime = 0, P.softCounter = 0, P.centreTime = 0, P.recovering = false, P.recoverTime = 0, P.recoverRate = 0, P.wreck = 0, P.wreckSpin = 0, P.wreckCause = "", P.wrecks = 0, P.pendingTier = 0, P.pendingChain = 0, P.slope = 0, P.leg = "main", P.s = 0.01, P.lateral = 0, P.distance = 0, P._railCooldown = 0, P._bumpCooldown = 0, this.forkChosen = null, this.checkpointsHit.clear(), this.clock.timeLeft = this.stage.timeLimit, this.clock.checkpointHit = false, this.finished = false;
  }
  handOver(car, easyMode) {
    const P = this.P;
    P.carDef = car, P.easyMode = !!easyMode, P.wreck = 0, P.wreckSpin = 0;
    const e = this.roads.entry;
    P.pos.distanceTo(this.roads.legs.main.getPointAt(0)) > 40 && (P.pos.set(e.x + Math.sin(e.heading) * 5, e.y, e.z + Math.cos(e.heading) * 5), P.heading = e.heading, P.velDir = e.heading, P.drifting = false, P.slip = 0), P.leg = "main", P.s = 0, P.finished = false, this.forkChosen = null, this.checkpointsHit.clear(), this.finished = false, this.clock.checkpointHit = false;
  }
  progress() {
    return stageProgress(this.P.leg, this.P.s, this.hasFork);
  }
  tick(dt, input) {
    const P = this.P, car = P.carDef, fx = this.fx;
    if (P.wreck > 0) {
      this._wreckTick(dt), this._placeMesh();
      return;
    }
    const throttle = P.easyMode ? Math.max(input.throttle, EASY_AUTO_THROTTLE) : input.throttle, maxV = car.maxSpeed + P.boost;
    throttle > 0.02 ? P.speed += car.accel * throttle * dt * (1 - P.speed / (maxV + 4)) : P.speed -= COAST_DECAY * dt;
    const brakeBite = THREE.MathUtils.clamp((input.brakeHeld - BRAKE_BITE_START) / (BRAKE_TAP_WINDOW - BRAKE_BITE_START), 0, 1);
    if (brakeBite > 0) {
      const drop = BRAKE_FORCE * (P.drifting ? DRIFT_BRAKE_SCALE : 1) * brakeBite * input.brake * dt;
      P.speed -= drop, P.drifting && (P.driftEntrySpeed = Math.max(car.maxSpeed * 0.3, P.driftEntrySpeed - drop));
    }
    P.speed = THREE.MathUtils.clamp(P.speed, 0, maxV), P.boost = Math.max(0, P.boost - BOOST_DECAY * dt);
    const steerScale = 1 / (1 + P.speed / car.maxSpeed * STEER_SPEED_DAMP), moving = Math.min(1, P.speed / STEER_MOVING_SPEED), steerYaw = input.steer * car.turnRate * steerScale * moving;
    P.steerInput = input.steer || 0, shouldEnterDrift(P, input, car) && enterDrift(P, input, car, fx);
    let roadHeading;
    P.recovering && this.roads.legs[P.leg] && (frameAt(this.roads.legs[P.leg], P.s, _cp, _side, _tan), roadHeading = Math.atan2(_tan.x, _tan.z)), P.drifting ? driftTick(P, input, car, steerYaw, moving, maxV, dt, fx) : gripTick(P, car, steerYaw, dt, fx, roadHeading, Math.abs(input.steer || 0)), P.pos.x += Math.sin(P.velDir) * P.speed * dt, P.pos.z += Math.cos(P.velDir) * P.speed * dt, P.distance += P.speed * dt;
    const curve = this.roads.legs[P.leg], road = resolveOnLeg(curve, P.s, P.pos);
    if (P.s = road.s, P.lateral = road.lateral, P.pos.y = road.y, P.slope = road.slope, P.easyMode && !P.drifting && this.roads.legs[P.leg]) {
      frameAt(curve, P.s, _cp, _side, _tan);
      const roadHeading2 = Math.atan2(_tan.x, _tan.z), pull = angleDiff(roadHeading2, P.velDir) * EASY_STEER_ASSIST * moving * dt;
      P.velDir += pull, P.heading += pull;
    }
    const handedOver = this._transitions(dt);
    let leg = curve;
    if (handedOver) {
      leg = this.roads.legs[P.leg];
      const after = resolveOnLeg(leg, P.s, P.pos);
      P.s = after.s, P.lateral = after.lateral, P.pos.y = after.y, P.slope = after.slope;
    }
    this._roadConsequences(dt, leg), this._traffic(dt), this._placeMesh();
  }
  _transitions(dt) {
    const P = this.P;
    let handedOver = false;
    const t = !this.hasFork && P.s >= 0.975 ? { kind: "finish" } : legTransition(P.leg, P.s, P.lateral, this.hasFork);
    if (t.kind === "fork" ? (P.leg = t.branch, P.s = 0, handedOver = true, this.forkChosen = t.branch, this.fx.fork && this.fx.fork(t.branch)) : t.kind === "finish" && !P.finished && (P.finished = true, this.finished = true, this.fx.finish && this.fx.finish()), this.clock.checkpointHit) return handedOver;
    const p = this.progress();
    return this.stage.checkpoints.forEach((cp, i) => {
      this.checkpointsHit.has(i) || p < cp.at || (this.checkpointsHit.add(i), this.clock.timeLeft += cp.bonus, this.fx.checkpoint && this.fx.checkpoint(cp.bonus));
    }), handedOver;
  }
  _wreck(cause, spinDir) {
    const P = this.P;
    P.wreck > 0 || (P.wreck = WRECK_SECONDS, P.wreckCause = cause, P.wrecks++, P.wreckSpin = WRECK_SPIN * (spinDir < 0 ? -1 : 1), P.drifting = false, P.recovering = false, P.recoverTime = 0, P.pendingTier = 0, P.pendingChain = 0, P.chain = 0, P.boost = 0, P.slip = 0, this.fx.collision && this.fx.collision(cause === "traffic" ? "wreck-traffic" : "wreck-rail"), this.fx.shake && this.fx.shake(1.4));
  }
  _wreckTick(dt) {
    const P = this.P;
    P.wreck = Math.max(0, P.wreck - dt), P.speed = Math.max(WRECK_EXIT_SPEED, P.speed * Math.pow(WRECK_DRAG, dt)), P.heading += P.wreckSpin * dt, P.wreckSpin *= Math.pow(WRECK_SPIN_DECAY, dt), P.pos.x += Math.sin(P.velDir) * P.speed * dt, P.pos.z += Math.cos(P.velDir) * P.speed * dt, P.distance += P.speed * dt;
    const curve = this.roads.legs[P.leg];
    if (!curve) return;
    const r = resolveOnLeg(curve, P.s, P.pos);
    if (P.s = r.s, P.lateral = r.lateral, P.pos.y = r.y, P.slope = r.slope, P.roadConsequences) {
      const limit = this.roads.railOffsetAt(P.leg, P.s) - RAIL_MARGIN;
      if (Math.abs(P.lateral) > limit) {
        frameAt(curve, P.s, _cp, _side, _tan);
        const outward = Math.sign(P.lateral) || 1;
        P.pos.copy(_cp).addScaledVector(_side, outward * limit), P.lateral = outward * limit;
        const th = Math.atan2(_tan.x, _tan.z), rel = angleDiff(P.velDir, th);
        Math.sin(rel) * outward > 0 && (P.velDir = th - rel, P.speed = Math.max(WRECK_EXIT_SPEED, P.speed * WRECK_BOUNCE_KEEP), P.wreckSpin = -P.wreckSpin * WRECK_BOUNCE_SPIN, this.fx.collision && this.fx.collision("rail"), this.fx.shake && this.fx.shake(0.6));
      }
    }
    if (frameAt(curve, P.s, _cp, _side, _tan), P.wreck <= WRECK_SECONDS / 2) {
      const half = Math.max(1, this.roads.halfRoadAt(P.leg, P.s) - GRAVEL_INSET), target = THREE.MathUtils.clamp(P.lateral, -half * 0.6, half * 0.6), correction = THREE.MathUtils.clamp(target - P.lateral, -WRECK_EXIT_SPEED * dt, WRECK_EXIT_SPEED * dt);
      _push.copy(P.pos).addScaledVector(_side, correction), this.traffic.some((c) => c.leg === P.leg && c.mesh.position.distanceTo(_push) < BUMP_RADIUS && c.mesh.position.distanceTo(_push) < c.mesh.position.distanceTo(P.pos)) || (P.pos.copy(_push), P.lateral += correction);
    }
    P.wreck > 0 || (P.heading = Math.atan2(_tan.x, _tan.z), P.velDir = P.heading, P.slip = 0, P.wreckSpin = 0, P.speed = WRECK_EXIT_SPEED);
  }
  _roadConsequences(dt, curve) {
    const P = this.P;
    if (!P.roadConsequences) return;
    const halfRoad = this.roads.halfRoadAt(P.leg, P.s), railOff = this.roads.railOffsetAt(P.leg, P.s), off = Math.abs(P.lateral);
    if (off > halfRoad) {
      const drag = GRAVEL_DRAG * (P.easyMode ? EASY_GRAVEL_SCALE : 1);
      P.speed = Math.max(P.speed - drag * dt * (off - halfRoad), GRAVEL_FLOOR);
    }
    if (off > railOff - RAIL_MARGIN) {
      frameAt(curve, P.s, _cp, _side, _tan);
      const outward = Math.sign(P.lateral);
      P.pos.copy(_cp).addScaledVector(_side, outward * (railOff - RAIL_MARGIN));
      const intoRail = (Math.sin(P.velDir) * _side.x + Math.cos(P.velDir) * _side.z) * P.speed * outward;
      if (intoRail > WRECK_RAIL_CLOSING && !P.easyMode) {
        this._wreck("rail", -outward);
        return;
      }
      if (intoRail > 0) {
        const away = angleDiff(Math.atan2(_tan.x, _tan.z), P.velDir);
        P.velDir += away * Math.min(1, RAIL_ALIGN * dt), P.heading += away * Math.min(1, RAIL_NOSE_ALIGN * dt), P.drifting && (P.slip *= Math.max(0, 1 - RAIL_SLIP_SCRUB * dt)), P.speed > RAIL_SCRAPE_SPEED && (P.speed = Math.max(RAIL_SCRAPE_SPEED, P.speed * Math.pow(RAIL_SPEED_KEEP, dt)), P._railCooldown || (this.fx.collision && this.fx.collision("rail"), P._railCooldown = RAIL_COOLDOWN));
      }
    }
    P._railCooldown = Math.max(0, P._railCooldown - dt);
  }
  _traffic(dt) {
    const P = this.P;
    if (P.roadConsequences) {
      const curve = this.roads.legs[P.leg];
      if (!curve) return;
      frameAt(curve, P.s, _cp, _side, _tan);
      for (const c of this.traffic) {
        if (c.leg !== P.leg) continue;
        const gap = c.mesh.position.distanceTo(P.pos);
        if (gap >= BUMP_RADIUS || (_push.copy(P.pos).sub(c.mesh.position), _push.y = 0, _push.lengthSq() < 1e-6 && _push.set(_side.x, 0, _side.z), _push.normalize(), P.pos.addScaledVector(_push, BUMP_RADIUS - gap + BUMP_PUSH * P.carDef.bounce * 0.1), P._bumpCooldown)) continue;
        const closing = Math.abs(P.speed - (c.speed || 0));
        if (closing > WRECK_TRAFFIC_CLOSING && !P.easyMode) {
          this._wreck("traffic", Math.sign(_push.x * _side.x + _push.z * _side.z) || 1);
          return;
        }
        P.speed *= BUMP_SPEED_KEEP;
        const sideways = _push.x * _side.x + _push.z * _side.z, kick = THREE.MathUtils.clamp(closing * BUMP_KICK, 0, BUMP_KICK_MAX) * Math.sign(sideways || 1) * P.carDef.bounce;
        P.velDir += kick, P.heading += kick * BUMP_YAW, this.fx.collision && this.fx.collision("traffic"), this.fx.shake && this.fx.shake(BUMP_SHAKE * P.carDef.bounce), P._bumpCooldown = BUMP_COOLDOWN;
      }
    }
    P._bumpCooldown = Math.max(0, P._bumpCooldown - dt);
  }
  _placeMesh() {
    const P = this.P;
    P.mesh && (P.mesh.position.copy(P.pos), P.mesh.rotation.order = "YXZ", P.mesh.rotation.set(-Math.asin(THREE.MathUtils.clamp(P.slope, -1, 1)), P.heading - P.slip * 0.2, 0), P.mesh.userData.turnWheels && P.mesh.userData.turnWheels(P.distance, P.steerInput || 0));
  }
}
export {
  Sim,
  createPlayerState
};
