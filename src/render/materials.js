import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { trafficModel, semiRig } from "./vehicleModel.js";
const materials = { gtPaint: new THREE.MeshPhysicalMaterial({ color: 14488850, metalness: 1, roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.03 }), silver: new THREE.MeshPhysicalMaterial({ color: 1989245, metalness: 1, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.05 }), toyPlastic: new THREE.MeshPhysicalMaterial({ color: 16758318, metalness: 0, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.18 }), glassDark: new THREE.MeshPhysicalMaterial({ color: 1845811, metalness: 0.4, roughness: 0.08, clearcoat: 1 }), glassClear: new THREE.MeshPhysicalMaterial({ color: 16777215, metalness: 0.25, roughness: 0, transmission: 1, ior: 1.5, thickness: 0.3 }), chrome: new THREE.MeshStandardMaterial({ color: 16777215, metalness: 1, roughness: 0.25 }), tire: new THREE.MeshStandardMaterial({ color: 1316378, roughness: 0.9 }), railPost: new THREE.MeshStandardMaterial({ color: 7764349, roughness: 0.72, metalness: 0.82 }), railBeam: new THREE.MeshStandardMaterial({ color: 10199204, roughness: 0.62, metalness: 0.88, side: THREE.DoubleSide }), kerb: new THREE.MeshStandardMaterial({ color: 14275782, roughness: 0.85, side: THREE.DoubleSide }), island: new THREE.MeshStandardMaterial({ color: 7305798, roughness: 1, side: THREE.DoubleSide }), signPost: new THREE.MeshStandardMaterial({ color: 11054514, roughness: 0.58, metalness: 0.78 }), archPost: new THREE.MeshStandardMaterial({ color: 11843515, roughness: 0.55, metalness: 0.76 }), gantryTrim: new THREE.MeshStandardMaterial({ color: 3883080, roughness: 0.75, metalness: 0.15 }), placeholderMassing: new THREE.MeshStandardMaterial({ color: 9277334, roughness: 0.95, flatShading: true }), bridgeStone: new THREE.MeshStandardMaterial({ color: 11048586, roughness: 0.88 }), bridgeCable: new THREE.MeshStandardMaterial({ color: 8225929, roughness: 0.42, metalness: 0.9 }) };
function waterNormalTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d"), img = g.createImageData(512, 512), TAU = Math.PI * 2;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const i = (y * 512 + x) * 4, u = x / 512 * TAU, v = y / 512 * TAU, nx = Math.sin(u * 2 + v) * 0.55 + Math.sin(u * 5 - v * 3 + 1.1) * 0.28 + Math.sin(u * 9 + v * 7) * 0.11, ny = Math.cos(v * 2 - u) * 0.55 + Math.cos(v * 5 + u * 3 - 0.4) * 0.28 + Math.cos(v * 9 - u * 7) * 0.11;
    img.data[i] = 128 + nx * 88, img.data[i + 1] = 128 + ny * 88, img.data[i + 2] = 255, img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  return t.wrapS = t.wrapT = THREE.RepeatWrapping, t.repeat.set(52, 52), t.anisotropy = 16, t;
}
function signTexture(text, background, w, h, border = false) {
  const c = document.createElement("canvas");
  c.width = w, c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = background, g.fillRect(0, 0, w, h), border && (g.strokeStyle = "#ffffff", g.lineWidth = Math.round(h * 0.057), g.strokeRect(h * 0.068, h * 0.068, w - h * 0.136, h - h * 0.136)), g.fillStyle = "#fff";
  let fontSize = Math.round(h * 0.4);
  g.font = `600 ${fontSize}px Arial, sans-serif`;
  const available = w - h * 0.38;
  g.measureText(text).width > available && (fontSize = Math.floor(fontSize * available / g.measureText(text).width), g.font = `600 ${fontSize}px Arial, sans-serif`), g.textAlign = "center", g.textBaseline = "middle", g.fillText(text, w / 2, h * 0.54);
  const t = new THREE.CanvasTexture(c);
  return t.colorSpace = THREE.SRGBColorSpace, t.anisotropy = 8, t;
}
function highwaySignTexture(text) {
  const c = document.createElement("canvas");
  c.width = 1536, c.height = 384;
  const g = c.getContext("2d");
  g.fillStyle = "#07543d", g.fillRect(0, 0, c.width, c.height), g.strokeStyle = "#eaf4df", g.lineWidth = 8, g.strokeRect(14, 14, 1508, 356), g.fillStyle = "#fff", g.textAlign = "center", g.textBaseline = "middle", g.font = "600 34px Arial", g.fillText("EAST COAST TOUR", 768, 65);
  const title = text.toLowerCase().replace(/\b\w/g, (c2) => c2.toUpperCase());
  let size = 96;
  g.font = `600 ${size}px Arial`, size = Math.min(size, Math.floor(size * 1390 / g.measureText(title).width)), g.font = `600 ${size}px Arial`, g.fillText(title, 768, 184);
  for (const x of [384, 1152]) g.lineWidth = 13, g.beginPath(), g.moveTo(x, 262), g.lineTo(x, 328), g.moveTo(x - 24, 305), g.lineTo(x, 329), g.lineTo(x + 24, 305), g.stroke();
  const texture = new THREE.CanvasTexture(c);
  return texture.colorSpace = THREE.SRGBColorSpace, texture.anisotropy = 8, texture;
}
function wheel(r, w, tireMat = materials.tire) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 22), tireMat);
  m.rotation.z = Math.PI / 2, m.castShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, w + 0.02, 14), materials.chrome);
  return hub.rotation.z = Math.PI / 2, m.add(hub), m;
}
function buildCRV() {
  const g = new THREE.Group(), body = new THREE.Mesh(new RoundedBoxGeometry(1.84, 0.78, 4.55, 4, 0.16), materials.silver);
  body.position.y = 0.72, body.castShadow = true, g.add(body);
  const hoodDrop = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.3, 1, 3, 0.1), materials.silver);
  hoodDrop.position.set(0, 0.62, 1.95), hoodDrop.castShadow = true, g.add(hoodDrop);
  const cabin = new THREE.Mesh(new RoundedBoxGeometry(1.58, 0.52, 2.45, 4, 0.2), materials.glassDark);
  cabin.position.set(0, 1.28, -0.28), cabin.castShadow = true, g.add(cabin);
  const tailMat = new THREE.MeshStandardMaterial({ color: 13373730, emissive: 8917282, emissiveIntensity: 0.7, roughness: 0.35 });
  for (const s of [-1, 1]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.05), tailMat);
    tl.position.set(0.66 * s, 0.98, -2.28), g.add(tl);
  }
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 2.4), materials.chrome);
    rail.position.set(0.68 * s, 1.56, -0.28), g.add(rail);
  }
  for (const [x, z] of [[0.82, 1.45], [-0.82, 1.45], [0.82, -1.5], [-0.82, -1.5]]) {
    const w = wheel(0.37, 0.26);
    w.position.set(x, 0.37, z), g.add(w);
  }
  return g;
}
function buildToy() {
  const g = new THREE.Group(), tub = new THREE.Mesh(new RoundedBoxGeometry(1.95, 0.7, 3.1, 4, 0.28), materials.toyPlastic);
  tub.position.y = 0.78, tub.castShadow = true, g.add(tub);
  const hood = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.34, 0.95, 3, 0.16), materials.toyPlastic);
  hood.position.set(0, 1.06, 1.15), hood.castShadow = true, g.add(hood);
  const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.08), materials.chrome);
  screenFrame.position.set(0, 1.55, 0.68), screenFrame.castShadow = true, g.add(screenFrame);
  const barMat = new THREE.MeshPhysicalMaterial({ color: 15265007, metalness: 0, roughness: 0.42, clearcoat: 0.6 }), bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.9), barMat);
  bar.rotation.z = Math.PI / 2, bar.position.set(0, 1.72, -1.1), bar.castShadow = true, g.add(bar);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.85), barMat);
    leg.position.set(0.92 * s, 1.3, -1.1), g.add(leg);
  }
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5), materials.tire);
  col.position.set(-0.4, 1.25, 0.35), col.rotation.x = 0.8, g.add(col);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 10, 22), new THREE.MeshStandardMaterial({ color: 16734798, roughness: 0.5 }));
  sw.position.set(-0.4, 1.45, 0.22), sw.rotation.x = 0.8, g.add(sw);
  for (const [s, txt, bg] of [[-1, "TURBO", "#29b7e8"], [1, "4x4", "#ff5a4e"]]) {
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), new THREE.MeshStandardMaterial({ map: signTexture(txt, bg, 256, 128), roughness: 0.5 }));
    st.position.set(0.985 * s, 0.85, 0.4), st.rotation.y = Math.PI / 2 * s, g.add(st);
  }
  for (const [x, z] of [[0.95, 1.05], [-0.95, 1.05], [0.95, -1.05], [-0.95, -1.05]]) {
    const w = wheel(0.5, 0.4, new THREE.MeshStandardMaterial({ color: 1974052, roughness: 0.75 }));
    w.position.set(x, 0.5, z), g.add(w);
  }
  return g;
}
let gtModel = null;
function setGTModel(model) {
  gtModel = model;
}
function buildGT() {
  const g = new THREE.Group();
  if (gtModel) {
    const clone = gtModel.clone(true);
    clone.rotation.y = Math.PI, g.add(clone);
  } else {
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.5, 4.4, 4, 0.2), materials.gtPaint);
    body.position.y = 0.5, body.castShadow = true, g.add(body);
    const cabin = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.34, 1.6, 3, 0.14), materials.glassDark);
    cabin.position.set(0, 0.86, -0.5), cabin.castShadow = true, g.add(cabin);
    for (const [x, z] of [[0.84, 1.4], [-0.84, 1.4], [0.84, -1.45], [-0.84, -1.45]]) {
      const w = wheel(0.34, 0.28);
      w.position.set(x, 0.34, z), g.add(w);
    }
  }
  return g;
}
const BODY_BUILDERS = { toy: buildToy, crv: buildCRV, gt: buildGT };
function buildTrafficCar(color, variant = 0, heavy = false) {
  const loaded = heavy ? semiRig(color) || trafficModel(variant, color) : trafficModel(variant, color);
  if (loaded) return loaded;
  const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), metalness: 0.9, roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.12 });
  g.userData.ownedMaterials = [m];
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.76, 0.52, 4.35, 3, 0.16), m);
  body.position.y = 0.56, body.castShadow = true, g.add(body);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.4, 1.9, 3, 0.18), materials.glassDark);
  cab.position.set(0, 0.98, -0.25), cab.castShadow = true, g.add(cab);
  for (const [x, z] of [[0.82, 1.4], [-0.82, 1.4], [0.82, -1.4], [-0.82, -1.4]]) {
    const w = wheel(0.34, 0.24);
    w.position.set(x, 0.34, z), g.add(w);
  }
  return g;
}
export {
  BODY_BUILDERS,
  buildCRV,
  buildGT,
  buildToy,
  buildTrafficCar,
  highwaySignTexture,
  materials,
  setGTModel,
  signTexture,
  waterNormalTexture
};
