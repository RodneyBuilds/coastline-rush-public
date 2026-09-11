import * as THREE from "three";
const WARN = 1.2, MERGE = 2.6;
function laneIsClear(car, target, agents, length, player) {
  for (const other of agents) {
    if (other === car || other.leg !== car.leg || Math.abs(other.lane - target) > 1.8 && Math.abs((other.change?.target ?? other.lane) - target) > 1.8) continue;
    const gap = (other.t - car.t) * length, future = gap + (other.speed - car.speed) * (WARN + MERGE), clearance = other.mesh?.userData.heavy ? 29 : 20;
    if (Math.min(gap, future) < clearance && Math.max(gap, future) > -clearance) return false;
  }
  if (player?.leg === car.leg) {
    const gap = (player.s - car.t) * length, future = gap + (player.speed - car.speed) * (WARN + MERGE);
    if (Math.min(gap, future) < 35 && Math.max(gap, future) > -65) return false;
  }
  return true;
}
function laneChangeTick(car, agents, roads, player, dt, index = 0) {
  const allowed = player && player.carDef?.id !== "toy" && !player.easyMode, curve = roads.legs[car.leg], length = curve.getLength();
  if (car.laneWait = (car.laneWait ?? 8 + index * 1.7) - dt, !car.change) {
    if (!allowed || car.mesh.userData.heavy || car.leaving || car.mergeLeft > 0 || car.t < 0.12 || car.t > 0.8 || car.laneWait > 0) return;
    car.laneWait = 12 + index % 7 * 2;
    const ahead = curve.getTangentAt(Math.min(0.99, car.t + 65 / length)), behind = curve.getTangentAt(Math.max(0, car.t - 15 / length));
    if (ahead.angleTo(behind) > 0.075) return;
    const lanes = roads.lanes, current = lanes.reduce((a, v, i) => Math.abs(v - car.lane) < Math.abs(lanes[a] - car.lane) ? i : a, 0), target = [current + (index % 2 ? 1 : -1), current + (index % 2 ? -1 : 1)].filter((i) => i >= 0 && i < lanes.length).map((i) => lanes[i]).find((v) => laneIsClear(car, v, agents, length, player));
    if (target === void 0) return;
    if (car.change = { from: car.lane, target, time: 0 }, !car.signals) {
      const geometry = new THREE.SphereGeometry(0.13, 8, 6), material = new THREE.MeshBasicMaterial({ color: 16755480 });
      car.signals = [-1, 1].map((side) => {
        const group = new THREE.Group();
        for (const z of [-2, 2]) {
          const lamp = new THREE.Mesh(geometry, material);
          lamp.position.set(side * 0.91, 0.64, z), group.add(lamp);
        }
        return car.mesh.add(group), group;
      });
    }
  }
  const change = car.change;
  if (change.time < WARN && (!allowed || !laneIsClear(car, change.target, agents, length, player))) {
    car.change = null;
    for (const group of car.signals) group.visible = false;
    return;
  }
  change.time += dt;
  const direction = change.target > change.from ? 1 : -1;
  car.signals.forEach((group, i) => group.visible = (i ? 1 : -1) === direction && Math.floor(change.time * 3) % 2 === 0);
  const t = Math.max(0, Math.min(1, (change.time - WARN) / MERGE)), smooth = t * t * t * (10 + t * (-15 + 6 * t));
  if (car.lane = change.from + (change.target - change.from) * smooth, car.laneYaw = Math.atan((change.target - change.from) * 30 * t * t * (1 - t) * (1 - t) / (MERGE * car.speed)), t === 1) {
    car.change = null, car.laneWait = 16 + index % 7 * 2;
    for (const group of car.signals) group.visible = false;
  }
}
export {
  laneChangeTick,
  laneIsClear
};
