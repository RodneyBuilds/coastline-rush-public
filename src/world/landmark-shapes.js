import * as THREE from "three";
import { rockMaterial } from "../render/rockMaterial.js";
import { facadeMaterial } from "../render/facade.js";
const M = { marble: new THREE.MeshStandardMaterial({ color: 14999766, roughness: 0.82, flatShading: true }), granite: rockMaterial(new THREE.MeshStandardMaterial({ color: 10328722, roughness: 0.9, flatShading: true })), sandstoneRed: new THREE.MeshStandardMaterial({ color: 10770250, roughness: 0.92, flatShading: true }), whitePaint: new THREE.MeshStandardMaterial({ color: 15790057, roughness: 0.72, flatShading: true }), brownBand: new THREE.MeshStandardMaterial({ color: 7162419, roughness: 0.8, flatShading: true }), redIron: new THREE.MeshStandardMaterial({ color: 11549228, roughness: 0.62, metalness: 0.25, flatShading: true }), greenIron: new THREE.MeshStandardMaterial({ color: 4025685, roughness: 0.6, metalness: 0.3, flatShading: true }), copper: new THREE.MeshStandardMaterial({ color: 7648411, roughness: 0.72, metalness: 0.12, flatShading: true }), steel: new THREE.MeshStandardMaterial({ color: 9344411, roughness: 0.5, metalness: 0.75, flatShading: true }), steelDark: new THREE.MeshStandardMaterial({ color: 7041142, roughness: 0.55, metalness: 0.7, flatShading: true }), steelBright: new THREE.MeshStandardMaterial({ color: 12765131, roughness: 0.34, metalness: 0.9, flatShading: true }), concrete: new THREE.MeshStandardMaterial({ color: 12236460, roughness: 0.94, flatShading: true }), shingle: new THREE.MeshStandardMaterial({ color: 8219478, roughness: 0.95, flatShading: true }), roofDark: new THREE.MeshStandardMaterial({ color: 4866104, roughness: 0.9, flatShading: true }), timber: new THREE.MeshStandardMaterial({ color: 5916210, roughness: 0.95, flatShading: true }), hull: new THREE.MeshStandardMaterial({ color: 2304045, roughness: 0.78, flatShading: true }), glassTower: new THREE.MeshStandardMaterial({ color: 10470358, roughness: 0.12, metalness: 0.55, flatShading: true }), rock: new THREE.MeshStandardMaterial({ color: 9142647, roughness: 0.97, flatShading: true }), cliff: rockMaterial(new THREE.MeshStandardMaterial({ color: 7171944, roughness: 0.96, flatShading: true, vertexColors: true })), turf: new THREE.MeshStandardMaterial({ color: 4942649, roughness: 1, flatShading: true }), treeMass: new THREE.MeshStandardMaterial({ color: 3955244, roughness: 1, flatShading: true }), paintRed: new THREE.MeshStandardMaterial({ color: 12863546, roughness: 0.65, flatShading: true }), paintCream: new THREE.MeshStandardMaterial({ color: 15128232, roughness: 0.7, flatShading: true }), lampGlass: new THREE.MeshStandardMaterial({ color: 16771504, roughness: 0.25, emissive: 7034144 }) }, buildingFacades =  new Map();
function stoneWindows(cls = "midRise") {
  return typeof document > "u" ? M.marble : (buildingFacades.has(cls) || buildingFacades.set(cls, facadeMaterial({ cls, wall: 13089951, glass: 3428193, seed: 419 })), buildingFacades.get(cls));
}
function glassWindows() {
  return typeof document > "u" ? M.glassTower : (buildingFacades.has("glass") || buildingFacades.set("glass", facadeMaterial({ cls: "tower", wall: 8363433, glass: 4089213, seed: 731 })), buildingFacades.get("glass"));
}
function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  return m.castShadow = true, m.receiveShadow = true, m;
}
const box = (w, h, d, mat) => mesh(new THREE.BoxGeometry(w, h, d), mat), cyl = (rTop, rBot, h, sides, mat) => mesh(new THREE.CylinderGeometry(rTop, rBot, h, sides), mat), DOUBLE =  new Map();
function doubleSided(mat) {
  let m = DOUBLE.get(mat);
  return m || (m = mat.clone(), m.side = THREE.DoubleSide, DOUBLE.set(mat, m)), m;
}
const tube = (r, h, sides, mat) => mesh(new THREE.CylinderGeometry(r, r, h, sides, 1, true), doubleSided(mat)), dome = (r, mat, sides = 16) => mesh(new THREE.SphereGeometry(r, sides, Math.max(4, sides / 2), 0, Math.PI * 2, 0, Math.PI / 2), mat), torus = (r, t, mat, seg = 20) => mesh(new THREE.TorusGeometry(r, t, 6, seg), mat);
function put(g, o, x, y, z, ry = 0) {
  return o.position.set(x, y, z), ry && (o.rotation.y = ry), g.add(o), o;
}
function member(g, x0, y0, x1, y1, t, mat, z = 0) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 0.01) return;
  const m = box(len, t, t, mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z), m.rotation.z = Math.atan2(y1 - y0, x1 - x0), g.add(m);
}
function catenary(g, halfSpan, topY, sagY, t, zs, mat, steps = 12) {
  for (const z of zs) for (let i = 0; i < steps; i++) {
    const a = i / steps, b = (i + 1) / steps, yAt = (u) => sagY + (topY - sagY) * (2 * u - 1) * (2 * u - 1);
    member(g, -halfSpan + a * halfSpan * 2, yAt(a), -halfSpan + b * halfSpan * 2, yAt(b), t, mat, z);
  }
}
function hangers(g, halfSpan, topY, sagY, deckY, t, zs, mat, n = 14) {
  for (const z of zs) for (let i = 1; i < n; i++) {
    const u = i / n, y = sagY + (topY - sagY) * (2 * u - 1) * (2 * u - 1);
    if (y - deckY < 1) continue;
    const x = -halfSpan + u * halfSpan * 2, m = box(t, y - deckY, t, mat);
    m.position.set(x, (y + deckY) / 2, z), g.add(m);
  }
}
function truss(g, x0, x1, yBot, yTop, z, t, mat, bays = 10) {
  member(g, x0, yTop, x1, yTop, t, mat, z);
  const step = (x1 - x0) / bays;
  for (let i = 0; i < bays; i++) {
    const a = x0 + i * step, b = a + step;
    member(g, a, yBot, b, yTop, t, mat, z), member(g, b, yBot, a, yTop, t, mat, z), member(g, a, yBot, a, yTop, t * 0.8, mat, z);
  }
}
function lattice(g, x, h, w, d, t, mat) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(t, h, t, mat);
    leg.position.set(x + sx * w / 2, h / 2, sz * d / 2), g.add(leg);
  }
  const bays = Math.max(4, Math.round(h / 18));
  for (let i = 0; i < bays; i++) {
    const y0 = i / bays * h, y1 = (i + 1) / bays * h;
    for (const sz of [-1, 1]) member(g, x - w / 2, y0, x + w / 2, y1, t * 0.6, mat, sz * d / 2), member(g, x + w / 2, y0, x - w / 2, y1, t * 0.6, mat, sz * d / 2);
    const rail = box(w, t * 0.7, d, mat);
    rail.position.set(x, y1, 0), g.add(rail);
  }
}
function antiprism(base, top, h, mat) {
  const b = base / 2, t = top / 2, B = [[b, 0, b], [-b, 0, b], [-b, 0, -b], [b, 0, -b]], r = Math.SQRT2 * t, T = [0, 1, 2, 3].map((i) => {
    const a = Math.PI / 4 + i * Math.PI / 2;
    return [Math.cos(a) * r, h, Math.sin(a) * r];
  }), pos = [], tri = (p, q, s) => {
    pos.push(...p, ...q, ...s);
  };
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    tri(B[i], B[j], T[i]), tri(B[j], T[j], T[i]);
  }
  tri(T[0], T[1], T[2]), tri(T[0], T[2], T[3]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)), geo.computeVertexNormals();
  const uv = [];
  for (let i = 0; i < pos.length; i += 9) {
    const nx = geo.attributes.normal.getX(i / 3), nz = geo.attributes.normal.getZ(i / 3);
    for (let j = 0; j < 3; j++) {
      const k = i + j * 3;
      uv.push((Math.abs(nx) > Math.abs(nz) ? pos[k + 2] : pos[k]) / base + 0.5, pos[k + 1] / h * 4);
    }
  }
  return geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)), mesh(geo, mat);
}
function hipRoof(w, h, d, mat) {
  const m = cyl(1e-4, Math.SQRT1_2, 1, 4, mat);
  return m.scale.set(w / Math.SQRT1_2 / 2 * 1.42, h, d / Math.SQRT1_2 / 2 * 1.42), m.rotation.y = Math.PI / 4, m;
}
function lantern(g, r, y, sides = 8) {
  put(g, cyl(r * 1.5, r * 1.5, r * 0.22, sides, M.steelDark), 0, y + r * 0.11, 0), put(g, cyl(r * 0.85, r * 0.85, r * 1.5, sides, M.lampGlass), 0, y + r * 0.95, 0), put(g, cyl(1e-3, r * 1.1, r * 0.7, sides, M.roofDark), 0, y + r * 2.05, 0);
}
const BUILDERS = { "ri-state-house": (row) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint, bodyH = h * 0.42;
  put(g, box(w, bodyH, d, stoneWindows()), 0, bodyH / 2, 0);
  for (const s of [-1, 1]) put(g, box(w * 0.26, bodyH * 0.72, d * 0.82, M.marble), s * w * 0.37, bodyH * 0.36, 0);
  put(g, box(w * 0.3, bodyH * 0.22, d * 0.3, M.marble), 0, bodyH + bodyH * 0.11, 0);
  const drumR = Math.min(w, d) * 0.19;
  put(g, cyl(drumR, drumR, h * 0.2, 16, M.marble), 0, bodyH + h * 0.1 + bodyH * 0.22, 0), put(g, dome(drumR * 1.06, M.marble), 0, bodyH + h * 0.2 + bodyH * 0.22, 0), put(g, cyl(drumR * 0.2, drumR * 0.28, h * 0.12, 12, M.marble), 0, bodyH + h * 0.2 + bodyH * 0.22 + drumR * 1, 0);
  for (let i = -3; i <= 3; i++) put(g, cyl(w * 0.016, w * 0.016, bodyH * 0.8, 8, M.marble), i * w * 0.075, bodyH * 0.4, d * 0.52);
  return put(g, box(w * 0.5, bodyH * 0.14, d * 0.1, M.marble), 0, bodyH * 0.86, d * 0.52), g;
}, "industrial-trust-tower": (row) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint, steps = [[1, 0.44], [0.78, 0.26], [0.58, 0.16], [0.4, 0.08]];
  let y = 0;
  for (const [k, part] of steps) {
    const sh = h * part;
    put(g, box(w * k, sh, d * k, stoneWindows("tower")), 0, y + sh / 2, 0), y += sh;
  }
  return put(g, cyl(w * 0.1, w * 0.2, h * 0.05, 8, M.marble), 0, y + h * 0.025, 0), put(g, cyl(1e-3, w * 0.05, h * 0.04, 8, M.roofDark), 0, y + h * 0.05 + h * 0.02, 0), g;
}, "edgewood-yacht-club": (row) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint, deckY = h * 0.22;
  for (let i = -3; i <= 3; i++) for (const sz of [-1, 1]) put(g, box(w * 0.03, deckY, w * 0.03, M.timber), i * w * 0.15, deckY / 2, sz * d * 0.42);
  put(g, box(w, h * 0.04, d, M.timber), 0, deckY, 0);
  const bodyH = h * 0.46;
  put(g, box(w * 0.82, bodyH, d * 0.76, M.shingle), 0, deckY + bodyH / 2, 0), put(g, hipRoof(w * 0.92, h * 0.3, d * 0.86, M.roofDark), 0, deckY + bodyH, 0);
  for (const sz of [-1, 1]) put(g, box(w, h * 0.05, w * 0.02, M.whitePaint), 0, deckY + h * 0.08, sz * d * 0.48);
  return g;
}, "rhode-island-yacht-club": (row) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint, deckY = h * 0.2;
  for (let i = -2; i <= 2; i++) for (const sz of [-1, 1]) put(g, box(w * 0.04, deckY, w * 0.04, M.timber), i * w * 0.2, deckY / 2, sz * d * 0.4);
  put(g, box(w * 0.8, h * 0.42, d * 0.7, M.whitePaint), 0, deckY + h * 0.21, 0), put(g, hipRoof(w * 0.9, h * 0.26, d * 0.8, M.roofDark), 0, deckY + h * 0.42, 0);
  for (const s of [-1, 1]) put(g, box(w * 0.5, h * 0.03, d * 0.14, M.timber), s * w * 0.28, deckY * 0.6, d * 0.9);
  return g;
}, "warwick-water-tanks": (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint, legH = h * 0.55, r = w * 0.34;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    put(g, cyl(w * 0.02, w * 0.025, legH, 6, M.steelDark), Math.cos(a) * r * 0.82, legH / 2, Math.sin(a) * r * 0.82);
  }
  return put(g, tube(r * 0.86, w * 0.03, 12, M.steelDark), 0, legH * 0.55, 0), put(g, cyl(r, r, h * 0.3, 14, M.steelBright), 0, legH + h * 0.15, 0), put(g, dome(r, M.steelBright, 14), 0, legH + h * 0.3, 0), put(g, cyl(1e-3, r * 0.9, h * 0.1, 14, M.steelBright), 0, legH - h * 0.05, 0), g;
}, "warwick-approach-lights": (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint;
  for (let i = 0; i < 5; i++) {
    const z = (i - 2) * w * 0.9, mh = h * (0.5 + i * 0.13);
    put(g, cyl(w * 0.02, w * 0.03, mh, 6, M.steelDark), 0, mh / 2, z), put(g, box(w * 0.7, h * 0.02, w * 0.05, M.steelDark), 0, mh, z);
    for (const s of [-1, 0, 1]) put(g, box(w * 0.06, h * 0.03, w * 0.06, M.lampGlass), s * w * 0.28, mh + h * 0.02, z);
  }
  return g;
}, "beavertail-light": (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint;
  put(g, box(w * 2.4, h * 0.1, w * 2.4, M.rock), 0, h * 0.05, 0);
  const shaft = h * 0.74;
  return put(g, box(w * 0.62, shaft, w * 0.62, M.granite), 0, h * 0.1 + shaft / 2, 0), lantern(g, w * 0.3, h * 0.1 + shaft), put(g, box(w * 1.1, h * 0.26, w * 0.8, M.whitePaint), w * 1.2, h * 0.1 + h * 0.13, 0), put(g, hipRoof(w * 1.2, h * 0.14, w * 0.9, M.roofDark), w * 1.2, h * 0.1 + h * 0.26, 0), g;
}, "point-judith-light": (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint, r = w * 0.42, shaft = h * 0.76;
  put(g, cyl(r * 0.9, r * 1.15, h * 0.06, 8, M.granite), 0, h * 0.03, 0), put(g, cyl(r * 0.86, r, shaft * 0.55, 8, M.whitePaint), 0, h * 0.06 + shaft * 0.275, 0), put(g, cyl(r * 0.78, r * 0.86, shaft * 0.45, 8, M.brownBand), 0, h * 0.06 + shaft * 0.55 + shaft * 0.225, 0), lantern(g, r * 0.78, h * 0.06 + shaft);
  for (const s of [-1, 1]) put(g, box(w * 1.5, h * 0.22, w * 1.1, M.whitePaint), s * w * 1.9, h * 0.11, -w * 0.6), put(g, hipRoof(w * 1.6, h * 0.12, w * 1.2, M.roofDark), s * w * 1.9, h * 0.22, -w * 0.6);
  return g;
}, "stonington-point": (row) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint;
  put(g, box(w, h * 0.34, d * 0.5, M.rock), 0, h * 0.17, 0);
  for (let i = -4; i <= 4; i++) put(g, box(w * 0.13, h * 0.4, d * 0.16, M.rock), i * w * 0.115, h * 0.2, d * 0.34, i % 2 * 0.12);
  const r = h * 0.5;
  return put(g, cyl(r * 0.82, r, h * 1.15, 8, M.granite), -w * 0.26, h * 0.34 + h * 0.575, 0), lantern(g, r * 0.82, h * 0.34 + h * 1.15), g;
}, "mystic-bascule-bridge": (row, minDeckY = 0) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint, deckY = Math.max(h * 0.3, minDeckY), towerH = deckY + h * 0.72;
  put(g, box(w, h * 0.06, d, M.steelDark), 0, deckY, 0);
  const towerX = w * 0.19;
  for (const s of [-1, 1]) {
    for (const sz of [-1, 1]) put(g, box(w * 0.04, towerH, w * 0.04, M.paintCream), s * towerX, towerH / 2, sz * d * 0.3);
    put(g, box(w * 0.12, h * 0.05, d * 0.72, M.paintCream), s * towerX, towerH, 0), put(g, box(w * 0.16, h * 0.28, d * 0.78, M.concrete), s * towerX, deckY + h * 0.46, 0);
  }
  for (const s of [-1, 1]) put(g, box(w * 0.26, h * 0.08, d * 0.9, M.paintCream), s * w * 0.09, deckY + h * 0.05, 0);
  for (const sz of [-1, 1]) {
    truss(g, -w / 2, w / 2, deckY + 0.35, deckY + 2.2, sz * d * 0.47, 0.18, M.steelDark, 12);
    for (const sx of [-1, 1]) member(g, sx * towerX, towerH, sx * w * 0.42, deckY + 1.2, 0.35, M.paintCream, sz * d * 0.3);
  }
  for (const sx of [-1, 1]) {
    put(g, box(w * 0.11, deckY + 0.4, d * 1.12, M.concrete), sx * w * 0.45, deckY / 2 - 0.2, 0);
    const approach = put(g, box(w * 0.32, 0.5, d, M.steelDark), sx * w * 0.65, deckY * 0.65, 0);
    approach.rotation.z = -sx * Math.atan2(deckY * 0.7, w * 0.32);
  }
  return g.userData.deckY = deckY, g;
}, "mystic-seaport-whaleship": (row) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint, hullH = h * 0.28;
  for (let i = 0; i < 4; i++) {
    const k = 1 - i * 0.13;
    put(g, box(w * k, hullH / 4, d * (1 - i * 0.05), M.hull), 0, hullH * (i + 0.5) / 4, 0);
  }
  put(g, box(w * 0.72, hullH * 0.5, d * 0.8, M.timber), 0, hullH + hullH * 0.25, 0);
  for (let i = 0; i < 3; i++) {
    const z = (i - 1) * d * 0.26, mh = h * (0.62 - Math.abs(i - 1) * 0.06);
    put(g, cyl(w * 0.03, w * 0.05, mh, 6, M.timber), 0, hullH + mh / 2, z);
    for (let y = 0; y < 3; y++) put(g, box(w * (0.9 - y * 0.18), w * 0.025, w * 0.025, M.timber), 0, hullH + mh * (0.42 + y * 0.2), z);
  }
  for (const s of [-1, 1]) put(g, box(w * 1.2, h * 0.2, d * 0.22, M.shingle), s * w * 1.6, h * 0.1, -d * 0.24), put(g, hipRoof(w * 1.3, h * 0.1, d * 0.26, M.roofDark), s * w * 1.6, h * 0.2, -d * 0.24);
  return g;
}, "mystic-aquarium": (row) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint;
  put(g, box(w * 0.62, h * 0.72, d * 0.56, M.whitePaint), -w * 0.14, h * 0.36, -d * 0.18), put(g, hipRoof(w * 0.68, h * 0.24, d * 0.62, M.roofDark), -w * 0.14, h * 0.72, -d * 0.18), put(g, box(w * 0.3, h * 0.5, d * 0.34, M.paintCream), w * 0.3, h * 0.25, -d * 0.24), put(g, cyl(w * 0.12, w * 0.12, h * 0.5, 12, M.whitePaint), w * 0.05, h * 0.25, d * 0.06), put(g, dome(w * 0.13, M.glassTower, 12), w * 0.05, h * 0.5, d * 0.06);
  for (const [x, r] of [[-w * 0.2, w * 0.16], [w * 0.12, w * 0.12], [w * 0.34, w * 0.09]]) put(g, tube(r, h * 0.16, 16, M.concrete), x, h * 0.08, d * 0.34), put(g, cyl(r * 0.94, r * 0.94, h * 0.02, 16, M.glassTower), x, h * 0.14, d * 0.34);
  return g;
}, "new-london-harbor-light": (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint, r = w * 0.44, shaft = h * 0.84;
  return put(g, cyl(r * 1.05, r * 1.25, h * 0.05, 8, M.granite), 0, h * 0.025, 0), put(g, cyl(r * 0.8, r * 1.02, shaft, 8, M.whitePaint), 0, h * 0.05 + shaft / 2, 0), lantern(g, r * 0.8, h * 0.05 + shaft), put(g, box(w * 1.4, h * 0.16, w * 1.1, M.whitePaint), w * 1.5, h * 0.08, 0), put(g, hipRoof(w * 1.5, h * 0.09, w * 1.2, M.roofDark), w * 1.5, h * 0.16, 0), g;
}, "gold-star-memorial-bridge": (row, minDeckY = 0) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint, deckY = Math.max(h * 0.55, minDeckY);
  for (const sz of [-1, 1]) put(g, box(w, h * 0.045, d * 0.44, M.concrete), 0, deckY, sz * d * 0.26), truss(g, -w * 0.3, w * 0.3, deckY, deckY + h * 0.34, sz * d * 0.26 - d * 0.2, Math.max(0.7, h * 0.022), M.steelDark, 12), truss(g, -w * 0.3, w * 0.3, deckY, deckY + h * 0.34, sz * d * 0.26 + d * 0.2, Math.max(0.7, h * 0.022), M.steelDark, 12);
  for (let i = -3; i <= 3; i++) i && put(g, box(w * 0.018, deckY, d * 0.9, M.concrete), i * w * 0.15, deckY / 2, 0);
  return g.userData.deckY = deckY, g;
}, "nautilus-submarine-museum": (row) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint;
  put(g, box(w * 0.52, h * 0.62, d * 0.6, M.whitePaint), -w * 0.2, h * 0.31, -d * 0.16), put(g, hipRoof(w * 0.58, h * 0.2, d * 0.66, M.roofDark), -w * 0.2, h * 0.62, -d * 0.16), put(g, box(w * 0.3, h * 0.42, d * 0.4, M.paintCream), w * 0.24, h * 0.21, -d * 0.2), put(g, box(w * 0.9, h * 0.06, d * 0.12, M.timber), 0, h * 0.14, d * 0.24);
  const hullL = w * 0.82;
  put(g, cyl(h * 0.16, h * 0.16, hullL, 12, M.hull), 0, h * 0.16, d * 0.42, 0).rotation.set(0, 0, Math.PI / 2);
  for (const s of [-1, 1]) put(g, cyl(1e-3, h * 0.16, h * 0.3, 12, M.hull), s * (hullL / 2 + h * 0.15), h * 0.16, d * 0.42).rotation.set(0, 0, s * Math.PI / 2);
  return put(g, box(w * 0.1, h * 0.34, d * 0.07, M.hull), -w * 0.06, h * 0.33, d * 0.42), put(g, box(w * 0.22, h * 0.02, d * 0.02, M.hull), -w * 0.06, h * 0.3, d * 0.42), g;
}, "avery-point-light": (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint;
  put(g, box(w * 3.2, h * 0.22, w * 2.4, M.granite), w * 0.9, h * 0.11, 0), put(g, box(w * 2.6, h * 0.3, w * 1.9, M.granite), w * 1.1, h * 0.22 + h * 0.15, 0), put(g, hipRoof(w * 2.8, h * 0.16, w * 2.1, M.roofDark), w * 1.1, h * 0.52, 0);
  const r = w * 0.42, shaft = h * 0.62;
  return put(g, cyl(r * 0.86, r, shaft, 8, M.whitePaint), 0, h * 0.22 + shaft / 2, 0), lantern(g, r * 0.86, h * 0.22 + shaft), g;
}, "battery-maritime-building": (row) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint;
  put(g, box(w, h * 0.72, d, M.greenIron), 0, h * 0.36, 0), put(g, box(w * 1.02, h * 0.1, d * 1.02, M.greenIron), 0, h * 0.77, 0), put(g, hipRoof(w * 1.02, h * 0.2, d * 1.02, M.roofDark), 0, h * 0.82, 0);
  for (const s of [-1, 0, 1]) put(g, box(w * 0.2, h * 0.5, d * 0.06, M.hull), s * w * 0.27, h * 0.25, d * 0.5), put(g, cyl(w * 0.1, w * 0.1, d * 0.06, 12, M.hull), s * w * 0.27, h * 0.5, d * 0.5).rotation.set(Math.PI / 2, 0, 0);
  for (const s of [-1.5, -0.5, 0.5, 1.5]) put(g, box(w * 0.05, h * 0.72, d * 0.08, M.greenIron), s * w * 0.27, h * 0.36, d * 0.52);
  for (const s of [-1, 1]) put(g, cyl(w * 0.035, w * 0.035, h * 0.34, 8, M.greenIron), s * w * 0.47, h * 0.89, 0);
  return g;
}, "governors-island": (row) => {
  const g = new THREE.Group(), { w, d, h } = row.footprint;
  put(g, cyl(w * 0.48, w * 0.5, h * 0.5, 12, M.turf), 0, h * 0.25, 0).scale.set(1, 1, d / w), put(g, cyl(w * 0.44, w * 0.46, h * 0.2, 12, M.rock), 0, h * 0.08, 0).scale.set(1, 1, d / w), put(g, tube(w * 0.05, h * 1.5, 14, M.sandstoneRed), -w * 0.26, h * 0.5 + h * 0.75, -d * 0.3), put(g, box(w * 0.11, h * 1.1, d * 0.13, M.granite), w * 0.12, h * 0.5 + h * 0.55, -d * 0.26);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    put(g, box(w * 0.05, h * 0.9, w * 0.05, M.granite), w * 0.12 + Math.cos(a) * w * 0.07, h * 0.5 + h * 0.45, -d * 0.26 + Math.sin(a) * d * 0.08, a);
  }
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2, rr = 0.2 + i * 7 % 10 / 34;
    put(g, dome(w * 0.03, M.treeMass, 6), Math.cos(a) * w * rr, h * 0.5, Math.sin(a) * d * rr);
  }
  return g;
}, "one-world-trade": (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint, shaftH = h * 0.755;
  put(g, box(w * 1.02, h * 0.035, w * 1.02, M.concrete), 0, h * 0.0175, 0), put(g, antiprism(w, w * 0.62, shaftH, glassWindows()), 0, h * 0.035, 0), put(g, box(w * 0.46, h * 0.012, w * 0.46, M.steelBright), 0, h * 0.035 + shaftH, 0);
  const mastH = h - shaftH - h * 0.035;
  return put(g, cyl(w * 0.012, w * 0.05, mastH, 10, M.steelBright), 0, h * 0.035 + shaftH + mastH / 2, 0), put(g, cyl(w * 0.09, w * 0.09, mastH * 0.1, 10, M.steelDark), 0, h * 0.035 + shaftH + mastH * 0.16, 0), g;
}, "castle-clinton": (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint, r = w * 0.46;
  return put(g, tube(r, h, 20, M.sandstoneRed), 0, h / 2, 0), put(g, tube(r * 0.9, h * 0.92, 20, M.sandstoneRed), 0, h * 0.46, 0), put(g, cyl(r * 1.02, r * 1.02, h * 0.1, 20, M.sandstoneRed), 0, h * 1.02, 0), put(g, cyl(r * 0.88, r * 0.88, h * 0.06, 20, M.turf), 0, h * 0.03, 0), put(g, box(w * 0.16, h * 1.3, w * 0.1, M.sandstoneRed), 0, h * 0.65, r), put(g, box(w * 0.07, h * 0.7, w * 0.14, M.hull), 0, h * 0.35, r), g;
}, "statue-of-liberty": (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint, fortH = h * 0.14, pedH = h * 0.36, figH = h * 0.5;
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2;
    put(g, box(w * 0.17, fortH, w * 0.17, M.granite), Math.cos(a) * w * 0.4, fortH / 2, Math.sin(a) * w * 0.4, a);
  }
  put(g, cyl(w * 0.4, w * 0.44, fortH, 11, M.granite), 0, fortH / 2, 0), put(g, cyl(w * 0.2, w * 0.28, pedH, 4, M.granite), 0, fortH + pedH / 2, 0, Math.PI / 4);
  const baseY = fortH + pedH;
  put(g, cyl(w * 0.08, w * 0.17, figH * 0.62, 8, M.copper), 0, baseY + figH * 0.31, 0), put(g, cyl(w * 0.055, w * 0.08, figH * 0.16, 8, M.copper), 0, baseY + figH * 0.7, 0), put(g, cyl(w * 0.045, w * 0.045, figH * 0.09, 8, M.copper), 0, baseY + figH * 0.82, 0);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i / 6 - 0.5) * Math.PI * 1.1;
    put(g, box(w * 0.012, figH * 0.09, w * 0.012, M.copper), Math.cos(a) * w * 0.055, baseY + figH * 0.9, Math.sin(a) * w * 0.055, a);
  }
  const arm = put(g, cyl(w * 0.022, w * 0.03, figH * 0.42, 6, M.copper), w * 0.075, baseY + figH * 0.82, 0);
  return arm.rotation.z = -0.22, put(g, cyl(w * 0.05, w * 0.035, figH * 0.06, 8, M.copper), w * 0.13, baseY + figH * 1.03, 0), put(g, cyl(1e-3, w * 0.04, figH * 0.09, 8, M.lampGlass), w * 0.13, baseY + figH * 1.1, 0), put(g, box(w * 0.05, figH * 0.16, w * 0.02, M.copper), -w * 0.075, baseY + figH * 0.66, w * 0.03, 0.3), g;
}, "bronx-whitestone-bridge": (row, minDeckY = 0) => buildSuspension(row, minDeckY, { towerAt: 0.26, deckAt: 0.42, doubleDeck: false, towerMat: M.steel, lattice: false }), "george-washington-bridge": (row, minDeckY = 0) => buildSuspension(row, minDeckY, { towerAt: 0.24, deckAt: 0.45, doubleDeck: true, towerMat: M.steelDark, lattice: true }), "verrazzano-narrows-bridge": (row, minDeckY = 0) => buildSuspension(row, minDeckY, { towerAt: 0.25, deckAt: 0.44, doubleDeck: true, towerMat: M.granite, lattice: false }), unisphere: (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint, R = w * 0.42, cy = h * 0.52;
  put(g, tube(w * 0.5, h * 0.06, 24, M.concrete), 0, h * 0.03, 0), put(g, cyl(w * 0.48, w * 0.48, h * 0.02, 24, M.glassTower), 0, h * 0.03, 0);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2, leg = put(g, cyl(w * 0.02, w * 0.035, cy * 0.72, 6, M.steelBright), Math.cos(a) * w * 0.12, cy * 0.36, Math.sin(a) * w * 0.12);
    leg.rotation.z = -Math.cos(a) * 0.16, leg.rotation.x = Math.sin(a) * 0.16;
  }
  for (let i = 1; i <= 5; i++) {
    const lat = (i / 6 - 0.5) * Math.PI, rr = Math.cos(lat) * R, ring = put(g, torus(rr, w * 6e-3, M.steelBright, 20), 0, cy + Math.sin(lat) * R, 0);
    ring.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 6; i++) {
    const ring = put(g, torus(R, w * 6e-3, M.steelBright, 20), 0, cy, 0);
    ring.rotation.y = i / 6 * Math.PI;
  }
  for (let i = 0; i < 3; i++) put(g, torus(R * 1.18, w * 0.012, M.steelBright, 26), 0, cy, 0).rotation.set(Math.PI / 2 - 0.5 + i * 0.5, i * 1.1, 0.3);
  return g;
}, "coney-island-wonder-wheel": (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint, R = w * 0.44, cy = h * 0.52;
  for (const s of [-1, 1]) member(g, s * w * 0.3, 0, 0, cy, Math.max(0.5, w * 0.022), M.steelDark, 0), member(g, s * w * 0.3, 0, s * w * 0.06, cy * 0.55, Math.max(0.4, w * 0.016), M.steelDark, w * 0.1);
  for (const z of [-w * 0.06, w * 0.06]) put(g, torus(R, Math.max(0.35, w * 0.014), M.paintRed, 28), 0, cy, z), put(g, torus(R * 0.62, Math.max(0.28, w * 0.011), M.paintCream, 24), 0, cy, z);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    member(g, 0, cy, Math.cos(a) * R, cy + Math.sin(a) * R, Math.max(0.2, w * 8e-3), M.steelBright, 0);
    const cr = i % 2 ? R * 0.93 : R * 0.66, mat = i % 2 ? M.paintRed : M.paintCream;
    put(g, box(w * 0.05, w * 0.05, w * 0.09, mat), Math.cos(a) * cr, cy + Math.sin(a) * cr, 0);
  }
  const tw = w * 0.5;
  lattice(g, -w * 0.62, h * 0.92, w * 0.1, w * 0.1, Math.max(0.4, w * 0.016), M.steelDark);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    member(g, -w * 0.62, h * 0.92, -w * 0.62 + Math.cos(a) * tw * 0.3, h * 0.86, Math.max(0.25, w * 0.01), M.steelDark, Math.sin(a) * tw * 0.3);
  }
  return g;
}, "jeffreys-hook-light": (row) => {
  const g = new THREE.Group(), { w, h } = row.footprint;
  put(g, box(w * 2.6, h * 0.14, w * 2.6, M.rock), 0, h * 0.07, 0);
  const shaft = h * 0.66;
  return put(g, cyl(w * 0.26, w * 0.46, shaft, 10, M.redIron), 0, h * 0.14 + shaft / 2, 0), put(g, tube(w * 0.34, h * 0.03, 10, M.redIron), 0, h * 0.14 + shaft * 0.55, 0), lantern(g, w * 0.26, h * 0.14 + shaft), g;
} };
function buildSuspension(row, minDeckY, o) {
  const g = new THREE.Group(), { w, d, h } = row.footprint, deckY = Math.max(h * o.deckAt, minDeckY), halfSpan = w * o.towerAt, t = Math.max(0.8, h * 0.012), towerW = Math.max(4, h * 0.075);
  for (const s of [-1, 1]) {
    const x = s * halfSpan;
    if (o.lattice) lattice(g, x, h, towerW, d * 0.82, Math.max(1, h * 0.016), o.towerMat);
    else {
      for (const sz of [-1, 1]) put(g, box(towerW * 0.42, h, d * 0.16, o.towerMat), x, h / 2, sz * d * 0.34);
      for (const k of [0.42, 0.72, 0.98]) put(g, box(towerW * 0.42, h * 0.035, d * 0.82, o.towerMat), x, h * k, 0);
    }
  }
  const sides = [-d * 0.34, d * 0.34];
  catenary(g, halfSpan, h * 0.98, deckY + h * 0.06, t, sides, M.steelBright), hangers(g, halfSpan, h * 0.98, deckY + h * 0.06, deckY, t * 0.55, sides, M.steelBright);
  for (const s of [-1, 1]) for (const z of sides) member(g, s * halfSpan, h * 0.98, s * w * 0.5, deckY * 0.86, t, M.steelBright, z);
  if (put(g, box(w, Math.max(1.2, h * 0.02), d, M.concrete), 0, deckY, 0), o.doubleDeck) {
    put(g, box(w, Math.max(1, h * 0.016), d * 0.94, M.concrete), 0, deckY - h * 0.055, 0);
    for (let i = -8; i <= 8; i++) put(g, box(Math.max(0.6, h * 0.01), h * 0.055, d, M.steelDark), i * w * 0.055, deckY - h * 0.028, 0);
  }
  for (let i = -4; i <= 4; i++) {
    const x = i * w * 0.11;
    Math.abs(x) < halfSpan * 1.05 || put(g, box(w * 0.012, deckY, d * 0.6, M.concrete), x, deckY / 2, 0);
  }
  return g.userData.deckY = deckY, g;
}
function buildLandmark(row, minDeckY = 0) {
  const fn = BUILDERS[row.id];
  if (!fn) return null;
  const g = fn(row, minDeckY);
  return g ? (g.userData.built = true, g) : null;
}
const landmarkMaterials = M, BUILT_IDS = Object.keys(BUILDERS);
export {
  BUILT_IDS,
  buildLandmark,
  landmarkMaterials
};
