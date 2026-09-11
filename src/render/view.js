import * as THREE from "three";
const CAR_RADIUS = 8, BEHIND_MARGIN = 40;
class Viewer {
  constructor() {
    this.camera = null, this.frustum = new THREE.Frustum(), this._mvp = new THREE.Matrix4(), this._fwd = new THREE.Vector3(), this._rel = new THREE.Vector3(), this._wp = new THREE.Vector3(), this._sphere = new THREE.Sphere(new THREE.Vector3(), CAR_RADIUS), this.tick = 0, this.ownedByPlayer = false, this.playerLeg = null, this.playerS = 0;
  }
  begin(camera, player) {
    return this.player = player, this.camera = camera, camera.updateMatrixWorld(), this._mvp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), this.frustum.setFromProjectionMatrix(this._mvp), camera.getWorldDirection(this._fwd), this.tick++, this.playerLeg = player ? player.leg : null, this.playerS = player ? player.s : 0, this;
  }
  aheadOf(obj) {
    return obj.getWorldPosition(this._wp), this._rel.copy(this._wp).sub(this.camera.position).dot(this._fwd);
  }
  canSee(obj) {
    if (!this.camera) return true;
    for (let o = obj; o; o = o.parent) if (!o.visible) return false;
    return this.aheadOf(obj) < -BEHIND_MARGIN ? false : this.frustum.intersectsSphere(this._sphere.set(this._wp, CAR_RADIUS));
  }
}
export {
  Viewer
};
