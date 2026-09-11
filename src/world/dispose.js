function disposeTree(root, opts = {}) {
  if (!root) return;
  const all = !!opts.allMaterials, keepGeometry = !!(root.userData && root.userData.sharedGeometry), owned = new Set(Array.isArray(root.userData && root.userData.ownedMaterials) ? root.userData.ownedMaterials : []), geometries =  new Set(), materials =  new Set();
  root.traverse((o) => {
    let borrowed = keepGeometry;
    for (let p = o; p && p !== root && !borrowed; p = p.parent) borrowed = !!p.userData?.sharedGeometry;
    if (o.geometry && !borrowed && !geometries.has(o.geometry) && (geometries.add(o.geometry), o.geometry.dispose()), !!o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) !all && !owned.has(m) || materials.has(m) || (materials.add(m), disposeMaterial(m));
  });
}
function disposeMaterial(m) {
  for (const k of ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "aoMap", "alphaMap"]) m[k] && typeof m[k].dispose == "function" && m[k].dispose();
  m.dispose();
}
export {
  disposeTree
};
