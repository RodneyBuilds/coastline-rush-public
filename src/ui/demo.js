import * as THREE from "three";
class DemoDrive {
  constructor() {
    this.distance = 35, this.time = 0, this.tangent = new THREE.Vector3(), this.lastStage = null;
  }
  update(dt, { P, world, sim, chase, lighting, reducedMotion }) {
    const curve = world.roads.legs.main, len = curve.getLength();
    this.lastStage !== world && (this.lastStage = world, this.distance = 35), this.time += dt, reducedMotion || (this.distance += dt * 28), this.distance > len * 0.76 && (this.distance = 35), P.leg = "main", P.s = this.distance / len, P.lateral = 0, curve.getPointAt(P.s, P.pos), curve.getTangentAt(P.s, this.tangent);
    const ahead = curve.getTangentAt(Math.min(0.99, P.s + 0.01)), angle = Math.atan2(this.tangent.x, this.tangent.z), bend = Math.atan2(Math.sin(Math.atan2(ahead.x, ahead.z) - angle), Math.cos(Math.atan2(ahead.x, ahead.z) - angle));
    P.heading = angle + THREE.MathUtils.clamp(bend * 1.4, -0.2, 0.2), P.velDir = angle, P.slip = P.heading - angle, P.speed = reducedMotion ? 0 : 28, P.distance = this.distance, P.drifting = Math.abs(P.slip) > 0.09, sim._placeMesh(), chase.update(P, curve, dt), lighting.follow(P.pos), world.landmarks.update(P.pos);
  }
}
export {
  DemoDrive
};
