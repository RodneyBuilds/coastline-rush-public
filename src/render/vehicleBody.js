import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const ease = (t) => {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
function extrudeProfile(pts, halfWidth, bevel) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const depth = Math.max(0.02, halfWidth * 2 - bevel * 2), g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12, steps: 1 });
  return g.rotateY(-Math.PI / 2), g.translate(halfWidth - bevel, 0, 0), g.computeVertexNormals(), g;
}
function archOpening(out, centreZ, radius, floor, bevel) {
  const rise = radius * 2.12 + bevel - floor, half = radius * 1.1 + bevel;
  for (let i = 0; i <= 20; i++) {
    const a = i / 20 * Math.PI;
    out.push([centreZ - half * Math.cos(a), floor + rise * Math.sin(a)]);
  }
}
function bodyShell(p) {
  const B = p.bevel, L = p.length - B * 2, z = (f) => L * (0.5 - f), floor = p.sill + B, belt = p.sill + p.beltHeight - B, bonnet = p.sill + p.bonnetHeight - B, deck = p.sill + p.deckHeight - B, pts = [];
  return pts.push([z(0), floor + 0.1]), pts.push([z(4e-3), bonnet - 0.16]), pts.push([z(0.02), bonnet - 0.06]), pts.push([z(0.05), bonnet - 0.015]), pts.push([z(0.1), bonnet]), pts.push([z(0.18), bonnet + 0.012]), pts.push([z(0.26), bonnet + 0.03]), pts.push([z(0.3), bonnet + 0.06]), pts.push([z(p.cowlT), belt]), pts.push([z(p.deckT - 0.2), belt + 0.012]), pts.push([z(p.deckT), belt]), pts.push([z(p.deckT + 0.05), deck + 0.03]), pts.push([z(p.deckT + 0.11), deck]), pts.push([z(0.965), deck - 0.02]), pts.push([z(0.996), deck - 0.1]), pts.push([z(1), deck - 0.2]), pts.push([z(1), floor + 0.1]), pts.push([z(0.955), floor]), archOpening(pts, z(p.rearAxleT), p.wheelR, floor, B), pts.push([z(0.52), floor]), pts.push([z(0.44), floor]), archOpening(pts, z(p.frontAxleT), p.wheelR, floor, B), pts.push([z(0.045), floor]), extrudeProfile(pts, p.halfWidth, B);
}
function greenhouse(p) {
  const B = p.bevel * 0.5, L = p.length, z = (f) => L * (0.5 - f), belt = p.sill + p.beltHeight, pts = [[z(p.cowlT) + B, belt - 0.06 + B], [z(p.screenTopT) + B, p.roofHeight - B], [z(p.roofBackT) - B, p.roofHeight - B], [z(p.deckT) - B, belt - 0.06 + B]];
  return extrudeProfile(pts, p.glassHalfWidth, B);
}
function roofPanel(p) {
  const L = p.length, z = (f) => L * (0.5 - f), B = p.bevel * 0.32, pts = [[z(p.screenTopT) + B * 2, p.roofHeight - 0.05], [z(p.screenTopT) + B * 2, p.roofHeight - B], [z(p.roofBackT) - B * 2, p.roofHeight - B], [z(p.roofBackT) - B * 2, p.roofHeight - 0.05]];
  return extrudeProfile(pts, p.glassHalfWidth * 1.015, B);
}
function archGeometry(radius, width) {
  const g = new THREE.TorusGeometry(radius * 1.13, width * 0.38, 14, 40, Math.PI * 1.02);
  return g.rotateY(Math.PI / 2), g.rotateZ(-Math.PI * 0.03), g;
}
function bumper(p, zAt, depth) {
  const g = new THREE.BoxGeometry(p.halfWidth * 1.8, 0.22, depth, 6, 3, 3);
  return g.translate(0, 0, zAt), g;
}
function tyreGeometry(R, W, rimR) {
  const profile = [new THREE.Vector2(rimR, -W * 0.78), new THREE.Vector2(R * 0.84, -W * 1), new THREE.Vector2(R * 0.98, -W * 0.9), new THREE.Vector2(R, -W * 0.52), new THREE.Vector2(R, W * 0.52), new THREE.Vector2(R * 0.98, W * 0.9), new THREE.Vector2(R * 0.84, W * 1), new THREE.Vector2(rimR, W * 0.78)], g = new THREE.LatheGeometry(profile, 40);
  return g.rotateZ(Math.PI / 2), g;
}
function contactShadow(length, width) {
  const m = new THREE.Mesh(contactPlane(), contactMaterial());
  return m.scale.set(width * 2.3, length * 1.06, 1), m.rotation.x = -Math.PI / 2, m.position.y = 0.02, m.renderOrder = -1, m.name = "contact-shadow", m;
}
let _contactPlane = null;
function contactPlane() {
  return _contactPlane || (_contactPlane = new THREE.PlaneGeometry(1, 1)), _contactPlane;
}
let _contactMaterial = null;
function contactMaterial() {
  if (_contactMaterial) return _contactMaterial;
  const S = 128, c = document.createElement("canvas");
  c.width = c.height = S;
  const g2 = c.getContext("2d"), grad = g2.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, "rgba(0,0,0,0.55)"), grad.addColorStop(0.55, "rgba(0,0,0,0.28)"), grad.addColorStop(1, "rgba(0,0,0,0)"), g2.fillStyle = grad, g2.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  return tex.colorSpace = THREE.SRGBColorSpace, _contactMaterial = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9, blending: THREE.NormalBlending }), _contactMaterial;
}
const PROPORTIONS = Object.freeze({ gt: { length: 4.4, halfWidth: 0.95, sill: 0.24, bevel: 0.045, bonnetHeight: 0.44, beltHeight: 0.62, deckHeight: 0.56, cowlT: 0.34, deckT: 0.76, screenTopT: 0.47, roofBackT: 0.63, roofHeight: 1.3, glassHalfWidth: 0.78, wheelR: 0.35, wheelW: 0.14, rimR: 0.22, track: 0.94, frontAxleT: 0.2, rearAxleT: 0.8, paint: 14488850, roughness: 0.28, clearcoat: 1 }, crv: { length: 4.55, halfWidth: 0.82, sill: 0.32, bevel: 0.045, bonnetHeight: 0.52, beltHeight: 0.74, deckHeight: 0.74, cowlT: 0.31, deckT: 0.84, screenTopT: 0.45, roofBackT: 0.76, roofHeight: 1.66, glassHalfWidth: 0.72, wheelR: 0.37, wheelW: 0.15, rimR: 0.23, track: 0.78, frontAxleT: 0.19, rearAxleT: 0.8, paint: 1989245, roughness: 0.34, clearcoat: 0.9 }, toy: { length: 4.05, halfWidth: 0.84, sill: 0.36, bevel: 0.035, bonnetHeight: 0.54, beltHeight: 0.76, deckHeight: 0.74, cowlT: 0.3, deckT: 0.84, screenTopT: 0.42, roofBackT: 0.74, roofHeight: 1.62, glassHalfWidth: 0.72, wheelR: 0.44, wheelW: 0.2, rimR: 0.26, track: 0.8, frontAxleT: 0.21, rearAxleT: 0.79, paint: 16758318, roughness: 0.42, clearcoat: 0.6 } });
function buildVehicle(carId, paint) {
  const p = PROPORTIONS[carId] || PROPORTIONS.crv, g = new THREE.Group(), bodyMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(paint === void 0 ? p.paint : paint), metalness: 0.22, roughness: p.roughness, clearcoat: p.clearcoat, clearcoatRoughness: 0.05, envMapIntensity: 1.15 }), glassMat = new THREE.MeshPhysicalMaterial({ color: 1779248, metalness: 0.15, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.5, transparent: false, opacity: 1 }), tyreMat = new THREE.MeshStandardMaterial({ color: 1711135, metalness: 0, roughness: 0.92, envMapIntensity: 0.35 }), rimMat = new THREE.MeshStandardMaterial({ color: 12172996, metalness: 0.92, roughness: 0.3, envMapIntensity: 1.2 }), lampRed = new THREE.MeshStandardMaterial({ color: 10229522, emissive: 7212812, emissiveIntensity: 0.55, roughness: 0.24, metalness: 0.1 }), lampClear = new THREE.MeshStandardMaterial({ color: 15921126, roughness: 0.12, metalness: 0.2, envMapIntensity: 1.3 }), body = new THREE.Mesh(bodyShell(p), bodyMat);
  body.name = "body", body.castShadow = true, g.add(body);
  const glass = new THREE.Mesh(greenhouse(p), glassMat);
  glass.name = "glass", glass.castShadow = true, g.add(glass);
  const roof = new THREE.Mesh(roofPanel(p), bodyMat);
  roof.name = "roof", roof.castShadow = true, g.add(roof);
  const addMerged = (parts, mat, name) => {
    const m = new THREE.Mesh(mergeGeometries(parts, false), mat);
    m.name = name, m.castShadow = true, g.add(m);
    for (const q of parts) q.dispose();
  }, archParts = [], wheels = [];
  for (const [sx, axleT] of [[1, p.frontAxleT], [-1, p.frontAxleT], [1, p.rearAxleT], [-1, p.rearAxleT]]) {
    const z = p.length * (0.5 - axleT), x = p.track * sx, pivot = new THREE.Group(), spin = new THREE.Group();
    pivot.name = `wheel-${axleT === p.frontAxleT ? "front" : "rear"}-${sx}`, pivot.position.set(x, p.wheelR, z), pivot.add(spin), g.add(pivot);
    const tyre = new THREE.Mesh(tyreGeometry(p.wheelR, p.wheelW, p.rimR), tyreMat);
    tyre.castShadow = true, spin.add(tyre);
    const parts = [], ring = new THREE.TorusGeometry(p.rimR * 0.91, 0.025, 6, 24);
    ring.rotateY(Math.PI / 2), ring.translate(sx * p.wheelW * 0.87, 0, 0), parts.push(ring);
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.BoxGeometry(0.035, p.rimR * 1.7, 0.035);
      spoke.rotateX(i * Math.PI / 3), spoke.translate(sx * p.wheelW * 0.87, 0, 0), parts.push(spoke);
    }
    const hub = new THREE.CylinderGeometry(0.055, 0.055, p.wheelW * 1.8, 12);
    hub.rotateZ(Math.PI / 2), parts.push(hub);
    const rims = new THREE.Mesh(mergeGeometries(parts, false), rimMat);
    spin.add(rims), parts.forEach((part) => part.dispose()), wheels.push({ pivot, spin, front: axleT === p.frontAxleT });
    const arch = archGeometry(p.wheelR, p.wheelW * 0.52);
    sx < 0 && arch.rotateY(Math.PI), arch.translate((p.halfWidth - 0.015) * sx, p.wheelR, z), archParts.push(arch);
  }
  addMerged(archParts, carId === "toy" ? tyreMat : bodyMat, "arches"), g.userData.turnWheels = (distance, steer) => {
    for (const w of wheels) w.spin.rotation.x = distance / p.wheelR, w.pivot.rotation.y = w.front ? THREE.MathUtils.clamp(steer, -1, 1) * 0.45 : 0;
  };
  const lampPair = (w, h, y, z, round = false) => {
    const parts = [-1, 1].map((side) => {
      const lens = round ? new THREE.CylinderGeometry(0.105, 0.105, 0.065, 20) : new THREE.BoxGeometry(w, h, 0.07);
      return round && lens.rotateX(Math.PI / 2), lens.translate(0.56 * side, y, z), lens;
    }), merged = mergeGeometries(parts, false);
    return parts.forEach((part) => part.dispose()), merged;
  }, tails = new THREE.Mesh(lampPair(0.4, 0.12, p.sill + p.deckHeight * 0.6, -p.length * 0.5 + 0.03), lampRed);
  tails.name = "lamp-tail", g.add(tails);
  const heads = new THREE.Mesh(lampPair(carId === "gt" ? 0.45 : 0.34, carId === "gt" ? 0.075 : 0.11, p.sill + p.bonnetHeight * 0.62, p.length * 0.5 - 0.015, carId === "toy"), lampClear);
  heads.name = "lamp-head", g.add(heads);
  const bumperMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(paint === void 0 ? p.paint : paint).multiplyScalar(0.92), metalness: 0.18, roughness: p.roughness + 0.14, envMapIntensity: 0.95 }), bars = new THREE.Mesh(mergeGeometries([[-p.length * 0.5 + 0.16, 0.3], [p.length * 0.5 - 0.16, 0.3]].map(([zAt, d]) => {
    const b2 = bumper(p, zAt, d);
    return b2.translate(0, p.sill + 0.14, 0), b2;
  }), false), bumperMat);
  bars.name = "bumpers", bars.castShadow = true, g.add(bars);
  const darkParts = [], brightParts = [], paintedParts = [], box = (parts, w, h, d, x, y, z) => {
    const q = new THREE.BoxGeometry(w, h, d);
    q.translate(x, y, z), parts.push(q);
  }, belt = p.sill + p.beltHeight, cz = (f) => p.length * (0.5 - f);
  for (const side of [-1, 1]) {
    const x = side * (p.glassHalfWidth + 7e-3);
    box(darkParts, 0.035, p.roofHeight - belt, 0.085, x, (p.roofHeight + belt) / 2, cz(0.59));
    for (const [f1, f2] of [[p.cowlT, p.screenTopT], [p.deckT, p.roofBackT]]) {
      const start = new THREE.Vector3(x, belt, cz(f1)), end = new THREE.Vector3(x, p.roofHeight, cz(f2)), pillar = new THREE.CylinderGeometry(0.034, 0.034, start.distanceTo(end), 6);
      pillar.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize())), pillar.translate(...start.add(end).multiplyScalar(0.5).toArray()), paintedParts.push(pillar);
    }
    box(darkParts, 0.026, 0.045, cz(p.cowlT) - cz(p.deckT), side * (p.halfWidth + 5e-3), belt - 0.025, (cz(p.cowlT) + cz(p.deckT)) / 2), box(darkParts, 0.035, 0.085, p.length * 0.58, side * (p.halfWidth - 0.01), p.sill + 0.025, 0);
    for (const fraction of carId === "gt" ? [0.57] : [0.48, 0.71]) box(brightParts, 0.035, 0.028, 0.16, side * (p.halfWidth + 0.014), belt - 0.12, cz(fraction)), box(darkParts, 0.01, 0.37, 0.014, side * (p.halfWidth + 9e-3), belt - 0.29, cz(fraction + 0.035));
    box(paintedParts, 0.15, 0.11, 0.2, side * (p.halfWidth + 0.06), belt + 0.035, cz(p.cowlT + 0.07)), box(brightParts, 0.015, 0.065, 0.14, side * (p.halfWidth + 0.142), belt + 0.035, cz(p.cowlT + 0.07)), carId !== "gt" && box(darkParts, 0.06, 0.055, p.length * 0.28, side * p.glassHalfWidth * 0.8, p.roofHeight + 0.026, cz(0.59));
  }
  box(darkParts, p.halfWidth * 0.95, 0.19, 0.03, 0, p.sill + 0.24, p.length / 2 + 3e-3), box(darkParts, p.halfWidth * 1.55, 0.095, 0.03, 0, p.sill + 0.08, -p.length / 2 - 3e-3);
  for (let i = -3; i <= 3; i++) box(brightParts, 0.015, 0.12, 0.015, i * 0.12, p.sill + 0.24, p.length / 2 + 0.021);
  return box(darkParts, 0.38, 0.12, 0.025, 0, p.sill + 0.32, -p.length / 2 - 0.025), carId === "gt" && box(paintedParts, p.halfWidth * 1.65, 0.045, 0.16, 0, belt + 0.06, cz(0.91)), carId === "toy" && (box(darkParts, p.halfWidth * 1.7, 0.13, 0.19, 0, p.sill + 0.1, cz(0.97)), box(brightParts, 0.7, 0.06, 0.09, 0, p.sill + 0.02, cz(0.98))), addMerged(darkParts, tyreMat, "panel-trim"), addMerged(brightParts, rimMat, "hardware"), addMerged(paintedParts, bodyMat, "pillars-mirrors"), g.add(contactShadow(p.length, p.halfWidth)), g.userData.generated = true, g.userData.ownedMaterials = [bodyMat, glassMat, tyreMat, rimMat, lampRed, lampClear, bumperMat], g;
}
let _wheelMats = null;
function roadWheelMaterials() {
  return _wheelMats || (_wheelMats = { tyre: new THREE.MeshStandardMaterial({ color: 1447964, metalness: 0, roughness: 0.93, envMapIntensity: 0.32 }), rim: new THREE.MeshStandardMaterial({ color: 13160148, metalness: 0.72, roughness: 0.32, envMapIntensity: 1.35 }) }, _wheelMats.tyre.userData.kind = "rubber", _wheelMats.rim.userData.kind = "rim", _wheelMats);
}
const SPOKES = 5;
function roadWheelGeometry(radius, halfWidth) {
  const rimR = radius * 0.68, tyre = tyreGeometry(radius, halfWidth, rimR), parts = [], barrel = new THREE.CylinderGeometry(rimR, rimR, halfWidth * 1.35, 16, 1, true);
  barrel.rotateZ(Math.PI / 2), parts.push(barrel);
  const face = new THREE.CylinderGeometry(rimR * 0.98, rimR * 0.98, halfWidth * 0.2, 16);
  face.rotateZ(Math.PI / 2), face.translate(halfWidth * 0.8, 0, 0), parts.push(face);
  const hub = new THREE.CylinderGeometry(rimR * 0.3, rimR * 0.3, halfWidth * 1.15, 10);
  hub.rotateZ(Math.PI / 2), parts.push(hub);
  for (let i = 0; i < SPOKES; i++) {
    const a = i / SPOKES * Math.PI * 2, spoke = new THREE.BoxGeometry(halfWidth * 0.42, rimR * 0.88, rimR * 0.26), pos = spoke.getAttribute("position");
    for (let v = 0; v < pos.count; v++) pos.getY(v) < 0 && pos.setZ(v, pos.getZ(v) * 0.45);
    pos.needsUpdate = true, spoke.computeVertexNormals(), spoke.translate(halfWidth * 0.72, rimR * 0.5, 0), spoke.rotateX(a), parts.push(spoke);
  }
  const rim = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return { tyre, rim };
}
export {
  PROPORTIONS,
  buildVehicle,
  contactShadow,
  roadWheelGeometry,
  roadWheelMaterials
};
