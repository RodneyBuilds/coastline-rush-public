import * as THREE from "three";
function closeRoadDeck(surface, depth = 0.85) {
  const p = surface.attributes.position, uv = surface.attributes.uv, n = p.count, positions = [], coords = [], indices = Array.from(surface.index.array);
  for (let layer = 0; layer < 2; layer++) for (let i = 0; i < n; i++) positions.push(p.getX(i), p.getY(i) - layer * depth, p.getZ(i)), coords.push(uv.getX(i), uv.getY(i));
  const topCount = indices.length;
  for (let i = 0; i < topCount; i += 3) indices.push(indices[i] + n, indices[i + 2] + n, indices[i + 1] + n);
  for (let i = 0; i < n - 2; i += 2) indices.push(i, i + 2, i + n, i + 2, i + 2 + n, i + n), indices.push(i + 1, i + 1 + n, i + 3, i + 3, i + 1 + n, i + 3 + n);
  indices.push(0, n, 1, 1, n, n + 1, n - 2, n - 1, 2 * n - 2, n - 1, 2 * n - 1, 2 * n - 2);
  const geo = new THREE.BufferGeometry();
  return geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)), geo.setAttribute("uv", new THREE.Float32BufferAttribute(coords, 2)), geo.setIndex(indices), geo.computeVertexNormals(), surface.dispose(), geo;
}
export {
  closeRoadDeck
};
