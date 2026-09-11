import * as THREE from "three";
import { DRIFT_MIN_FRACTION, DRIFT_EXIT_SLOW, DRIFT_ENTRY_STEER, DRIFT_ARC, DRIFT_TRIM, DRIFT_SPEED_FLOOR, HOLD_LO, HOLD_HI, UNSTICK_AT, OVERSTEER_GAIN, CHAIN_STEER, CHAIN_HOLD, COUNTER_ANY, SOFT_COUNTER_HOLD, SOFT_COUNTER_SLIP, EXIT_CENTRE, EXIT_CENTRE_HOLD, WASHOUT_SLIP, WASHOUT_INTO, RECOVER_GRIP, RECOVER_SLIP, RECOVER_MAX, RECOVER_SLIDE, RECOVER_RATE_MAX, RECOVER_TO_ROAD, RECOVER_ROAD_SLIP, RECOVER_WHEEL_YIELD, GRIP_SLIP_TRACK, OVERANGLE_FRACTION, OVERANGLE_COST, DRIFT_TIER_TIMES } from "./constants.js";
import { driftReward } from "./cars.js";
function angleDiff(a, b) {
  let d = a - b;
  for (; d > Math.PI; ) d -= Math.PI * 2;
  for (; d < -Math.PI; ) d += Math.PI * 2;
  return d;
}
function exitDrift(P, reason) {
  P.exitReason = reason || "?";
  const t = P.driftTotal;
  P.pendingTier = t > DRIFT_TIER_TIMES[2] ? 3 : t > DRIFT_TIER_TIMES[1] ? 2 : t > DRIFT_TIER_TIMES[0] ? 1 : 0, P.pendingChain = P.chain, P.drifting = false, P.recovering = true, P.recoverTime = 0, P.recoverRate = Math.min(RECOVER_RATE_MAX, Math.max(RECOVER_GRIP, P.speed * Math.abs(P.slip) / RECOVER_SLIDE)), P.driftDir = 0, P.driftTotal = 0, P.chain = 0, P.counterTime = 0, P.softCounter = 0, P.centreTime = 0;
}
function payDriftReward(P, car, fx) {
  P.recovering = false, P.recoverTime = 0;
  const tier = P.pendingTier, chain = P.pendingChain;
  P.pendingTier = 0, P.pendingChain = 0, tier > 0 && (P.boost = driftReward(car, tier, chain), fx && fx.boost && fx.boost(tier, chain));
}
function shouldEnterDrift(P, input, car) {
  return !P.drifting && input.tapWindow > 0 && Math.abs(input.steerRaw) > DRIFT_ENTRY_STEER && P.speed > car.maxSpeed * DRIFT_MIN_FRACTION;
}
function enterDrift(P, input, car, fx) {
  input.tapWindow = 0, P.recovering && payDriftReward(P, car, fx), P.drifting = true, P.driftDir = Math.sign(input.steer), P.driftTotal = 0, P.chain = 0, P.driftEntrySpeed = P.speed, P.slip = P.driftDir * 0.1, P.counterTime = 0, P.softCounter = 0, P.centreTime = 0, fx && fx.driftStart && fx.driftStart();
}
function gripTick(P, car, steerYaw, dt, fx, roadHeading, wheel) {
  if (P.heading -= steerYaw * dt, P.recovering) {
    P.recoverTime += dt;
    const hands = Math.min(1, Math.abs(wheel || 0));
    roadHeading !== void 0 && (P.heading += angleDiff(roadHeading, P.heading) * RECOVER_TO_ROAD * Math.max(0, 1 - hands / RECOVER_WHEEL_YIELD) * dt), P.velDir += angleDiff(P.heading, P.velDir) * Math.min(1, (P.recoverRate || RECOVER_GRIP) * dt), P.slip = angleDiff(P.velDir, P.heading);
    const selfStraight = Math.abs(P.slip) < RECOVER_SLIP, roadStraight = roadHeading === void 0 || hands > RECOVER_WHEEL_YIELD || Math.abs(angleDiff(P.velDir, roadHeading)) < RECOVER_ROAD_SLIP;
    (P.recoverTime >= 0.35 && selfStraight && roadStraight || P.recoverTime > RECOVER_MAX) && payDriftReward(P, car, fx);
  } else P.velDir += angleDiff(P.heading, P.velDir) * Math.min(1, car.grip * dt), P.slip += (angleDiff(P.velDir, P.heading) - P.slip) * Math.min(1, GRIP_SLIP_TRACK * dt);
}
function driftTick(P, input, car, steerYaw, moving, maxV, dt, fx) {
  P.driftTotal += dt;
  const intoMax = input.analog ? 1 : HOLD_HI, into = THREE.MathUtils.clamp(input.steerRaw * P.driftDir, -1, intoMax);
  let mul;
  into >= HOLD_HI ? mul = 1 + (into - HOLD_HI) / (1 - HOLD_HI) * OVERSTEER_GAIN : into >= HOLD_LO ? mul = 1 : mul = (into - UNSTICK_AT) / (HOLD_LO - UNSTICK_AT), mul = THREE.MathUtils.clamp(mul, -1.3, 1 + OVERSTEER_GAIN);
  const slipTarget = THREE.MathUtils.clamp(P.driftDir * car.driftAngle * mul, -car.slipMax, car.slipMax);
  P.slip += (slipTarget - P.slip) * Math.min(1, car.slipRate * dt), P.velDir -= (P.slip * DRIFT_ARC + steerYaw * DRIFT_TRIM) * moving * dt, P.heading = P.velDir - P.slip;
  const over = Math.max(0, Math.abs(P.slip) - car.slipMax * OVERANGLE_FRACTION);
  over > 0 && (P.speed -= over * OVERANGLE_COST * dt);
  const hi = Math.min(P.driftEntrySpeed, maxV);
  P.speed = THREE.MathUtils.clamp(P.speed, Math.min(hi, P.driftEntrySpeed * DRIFT_SPEED_FLOOR), hi);
  const counterAny = into < COUNTER_ANY, counterHard = into < -CHAIN_STEER && P.speed > car.maxSpeed * DRIFT_MIN_FRACTION;
  P.counterTime = counterHard ? P.counterTime + dt : 0, P.softCounter = counterAny && !counterHard ? P.softCounter + dt : 0, P.centreTime = Math.abs(input.steerTarget) < EXIT_CENTRE ? P.centreTime + dt : 0;
  const flipping = P.counterTime > CHAIN_HOLD;
  P.centreTime > EXIT_CENTRE_HOLD ? exitDrift(P, "centred") : flipping && P.slip * P.driftDir < 0 ? (P.driftDir = -P.driftDir, P.chain += 1, P.driftEntrySpeed = Math.max(P.driftEntrySpeed, P.speed), fx && fx.chain && fx.chain(P.chain)) : P.speed < car.maxSpeed * DRIFT_EXIT_SLOW ? exitDrift(P, "too-slow") : !counterAny && Math.abs(input.steerTarget) >= EXIT_CENTRE && Math.abs(P.slip) < WASHOUT_SLIP && into < WASHOUT_INTO ? exitDrift(P, "washed-out") : P.softCounter > SOFT_COUNTER_HOLD && Math.abs(P.slip) < SOFT_COUNTER_SLIP && exitDrift(P, "gathered");
}
export {
  angleDiff,
  driftTick,
  enterDrift,
  exitDrift,
  gripTick,
  payDriftReward,
  shouldEnterDrift
};
