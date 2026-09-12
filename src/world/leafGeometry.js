import * as THREE from "three";
function random(seed) {
  let s = seed >>> 0;
  return () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296;
}
function crownBuilder() {
  const positions = [], normals = [], uvs = [], colors = [], indices = [], normal = new THREE.Vector3();
  function spray(center, right, up, cell, light) {
    const base = positions.length / 3, margin = 2 / 1024, u0 = cell % 2 * 0.5 + margin, v0 = Math.floor(cell / 2) * 0.5 + margin, uv = [[u0, v0], [u0 + 0.5 - 2 * margin, v0], [u0 + 0.5 - 2 * margin, v0 + 0.5 - 2 * margin], [u0, v0 + 0.5 - 2 * margin]], signs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) {
      const p = center.clone().addScaledVector(right, signs[i][0]).addScaledVector(up, signs[i][1]);
      positions.push(p.x, p.y, p.z), normal.set(p.x * 0.55, 0.65 + p.y * 0.13, p.z * 0.55).normalize(), normals.push(normal.x, normal.y, normal.z), uvs.push(...uv[i]), colors.push(light * 0.96, light, light * 0.91);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  function finish(half, low, high) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)), g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3)), g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)), g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)), g.setIndex(indices), g.computeBoundingBox();
    const b = g.boundingBox, scale = new THREE.Vector3(2 * half / (b.max.x - b.min.x), (high - low) / (b.max.y - b.min.y), 2 * half / (b.max.z - b.min.z)), mid = b.getCenter(new THREE.Vector3());
    return g.translate(-mid.x, -b.min.y, -mid.z), g.scale(scale.x, scale.y, scale.z), g.translate(0, low, 0), g.computeBoundingBox(), g.computeBoundingSphere(), g.userData.foliage = true, g;
  }
  return { spray, finish };
}
function coniferCrown(shape = 0) {
  const b = crownBuilder(), r = random(8101 + shape * 239), levels = 8 + shape;
  for (let tier = 0; tier < levels; tier++) {
    const t = tier / (levels - 1), y = -2.15 + t * 3.3 + (r() - 0.5) * 0.18, radius = (0.38 + 0.58 * Math.sin(Math.PI * (0.12 + t * 0.82))) * (0.78 + r() * 0.3), count = 7 + Math.floor((1 - t) * 3);
    for (let j = 0; j < count; j++) {
      const a = j * Math.PI * 2 / count + tier * 2.39996 + r() * 0.3, dir = new THREE.Vector3(Math.cos(a), -0.14, Math.sin(a)), center = dir.clone().multiplyScalar(radius * (0.45 + r() * 0.22));
      center.y += y + (r() - 0.5) * 0.26;
      const right = dir.clone().multiplyScalar(radius * 0.53 + 0.09), side = new THREE.Vector3(-Math.sin(a), 0.22, Math.cos(a)).multiplyScalar(radius * 0.36 + 0.09), light = 0.68 + t * 0.35 + r() * 0.16;
      b.spray(center, right, side, 2 + j % 2, light), b.spray(center, right, new THREE.Vector3(0, radius * 0.33 + 0.1, 0), 2 + tier % 2, light);
    }
  }
  return b.finish(1.058, -2.7, 1.615);
}
function broadleaf(shape, count, seed) {
  const b = crownBuilder(), r = random(seed + shape * 127);
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996 + r() * 0.5, height = -0.85 + r() * 1.7, reach = Math.sqrt(Math.max(0.1, 1 - height * height)) * (0.38 + r() * 0.62), lobes = [4, 7, 3, 6, 5][shape % 5], lobe = i % lobes * 2.39996 + shape * 0.7, center = new THREE.Vector3(Math.cos(a) * reach * 0.68 + Math.cos(lobe) * 0.32, height * (0.65 + shape % 3 * 0.15) + Math.sin(lobe * 1.7) * 0.28, Math.sin(a) * reach * 0.68 + Math.sin(lobe) * 0.32);
    center.x += Math.sin(height * 3 + shape) * 0.13;
    const size = 0.21 + r() * 0.19, yaw = r() * Math.PI * 2, right = new THREE.Vector3(Math.cos(yaw), (r() - 0.5) * 0.65, Math.sin(yaw)).multiplyScalar(size), up = new THREE.Vector3(-Math.sin(yaw) * 0.35, 0.85, Math.cos(yaw) * 0.35).multiplyScalar(size), light = 0.66 + (height + 0.85) * 0.18 + r() * 0.2;
    b.spray(center, right, up, i % 2, light);
  }
  const geometry = b.finish(1.3, -1.089, 1.089), widths = [1, 0.58, 0.8, 1, 0.72];
  return geometry.scale(widths[shape % 5], 1, widths[(shape + 2) % 5]), geometry.computeBoundingBox(), geometry.computeBoundingSphere(), geometry;
}
function treeCrown(shape = 0, detail = 0) {
  return broadleaf(shape, detail ? 140 : 100, 9173);
}
function bushCrown() {
  return broadleaf(0, 18, 197);
}
function mixedWoodlandCrown(shape = 0) {
  const g = treeCrown(shape);
  return g.scale(1.058 / 1.3, 4.315 / 2.178, 1.058 / 1.3), g.translate(0, -0.5425, 0), g.computeBoundingBox(), g.computeBoundingSphere(), g;
}
export {
  bushCrown,
  coniferCrown,
  mixedWoodlandCrown,
  treeCrown
};
