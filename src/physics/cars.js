import { DRIFT_TIER_BOOST } from "./constants.js";
const CARS = [{ id: "toy", name: "TRAIL MINI", desc: "EASIEST", flavor: "Grips like glue. Bounces like a beach ball.", maxSpeed: 38, accel: 13, grip: 8.5, turnRate: 1.75, driftAngle: 0.44, slipMax: 0.62, slipRate: 4.6, bounce: 1.6, boostScale: 1.15, builder: "toy" }, { id: "crv", name: "COAST CROSSOVER", desc: "BALANCED", flavor: "Comfortable grip. Balanced handling.", maxSpeed: 44, accel: 14, grip: 7, turnRate: 1.55, driftAngle: 0.52, slipMax: 0.75, slipRate: 3.6, bounce: 1, boostScale: 1, builder: "crv" }, { id: "gt", name: "SUNSET GT", desc: "FASTEST", flavor: "Longest drifts. No mercy.", maxSpeed: 52, accel: 15.5, grip: 5.6, turnRate: 1.42, driftAngle: 0.62, slipMax: 0.88, slipRate: 2.7, bounce: 0.8, boostScale: 1, builder: "gt" }], DEFAULT_CAR_INDEX = 1;
function carById(id) {
  return CARS.find((c) => c.id === id) || CARS[DEFAULT_CAR_INDEX];
}
function carIndexById(id) {
  const i = CARS.findIndex((c) => c.id === id);
  return i < 0 ? DEFAULT_CAR_INDEX : i;
}
function driftReward(car, tier, chain) {
  return tier <= 0 ? 0 : DRIFT_TIER_BOOST[Math.min(tier, DRIFT_TIER_BOOST.length - 1)] * car.boostScale * (1 + 0.22 * chain);
}
export {
  CARS,
  DEFAULT_CAR_INDEX,
  carById,
  carIndexById,
  driftReward
};
