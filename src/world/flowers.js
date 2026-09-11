import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
function flowerClump() {
  const parts = [], painted = (g2, hex) => {
    const c = new THREE.Color(hex), a = [];
    for (let i = 0; i < g2.attributes.position.count; i++) a.push(c.r, c.g, c.b);
    g2.setAttribute("color", new THREE.Float32BufferAttribute(a, 3)), parts.push(g2);
  }, petals = [16248265, 15314493, 11835604, 15984335, 15110786];
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.39996, x = Math.cos(angle) * 0.3, z = Math.sin(angle) * 0.3, h = 0.35 + i * 0.065, stem = new THREE.CylinderGeometry(0.012, 0.018, h, 4);
    stem.translate(x, h / 2, z), painted(stem, 5731142);
    for (let j = 0; j < 5; j++) {
      const a = j * Math.PI * 2 / 5, petal = new THREE.CircleGeometry(0.072, 6);
      petal.scale(1, 0.63, 1), petal.rotateZ(a), petal.rotateX(-Math.PI / 2 + 0.2), petal.translate(x + Math.cos(a) * 0.045, h, z + Math.sin(a) * 0.045), painted(petal, petals[i]);
    }
    const centre = new THREE.CircleGeometry(0.032, 7);
    centre.rotateX(-Math.PI / 2), centre.translate(x, h + 5e-3, z), painted(centre, 13869355);
  }
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return g.computeBoundingBox(), g.computeBoundingSphere(), g;
}
export {
  flowerClump
};
