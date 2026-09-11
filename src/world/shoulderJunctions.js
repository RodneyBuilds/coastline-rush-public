function shoulderRoadSamples(roads) {
  return Object.fromEntries(roads.legNames.map((leg) => {
    const curve = roads.legs[leg], steps = Math.ceil(curve.getLength() / 4), points = [];
    for (let i = 0; i <= steps; i++) {
      const s = i / steps, p = curve.getPointAt(s);
      points.push({ x: p.x, z: p.z, half: roads.widthAt(leg, s) / 2 + 2.5 });
    }
    return [leg, points];
  }));
}
function clearShoulderJunctions(geometry, leg, samples) {
  const others = Object.entries(samples).filter(([name]) => name !== leg).flatMap(([, points]) => points);
  if (!others.length) return geometry;
  const p = geometry.attributes.position, index = geometry.index.array, kept = [];
  for (let i = 0; i < index.length; i += 6) {
    let minX = 1 / 0, minZ = 1 / 0, maxX = -1 / 0, maxZ = -1 / 0;
    for (let j = 0; j < 6; j++) {
      const v = index[i + j], x = p.getX(v), z = p.getZ(v);
      minX = Math.min(minX, x), maxX = Math.max(maxX, x), minZ = Math.min(minZ, z), maxZ = Math.max(maxZ, z);
    }
    if (!others.some((r) => {
      const dx = Math.max(minX - r.x, 0, r.x - maxX), dz = Math.max(minZ - r.z, 0, r.z - maxZ);
      return dx * dx + dz * dz < r.half * r.half;
    })) for (let j = 0; j < 6; j++) kept.push(index[i + j]);
  }
  return geometry.setIndex(kept), geometry;
}
export {
  clearShoulderJunctions,
  shoulderRoadSamples
};
