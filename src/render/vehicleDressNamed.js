import * as THREE from "three";
const NAMED_PARTS = [[/tyre|tire/i, "rubber"], [/(tail|brake|rear).*(light|lamp)|lights_red/i, "lamp-tail"], [/(signal|turn|indicator).*(light|lamp)|turn_signal|\bleds?\b/i, "lamp-signal"], [/(head|front|projector).*(light|lamp)|projector/i, "lamp-head"], [/glass|window|screen/i, "glass"], [/chrome/i, "chrome"], [/carbon/i, "carbon"], [/leather|carpet|interior|fabric|seat/i, "interior"], [/rim|wheel/i, "rim"], [/brake|caliper/i, "caliper"], [/plastic|grill|wiper/i, "plastic"], [/metal|steel|alloy|nut/i, "metal"], [/body|paint|shell/i, "paint"]], LAMP_KINDS =  new Set(["lamp-tail", "lamp-head", "lamp-signal"]);
function namedMaterial(kind, own, map = null) {
  const made = buildNamed(kind, map ? new THREE.Color(16777215) : own);
  return map && (made.map = map, made.color.set(16777215)), made;
}
function buildNamed(kind, own) {
  switch (kind) {
    case "paint":
      return new THREE.MeshPhysicalMaterial({ color: own, metalness: 0.22, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.15 });
    case "glass":
      return new THREE.MeshPhysicalMaterial({ color: 1317924, metalness: 0.15, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6, transparent: true, opacity: 0.82 });
    case "rubber":
      return new THREE.MeshStandardMaterial({ color: 1316378, metalness: 0, roughness: 0.94, envMapIntensity: 0.3 });
    case "chrome":
      return new THREE.MeshStandardMaterial({ color: 15922422, metalness: 1, roughness: 0.12, envMapIntensity: 1.4 });
    case "rim":
      return new THREE.MeshStandardMaterial({ color: 12765132, metalness: 0.92, roughness: 0.26, envMapIntensity: 1.25 });
    case "caliper":
      return new THREE.MeshStandardMaterial({ color: own, metalness: 0.4, roughness: 0.45, envMapIntensity: 0.9 });
    case "carbon":
      return new THREE.MeshPhysicalMaterial({ color: 1382171, metalness: 0.35, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 });
    case "interior":
      return new THREE.MeshStandardMaterial({ color: own.clone().multiplyScalar(0.55), metalness: 0, roughness: 0.85, envMapIntensity: 0.25 });
    case "plastic":
      return new THREE.MeshStandardMaterial({ color: own.clone().multiplyScalar(0.8), metalness: 0.05, roughness: 0.62, envMapIntensity: 0.6 });
    case "metal":
      return new THREE.MeshStandardMaterial({ color: own, metalness: 0.9, roughness: 0.38, envMapIntensity: 1.1 });
    case "lamp-tail":
      return new THREE.MeshStandardMaterial({ color: 9309964, emissive: 6949641, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.1 });
    case "lamp-head":
      return new THREE.MeshStandardMaterial({ color: 16052712, emissive: 2762272, emissiveIntensity: 0.4, roughness: 0.08, metalness: 0.2, envMapIntensity: 1.5 });
    case "lamp-signal":
      return new THREE.MeshStandardMaterial({ color: 14190122, emissive: 7027981, emissiveIntensity: 0.5, roughness: 0.25, metalness: 0.1 });
    default:
      return new THREE.MeshStandardMaterial({ color: own, metalness: 0.2, roughness: 0.5, envMapIntensity: 0.9 });
  }
}
function dressNamedVehicle(model, paint = null) {
  const shared =  new Map();
  if (model.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const next = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => {
      const label = `${m.name || ""} ${o.name || ""}`, hit = NAMED_PARTS.find(([re]) => re.test(label)), kind = hit ? hit[1] : "other", own = m.color ? m.color.clone() : new THREE.Color(10133670), map = m.map || null, key = `${kind}:${own.getHexString()}:${map ? map.uuid : ""}`;
      let made = shared.get(key);
      return made || (made = namedMaterial(kind, own, map), made.name = m.name || kind, made.userData.kind = LAMP_KINDS.has(kind) ? "lamp" : kind, kind === "paint" && !map && (made.userData.shell = true), shared.set(key, made)), made;
    });
    o.material = Array.isArray(o.material) ? next : next[0], next.some((m) => m.userData.kind === "lamp") && !/^lamp-/.test(o.name || "") && (o.name = `lamp-${o.name || "unnamed"}`);
  }), paint !== null) for (const m of shared.values()) m.userData.shell && m.color.set(paint);
  return [...shared.values()];
}
export {
  dressNamedVehicle
};
