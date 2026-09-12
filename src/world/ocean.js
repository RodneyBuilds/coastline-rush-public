import * as THREE from "three";
import { WATERLINE } from "../physics/constants.js";
import { waterNormalTexture } from "../render/materials.js";
import { makeWaterMaterial } from "../render/waterShader.js";
const SEABED_Y = WATERLINE - 16, OCEAN_SIZE = 26e3, SWELL_TILE = 173;
class Ocean {
  constructor(scene) {
    this.scene = scene, this.normal = waterNormalTexture(), this.normal.repeat.set(OCEAN_SIZE / SWELL_TILE, OCEAN_SIZE / SWELL_TILE), this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE), new THREE.MeshStandardMaterial({ color: 1926528, roughness: 0.46, metalness: 0.06, envMapIntensity: 0.55, normalMap: this.normal, normalScale: new THREE.Vector2(0.45, 0.45) })), makeWaterMaterial(this.mesh.material), this.mesh.rotation.x = -Math.PI / 2, this.mesh.position.set(0, WATERLINE, -600), this.mesh.renderOrder = -1, scene.add(this.mesh), this.animated = true, this.time = 0;
  }
  setTerrain(terrain) {
    const u = this.mesh.material.userData.waterUniforms;
    if (!u) return;
    const field = terrain && terrain.depthField ? terrain.depthField() : null;
    if (!field) {
      u.uHasField.value = 0;
      return;
    }
    u.uDepthMap.value = field.texture, u.uFieldMin.value.copy(field.min), u.uFieldSize.value.copy(field.size), u.uSeabed.value = SEABED_Y, u.uWaterline.value = WATERLINE, u.uHasField.value = 1;
  }
  update(dt) {
    if (!this.animated) return;
    this.time += dt;
    const u = this.mesh.material.userData.waterUniforms;
    u && (u.uTime.value = this.time);
  }
  dispose() {
    this.scene.remove(this.mesh), this.mesh.geometry.dispose(), this.mesh.material.dispose(), this.normal.dispose();
  }
}
export {
  Ocean,
  SEABED_Y
};
