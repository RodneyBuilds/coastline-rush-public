function instanceBounds(box, matrix, target) {
  const e = matrix.elements, x = (box.min.x + box.max.x) * 0.5, y = (box.min.y + box.max.y) * 0.5, z = (box.min.z + box.max.z) * 0.5, hx = (box.max.x - box.min.x) * 0.5, hy = (box.max.y - box.min.y) * 0.5, hz = (box.max.z - box.min.z) * 0.5, cx = e[0] * x + e[4] * y + e[8] * z + e[12], cy = e[1] * x + e[5] * y + e[9] * z + e[13], cz = e[2] * x + e[6] * y + e[10] * z + e[14], rx = Math.abs(e[0]) * hx + Math.abs(e[4]) * hy + Math.abs(e[8]) * hz, ry = Math.abs(e[1]) * hx + Math.abs(e[5]) * hy + Math.abs(e[9]) * hz, rz = Math.abs(e[2]) * hx + Math.abs(e[6]) * hy + Math.abs(e[10]) * hz;
  return target.min.set(cx - rx, cy - ry, cz - rz), target.max.set(cx + rx, cy + ry, cz + rz), target;
}
export {
  instanceBounds
};
