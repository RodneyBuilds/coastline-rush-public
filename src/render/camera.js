import * as THREE from "three";
import { angleDiff } from "../physics/drift.js";
const CAM_SETTLED = 1e-3, CAM = Object.freeze({ dist: 7.4, height: 2.5, roofClearance: 0.35, lookAhead: 15, lookUp: 1.1, yawTau: 0.12, fovBase: 62, fovSpeedGain: 12, fovBoost: 5, fovTau: 0.2 }), _fwd = new THREE.Vector3(), _look = new THREE.Vector3(), _ahead = new THREE.Vector3(), _box = new THREE.Box3(), _part = new THREE.Box3(), _quat = new THREE.Quaternion();
function heightForRoof(roofHeight) {
  const r = CAM.dist / (CAM.dist + CAM.lookAhead), wanted = (roofHeight + CAM.roofClearance - CAM.lookUp * r) / (1 - r);
  return Math.max(CAM.height, wanted);
}
function sightLineAtCar(height) {
  const r = CAM.dist / (CAM.dist + CAM.lookAhead);
  return height * (1 - r) + CAM.lookUp * r;
}
function carRoofHeight(mesh) {
  return _quat.copy(mesh.quaternion), mesh.quaternion.identity(), mesh.updateMatrixWorld(true), _box.makeEmpty(), mesh.traverse((o) => {
    !o.isMesh || !o.geometry || /wheel|tyre|rim/i.test(o.name || "") || o.name === "contact-shadow" || (o.geometry.computeBoundingBox(), _part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld), _box.union(_part));
  }), _box.isEmpty() && _box.setFromObject(mesh), mesh.quaternion.copy(_quat), mesh.updateMatrixWorld(true), _box.max.y - _box.min.y;
}
class ChaseCamera {
  constructor(camera) {
    this.camera = camera, this.pos = new THREE.Vector3(0, 3, 10), this.yaw = Math.PI, this.fov = CAM.fovBase, this.shake = 0, this.height = CAM.height, this.shakeEnabled = true;
  }
  snapTo(P) {
    this.yaw = P.velDir, this.shake = 0, this.fov = CAM.fovBase;
  }
  settle(P, curve, dt = 1 / 60, maxSteps = 600) {
    for (let i = 0; i < maxSteps; i++) if (this.update(P, curve, dt), Math.abs(angleDiff(P.velDir, this.yaw)) <= CAM_SETTLED) return i + 1;
    return maxSteps;
  }
  fitToCar(mesh) {
    mesh && (this.height = heightForRoof(carRoofHeight(mesh)));
  }
  addShake(amount) {
    this.shakeEnabled && (this.shake = Math.max(this.shake, amount));
  }
  update(P, curve, dt) {
    const speedNorm = P.speed / P.carDef.maxSpeed, kYaw = 1 - Math.exp(-dt / CAM.yawTau);
    this.yaw += angleDiff(P.velDir, this.yaw) * kYaw;
    const fwd = _fwd.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.pos.copy(P.pos).addScaledVector(fwd, -CAM.dist), this.pos.y = P.pos.y + this.height, this.camera.position.copy(this.pos), this.shake > 0.01 ? (this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.4, this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.25, this.shake *= Math.pow(0.02, dt)) : this.shake = 0;
    const look = _look.copy(P.pos).addScaledVector(fwd, CAM.lookAhead);
    if (look.y = P.pos.y + CAM.lookUp, curve) {
      const s = THREE.MathUtils.clamp(P.s + CAM.lookAhead / curve.getLength(), 0, 1), ahead = curve.getPointAt(s, _ahead);
      look.y = ahead.y + CAM.lookUp;
    }
    this.camera.lookAt(look);
    const fovTarget = CAM.fovBase + speedNorm * CAM.fovSpeedGain + (P.boost > 0.5 ? CAM.fovBoost : 0);
    this.fov += (fovTarget - this.fov) * (1 - Math.exp(-dt / CAM.fovTau)), this.camera.fov = this.fov, this.camera.updateProjectionMatrix();
  }
  menuOrbit(seconds, frame, ambient = true) {
    const t = ambient ? seconds : 0, fx = Math.sin(frame.heading), fz = Math.cos(frame.heading), sx = Math.cos(frame.heading), sz = -Math.sin(frame.heading);
    ((fwd, side, up) => this.camera.position.set(frame.x + fx * fwd + sx * side, frame.y + up, frame.z + fz * fwd + sz * side))(140 + Math.cos(t * 0.05) * 24, -14 - Math.sin(t * 0.06) * 6, 4.5 + Math.sin(t * 0.1) * 1.2), this.camera.lookAt(frame.x + fx * 360 + sx * 260, frame.y + 6, frame.z + fz * 360 + sz * 260), this.camera.fov = 58, this.camera.updateProjectionMatrix();
  }
}
export {
  CAM,
  CAM_SETTLED,
  ChaseCamera,
  carRoofHeight,
  heightForRoof,
  sightLineAtCar
};
