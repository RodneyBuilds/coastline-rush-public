import { mixedWoodlandCrown } from "./leafGeometry.js";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { WATERLINE } from "../physics/constants.js";
import { coniferCrown, treeCrown, bushCrown, grassCards, canopyMaterial, foliageMaterial, barkMaterial } from "./foliage.js";
import { SEABED_Y } from "./ocean.js";
import { sceneryDensity } from "../render/quality.js";
import { facadeMaterial } from "../render/facade.js";
import { flowerClump } from "./flowers.js";
import { instanceBounds } from "./instanceBounds.js";
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
}
const shared = { flowers: flowerClump, trunk: () => {
  const parts = [new THREE.CylinderGeometry(0.16, 0.28, 2.4, 5)], GOLDEN = 2.399963;
  for (let i = 0; i < 8; i++) {
    const t = 0.3 + i / 7 * 0.62, len = 0.7 - 0.32 * t, b = new THREE.CylinderGeometry(0.012, 0.055, len, 4);
    b.rotateZ(Math.PI / 2), b.translate(len / 2 + 0.1, 0, 0), b.rotateZ(0.62 - 0.18 * t), b.rotateY(i * GOLDEN), b.translate(0, -1.2 + t * 2.4, 0), parts.push(b);
  }
  const g = mergeGeometries(parts, false);
  for (const q of parts) q.dispose();
  return g;
}, coniferCrown, treeCrown, bushCrown, grassCards, coniferSpecies: [() => coniferCrown(0), () => mixedWoodlandCrown(1), () => mixedWoodlandCrown(2), () => mixedWoodlandCrown(3)], treeSpecies: [() => treeCrown(0), () => treeCrown(1), () => treeCrown(2), () => treeCrown(3), () => treeCrown(4)], treeSpeciesNear: [() => treeCrown(0, 1), () => treeCrown(1, 1), () => treeCrown(2, 1)], rock: () => new THREE.IcosahedronGeometry(1, 0), isle: () => new THREE.IcosahedronGeometry(1, 1), box: () => new THREE.BoxGeometry(1, 1, 1), hipRoof: () => new THREE.ConeGeometry(1, 1, 4), pole: () => new THREE.CylinderGeometry(0.13, 0.16, 9, 6), lampHead: () => {
  const arm = new THREE.CylinderGeometry(0.075, 0.085, 1.5, 5);
  arm.rotateZ(Math.PI / 2), arm.translate(0.75, 0, 0);
  const housing = new THREE.BoxGeometry(0.62, 0.16, 0.3);
  housing.translate(1.42, -0.12, 0);
  const knuckle = new THREE.CylinderGeometry(0.1, 0.15, 0.42, 5);
  return knuckle.translate(0, 0.16, 0), mergeGeometries([arm, housing, knuckle]);
}, tower: () => new THREE.BoxGeometry(1, 1, 1) }, mat = (opts) => new THREE.MeshStandardMaterial(opts), TRUNK_SLIM = 0.55, ZERO = new THREE.Vector3(0, 0, 0);
function hash01(x, z, salt) {
  let h = Math.imul(Math.round(x * 32) | 0, 2654435761) ^ Math.imul(Math.round(z * 32) | 0, 2246822507) ^ Math.imul(salt | 0, 3266489909);
  return h = Math.imul(h ^ h >>> 15, 625341585), h ^= h >>> 13, (h >>> 0) / 4294967296;
}
const VARY =  new Map([[shared.flowers, { h: 0.015, s: 0.025, l: 0.14 }], [shared.coniferCrown, { h: 0.03, s: 0.12, l: 0.14 }], [shared.treeCrown, { h: 0.03, s: 0.12, l: 0.15 }], [shared.bushCrown, { h: 0.03, s: 0.12, l: 0.15 }], [shared.grassCards, { h: 0.026, s: 0.12, l: 0.16 }], [shared.trunk, { h: 0.015, s: 0.08, l: 0.13 }], [shared.rock, { h: 0.01, s: 0.06, l: 0.13 }], [shared.isle, { h: 0.01, s: 0.05, l: 0.1 }], [shared.hipRoof, { h: 0.012, s: 0.07, l: 0.1 }], [shared.box, { h: 0.012, s: 0.07, l: 0.09 }], [shared.pole, { h: 4e-3, s: 0.03, l: 0.07 }], [shared.lampHead, { h: 4e-3, s: 0.03, l: 0.07 }], [shared.tower, { h: 0.012, s: 0.06, l: 0.08 }]]), _varyHSL = { h: 0, s: 0, l: 0 }, _varyTarget = new THREE.Color(), sceneryTint = new THREE.Color();
function tintBasis(base) {
  base.getHSL(_varyHSL);
  const FLOOR = 0.02;
  return { h: _varyHSL.h, s: _varyHSL.s, l: _varyHSL.l, r: Math.max(base.r, FLOOR), g: Math.max(base.g, FLOOR), b: Math.max(base.b, FLOOR) };
}
function tintAt(basis, vary, x, z, out) {
  const dh = (hash01(x, z, 1) - 0.5) * 2 * vary.h, ds = (hash01(x, z, 2) - 0.5) * 2 * vary.s, dl = (hash01(x, z, 3) - 0.5) * 2 * vary.l;
  return _varyTarget.setHSL((basis.h + dh + 1) % 1, THREE.MathUtils.clamp(basis.s + ds, 0, 1), THREE.MathUtils.clamp(basis.l + dl, 0.03, 0.97)), out.setRGB(_varyTarget.r / basis.r, _varyTarget.g / basis.g, _varyTarget.b / basis.b), out;
}
const TRY_BATCH = 120, ARC_OVERLAP = 0.03, ARC_PAD = 320, KITS = { "ri-narragansett": { seed: 20260809, props: [{ id: "pines", want: 1250, tries: 54e3, lodTier: "mid", test: (x, z, y, d) => d > 21 && y > WATERLINE + 6 && y < 120, parts: [{ geo: shared.trunk, material: barkMaterial(4863784), place: (p, m4, q, sc) => {
  const k = 1.7 + p.r * 1.5;
  sc.set(k * TRUNK_SLIM, k, k * TRUNK_SLIM), m4.compose(new THREE.Vector3(p.x, p.y + 1.2 * k, p.z), q, sc);
} }, { geos: shared.coniferSpecies, vary: shared.coniferCrown, material: canopyMaterial(3099172, { roughness: 0.9 }), place: (p, m4, q, sc) => {
  const k = 1.7 + p.r * 1.5, tall = 0.85 + p.r * 0.4;
  sc.set(k, k * tall, k), m4.compose(new THREE.Vector3(p.x, p.y + (2.4 + 2.7 * tall) * k, p.z), q, sc);
} }] }, { id: "sea-stacks", want: 150, tries: 26e3, lodTier: "far", test: (x, z, y, d) => d > 34 && y < WATERLINE + 1.2 && y > SEABED_Y + 5, parts: [{ geo: shared.rock, material: mat({ color: 7301218, roughness: 0.95, flatShading: true }), place: (p, m4, q, sc) => {
  const k = 1.8 + p.r * 4.6;
  sc.set(k * (0.7 + p.r * 0.6), k * (0.8 + p.r * 1.1), k * (0.7 + p.r * 0.5)), m4.compose(new THREE.Vector3(p.x, Math.max(p.y, WATERLINE - k * 0.35) + k * 0.45, p.z), q, sc);
} }] }, { id: "cove-moorings", want: 110, tries: 16e3, lodTier: "far", test: (x, z, y, d) => d > 28 && d < 260 && y < WATERLINE - 0.3 && y > SEABED_Y + 8, parts: [{ geo: shared.box, material: mat({ color: 15262420, roughness: 0.75 }), place: (p, m4, q, sc) => {
  sc.set(1.6 + p.r * 0.9, 0.85, 4.2 + p.r * 2.4), m4.compose(new THREE.Vector3(p.x, WATERLINE + 0.28, p.z), q, sc);
} }, { geo: shared.pole, material: mat({ color: 14210248, roughness: 0.55 }), place: (p, m4, q, sc) => {
  sc.set(0.55, 0.72, 0.55), m4.compose(new THREE.Vector3(p.x, WATERLINE + 3.5, p.z), q, sc);
} }] }, { id: "islands", want: 9, tries: 9e3, lodTier: "far", test: (x, z, y, d) => d > 620 && y < WATERLINE - 6, parts: [{ geo: shared.isle, material: mat({ color: 4871488, roughness: 1, flatShading: true }), place: (p, m4, q, sc) => {
  const k = 40 + p.r * 90;
  sc.set(k, k * (0.22 + p.r * 0.16), k * (0.7 + p.r * 0.6)), m4.compose(new THREE.Vector3(p.x, WATERLINE - k * 0.06, p.z), q, sc);
} }] }] }, "ct-mystic": { seed: 20260810, props: [{ id: "boat-houses", want: 90, tries: 22e3, lodTier: "mid", test: (x, z, y, d) => d > 24 && d < 90 && y > WATERLINE + 0.3 && y < WATERLINE + 14, parts: [{ geo: shared.box, material: mat({ color: 14998731, roughness: 0.85 }), place: (p, m4, q, sc) => {
  const w = 6 + p.r * 4, h = 4 + p.r * 3;
  sc.set(w, h, 7 + p.r * 4), m4.compose(new THREE.Vector3(p.x, p.y + h / 2, p.z), q, sc);
} }, { geo: shared.hipRoof, material: mat({ color: 9255732, roughness: 0.7 }), place: (p, m4, q, sc) => {
  const w = 6 + p.r * 4, h = 4 + p.r * 3;
  sc.set(w * 0.82, 2.4 + p.r, w * 0.82), m4.compose(new THREE.Vector3(p.x, p.y + h + 1.2 + p.r * 0.5, p.z), q, sc);
} }] }, { id: "oaks", want: 800, tries: 44e3, lodTier: "mid", test: (x, z, y, d) => d > 26 && y > WATERLINE + 4 && y < 90, parts: [{ geo: shared.trunk, material: barkMaterial(5456174), place: (p, m4, q, sc) => {
  const s = 2.2 + p.r * 1.5;
  sc.set(s * TRUNK_SLIM, s * 1.4, s * TRUNK_SLIM), m4.compose(new THREE.Vector3(p.x, p.y + 1.7 * s, p.z), q, sc);
} }, { geos: shared.treeSpeciesNear, vary: shared.treeCrown, material: canopyMaterial(4021292), place: (p, m4, q, sc) => {
  const s = 2.2 + p.r * 1.5, c = s * 1.75;
  sc.set(c, c * 0.82, c), m4.compose(new THREE.Vector3(p.x, p.y + 3 * s + c * 0.5, p.z), q, sc);
} }] }, { id: "moorings", want: 120, tries: 18e3, lodTier: "far", test: (x, z, y, d) => d > 30 && y < WATERLINE - 0.4 && y > SEABED_Y + 8, parts: [{ geo: shared.box, material: mat({ color: 15855590, roughness: 0.7 }), place: (p, m4, q, sc) => {
  sc.set(2.1 + p.r * 1.4, 1.1, 6.4 + p.r * 3.6), m4.compose(new THREE.Vector3(p.x, WATERLINE + 0.35, p.z), q, sc);
} }] }] }, "ct-thames-headland": { seed: 20260811, props: [{ id: "scrub-pines", want: 1100, tries: 5e4, lodTier: "mid", test: (x, z, y, d) => d > 19 && y > WATERLINE + 8 && y < 140, parts: [{ geo: shared.trunk, material: barkMaterial(4601130, { roughness: 0.96 }), place: (p, m4, q, sc) => {
  const k = 1.5 + p.r * 1.2;
  sc.set(k * TRUNK_SLIM, k, k * TRUNK_SLIM), m4.compose(new THREE.Vector3(p.x, p.y + 1.2 * k, p.z), q, sc);
} }, { geos: shared.coniferSpecies, vary: shared.coniferCrown, material: canopyMaterial(3754283, { roughness: 0.9 }), place: (p, m4, q, sc) => {
  const k = 1.5 + p.r * 1.2, tall = 0.7 + p.r * 0.35;
  sc.set(k, k * tall, k), m4.compose(new THREE.Vector3(p.x, p.y + (2.4 + 2.7 * tall) * k, p.z), q, sc);
} }] }, { id: "granite-outcrops", want: 260, tries: 26e3, lodTier: "mid", test: (x, z, y, d) => d > 24 && y > WATERLINE + 3, parts: [{ geo: shared.rock, material: mat({ color: 8222576, roughness: 0.98, flatShading: true }), place: (p, m4, q, sc) => {
  const k = 1.2 + p.r * 3.4;
  sc.set(k * (0.9 + p.r * 0.5), k * (0.5 + p.r * 0.5), k * (0.8 + p.r * 0.6)), m4.compose(new THREE.Vector3(p.x, p.y + k * 0.3, p.z), q, sc);
} }] }, { id: "sea-stacks", want: 180, tries: 26e3, lodTier: "far", test: (x, z, y, d) => d > 34 && y < WATERLINE + 1.2 && y > SEABED_Y + 5, parts: [{ geo: shared.rock, material: mat({ color: 6972253, roughness: 0.95, flatShading: true }), place: (p, m4, q, sc) => {
  const k = 2.2 + p.r * 5.2;
  sc.set(k * (0.7 + p.r * 0.6), k * (0.9 + p.r * 1.3), k * (0.7 + p.r * 0.5)), m4.compose(new THREE.Vector3(p.x, Math.max(p.y, WATERLINE - k * 0.35) + k * 0.45, p.z), q, sc);
} }] }] }, "ny-hudson-palisades": { seed: 20260812, props: [{ id: "hardwoods", want: 1400, tries: 58e3, lodTier: "mid", test: (x, z, y, d) => d > 27 && y > WATERLINE + 5 && y < 180, parts: [{ geo: shared.trunk, material: barkMaterial(5127468), place: (p, m4, q, sc) => {
  const s = 2.4 + p.r * 1.8;
  sc.set(s * TRUNK_SLIM, s * 1.6, s * TRUNK_SLIM), m4.compose(new THREE.Vector3(p.x, p.y + 1.9 * s, p.z), q, sc);
} }, { geos: shared.treeSpeciesNear, vary: shared.treeCrown, material: canopyMaterial(3493930), place: (p, m4, q, sc) => {
  const s = 2.4 + p.r * 1.8, c = s * 1.8;
  sc.set(c, c * 0.86, c), m4.compose(new THREE.Vector3(p.x, p.y + 3.4 * s + c * 0.5, p.z), q, sc);
} }] }, { id: "brick-row", want: 220, tries: 2e4, lodTier: "mid", test: (x, z, y, d) => d > 28 && d < 120 && y > WATERLINE + 2, parts: [{ geo: shared.box, material: facadeMaterial({ cls: "lowRise", wall: 9198149, glass: 3358797, seed: 41201 }), facade: true, place: (p, m4, q, sc) => {
  const h = 11 + p.r * 16;
  sc.set(11 + p.r * 6, h, 13 + p.r * 8), m4.compose(new THREE.Vector3(p.x, p.y + h / 2, p.z), q, sc);
} }] }, { id: "lamp-poles", want: 300, tries: 16e3, lodTier: "far", test: (x, z, y, d) => d > 17 && d < 34 && y > WATERLINE + 1, parts: [{ geo: shared.pole, material: mat({ color: 4936023, roughness: 0.6, metalness: 0.5 }), place: (p, m4, q, sc) => {
  sc.set(1, 1, 1), m4.compose(new THREE.Vector3(p.x, p.y + 4.5, p.z), q, sc);
} }, { geo: shared.lampHead, material: mat({ color: 4936023, roughness: 0.6, metalness: 0.5 }), place: (p, m4, q, sc) => {
  sc.set(1, 1, 1), m4.compose(new THREE.Vector3(p.x, p.y + 8.86, p.z), q, sc);
} }] }] }, "ny-east-river": { seed: 20260813, props: [{ id: "warehouses", want: 260, tries: 22e3, lodTier: "mid", test: (x, z, y, d) => d > 38 && d < 160 && y > WATERLINE + 1, parts: [{ geo: shared.box, material: facadeMaterial({ cls: "lowRise", wall: 8220515, glass: 2832194, seed: 41202 }), facade: true, place: (p, m4, q, sc) => {
  const h = 9 + p.r * 12;
  sc.set(18 + p.r * 14, h, 22 + p.r * 18), m4.compose(new THREE.Vector3(p.x, p.y + h / 2, p.z), q, sc);
} }] }, { id: "towers", want: 130, tries: 2e4, lodTier: "mid", test: (x, z, y, d) => d > 90 && y > WATERLINE + 2, parts: [{ geo: shared.tower, material: facadeMaterial({ cls: "tower", wall: 10134701, glass: 3688794, seed: 41203 }), facade: true, place: (p, m4, q, sc) => {
  const h = 48 + p.r * 150;
  sc.set(20 + p.r * 16, h, 20 + p.r * 16), m4.compose(new THREE.Vector3(p.x, p.y + h / 2, p.z), q, sc);
} }] }, { id: "pier-piles", want: 240, tries: 18e3, lodTier: "far", test: (x, z, y, d) => d > 26 && y < WATERLINE - 0.2 && y > SEABED_Y + 9, parts: [{ geo: shared.pole, material: mat({ color: 4141609, roughness: 0.98 }), place: (p, m4, q, sc) => {
  sc.set(1, 0.55, 1), m4.compose(new THREE.Vector3(p.x, WATERLINE + 1.2, p.z), q, sc);
} }] }] } }, VERGE_KITS = { "ri-narragansett": { seed: 20260901, scrub: 7174730, tuft: 9080658 }, "ct-mystic": { seed: 20260902, scrub: 5468223, tuft: 8227404 }, "ct-thames-headland": { seed: 20260903, scrub: 5204796, tuft: 7767370 }, "ny-hudson-palisades": { seed: 20260904, scrub: 4744505, tuft: 7307334 }, "ny-east-river": { seed: 20260905, scrub: 5923904, tuft: 7765070 } }, VERGE_NEAR = 15, SHOULDER_NEAR = 9, VERGE_FAR = 32, TARMAC_MARGIN = 0.9;
for (const [id, v] of Object.entries(VERGE_KITS)) KITS[id] && (KITS[id].props.push({ id: "shoulder", want: 65e3, tries: 14e4, lodTier: "mid", reach: 1.2, along: { near: SHOULDER_NEAR, far: VERGE_NEAR }, test: (x, z, y, d) => d > SHOULDER_NEAR && d < VERGE_NEAR && y > WATERLINE + 0.35, parts: [{ geo: shared.grassCards, material: foliageMaterial(v.tuft, { roughness: 1 }), place: (p, m4, q, sc) => {
  const k = 0.14 + THREE.MathUtils.clamp((p.d - SHOULDER_NEAR) / (VERGE_NEAR - SHOULDER_NEAR), 0, 1) * 0.16;
  sc.set(k * 2.5, k * 0.58, k * 2.5), m4.compose(new THREE.Vector3(p.x, p.y + 2.7 * k * 0.58, p.z), q, sc);
} }, { geo: shared.bushCrown, material: canopyMaterial(v.scrub, { roughness: 0.98 }), place: (p, m4, q, sc) => {
  const near = THREE.MathUtils.clamp((p.d - SHOULDER_NEAR) / (VERGE_NEAR - SHOULDER_NEAR), 0, 1);
  if (p.r < 0.66 || near < 0.25) {
    sc.copy(ZERO), m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, sc);
    return;
  }
  const k = 0.13 + near * 0.11;
  sc.set(k * 1.15, k * 1.05, k * 1.1), m4.compose(new THREE.Vector3(p.x, p.y + 1.361 * k * 0.92, p.z), q, sc);
} }] }), KITS[id].props.push({ id: "verge", want: 11e3, tries: 28e3, lodTier: "far", reach: 0.9, along: { near: VERGE_NEAR, far: VERGE_FAR }, test: (x, z, y, d) => d > VERGE_NEAR && d < VERGE_FAR && y > WATERLINE + 0.6, parts: [{ geo: shared.bushCrown, material: canopyMaterial(v.scrub, { roughness: 0.98 }), place: (p, m4, q, sc) => {
  const k = 0.18 + p.r * 0.2;
  sc.set(k * 1.22, k * 1.12, k * 1.14), m4.compose(new THREE.Vector3(p.x, p.y + 1.361 * k * 0.95, p.z), q, sc);
} }, { geo: shared.grassCards, material: foliageMaterial(v.tuft, { roughness: 1 }), place: (p, m4, q, sc) => {
  if (!(p.r > 0.12)) {
    sc.copy(ZERO), m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, sc);
    return;
  }
  const k = 0.16 + p.r * 0.13;
  sc.set(k * 2, k * 0.8, k * 2), m4.compose(new THREE.Vector3(p.x, p.y + 2.7 * k * 0.8, p.z), q, sc);
} }] }));
const ROADSIDE_KITS = { "ri-narragansett": { conifer: true, tree: 3362858, brush: 5005878 }, "ct-mystic": { conifer: false, tree: 4152363, brush: 5269818 }, "ct-thames-headland": { conifer: true, tree: 3952429, brush: 4874293 }, "ny-hudson-palisades": { conifer: false, tree: 3757612, brush: 5072696 }, "ny-east-river": { conifer: false, tree: 4282931, brush: 5465663 } };
for (const id of ["ri-narragansett", "ct-thames-headland"]) KITS[id].props.push({ id: "coastal-hardwoods", want: 1500, tries: 14e3, lodTier: "mid", along: { near: 27, far: 145 }, reach: 13, test: (x, z, y, d) => d > 27 && y > WATERLINE + 2 && y < 130, parts: KITS["ct-mystic"].props.find((p) => p.id === "oaks").parts });
for (const [id, v] of Object.entries(ROADSIDE_KITS)) KITS[id] && KITS[id].props.push({ id: "roadside-trees", want: 2200, tries: 11e3, lodTier: "mid", along: { near: 14, far: 48 }, test: (x, z, y, d) => d > 14 && d < 48 && y > WATERLINE + 2 && y < 130, parts: [{ geo: shared.trunk, material: barkMaterial(4930091), place: (p, m4, q, sc) => {
  const k = 0.5 + p.r * 0.6;
  sc.set(k * 0.75, k * 1.25, k * 0.75), m4.compose(new THREE.Vector3(p.x, p.y + 1.5 * k, p.z), q, sc);
} }, v.conifer ? { geos: shared.coniferSpecies, vary: shared.coniferCrown, material: canopyMaterial(v.tree, { roughness: 0.92 }), place: (p, m4, q, sc) => {
  const k = 0.5 + p.r * 0.6, tall = 0.9 + p.r * 0.35;
  sc.set(k, k * tall, k), m4.compose(new THREE.Vector3(p.x, p.y + (2.4 + 2.7 * tall) * k, p.z), q, sc);
} } : { geos: shared.treeSpecies, vary: shared.treeCrown, material: canopyMaterial(v.tree, { roughness: 0.92 }), place: (p, m4, q, sc) => {
  const k = 0.5 + p.r * 0.6, c = k * 1.7;
  sc.set(c, c * 0.86, c), m4.compose(new THREE.Vector3(p.x, p.y + 2.6 * k + c * 0.5, p.z), q, sc);
} }] }, { id: "roadside-brush", want: 3e3, tries: 13e3, lodTier: "far", along: { near: 13, far: 46 }, test: (x, z, y, d) => d > 14 && d < 44 && y > WATERLINE + 1.2, parts: [{ geo: shared.bushCrown, material: canopyMaterial(v.brush, { roughness: 0.97 }), place: (p, m4, q, sc) => {
  if (p.r > 0.6) {
    sc.copy(ZERO), m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, sc);
    return;
  }
  const k = 0.62 + p.r * 1.1;
  sc.set(k * 1.25, k * 0.78, k * 1.15), m4.compose(new THREE.Vector3(p.x, p.y + 1.361 * 0.78 * k * 0.9, p.z), q, sc);
} }] });
const BOROUGH_KITS = { "nyc-bronx": { seed: 20260814, tone: 9072476, roof: 6048317, low: [10, 22], high: [26, 70], density: 300, towers: 40, cls: "lowRise", glass: 3555402 }, "nyc-queens": { seed: 20260815, tone: 10126708, roof: 6968906, low: [8, 16], high: [22, 54], density: 340, towers: 26, cls: "lowRise", glass: 3818576 }, "nyc-brooklyn": { seed: 20260816, tone: 9398872, roof: 5193784, low: [9, 20], high: [24, 62], density: 320, towers: 34, cls: "lowRise", glass: 3358539 }, "nyc-staten": { seed: 20260817, tone: 11048580, roof: 7166796, low: [7, 13], high: [16, 34], density: 220, towers: 10, cls: "lowRise", glass: 4213333 }, "nyc-manhattan": { seed: 20260818, tone: 9546430, roof: 7371396, low: [32, 86], high: [110, 290], density: 260, towers: 165, cls: "tower", glass: 3233646 } };
for (const [id, k] of Object.entries(BOROUGH_KITS)) KITS[id] = { seed: k.seed, props: [{ id: "blocks", want: k.density, tries: 24e3, lodTier: "mid", test: (x, z, y, d) => d > 32 && d < 200 && y > WATERLINE + 1, parts: [{ geo: shared.box, material: facadeMaterial({ cls: k.cls, wall: k.tone, glass: k.glass, seed: k.seed }), facade: true, place: (p, m4, q, sc) => {
  const h = k.low[0] + p.r * (k.low[1] - k.low[0]);
  sc.set(14 + p.r * 10, h, 16 + p.r * 12), m4.compose(new THREE.Vector3(p.x, p.y + h / 2, p.z), q, sc);
} }, { geo: shared.box, material: mat({ color: k.roof, roughness: 0.95 }), place: (p, m4, q, sc) => {
  const h = k.low[0] + p.r * (k.low[1] - k.low[0]);
  sc.set(14.4 + p.r * 10, 0.7, 16.4 + p.r * 12), m4.compose(new THREE.Vector3(p.x, p.y + h + 0.35, p.z), q, sc);
} }] }, { id: "foot", want: Math.round(k.density * 2.2), tries: 3e4, lodTier: "mid", test: (x, z, y, d) => d > 34 && d < 150 && y > WATERLINE + 1, parts: [{ geo: shared.box, material: facadeMaterial({ cls: id === "nyc-manhattan" ? "tower" : "lowRise", wall: k.tone, glass: k.glass, seed: k.seed + 31 }), facade: true, place: (p, m4, q, sc) => {
  const h = 4 + p.r * 9;
  sc.set(8 + p.r * 5, h, 9 + p.r * 6), m4.compose(new THREE.Vector3(p.x, p.y + h / 2, p.z), q, sc);
} }, { geo: shared.box, material: mat({ color: k.roof, roughness: 0.95 }), place: (p, m4, q, sc) => {
  const h = 4 + p.r * 9;
  sc.set(8.3 + p.r * 5, 0.5, 9.3 + p.r * 6), m4.compose(new THREE.Vector3(p.x, p.y + h + 0.25, p.z), q, sc);
} }] }, { id: "skyline", want: k.towers, tries: 2e4, lodTier: "mid", test: (x, z, y, d) => d > 120 && d < 420 && y > WATERLINE + 2, parts: [{ geo: shared.tower, material: facadeMaterial({ cls: "tower", wall: 9937580, glass: k.glass, seed: k.seed + 7 }), facade: true, place: (p, m4, q, sc) => {
  const h = k.high[0] + p.r * (k.high[1] - k.high[0]);
  sc.set(18 + p.r * 18, h, 18 + p.r * 18), m4.compose(new THREE.Vector3(p.x, p.y + h / 2, p.z), q, sc);
} }] }] };
for (const id of Object.keys(BOROUGH_KITS)) KITS[id].props.push({ id: "shoulder", want: 6200, tries: 16e3, lodTier: "mid", reach: 0.6, along: { near: SHOULDER_NEAR, far: VERGE_NEAR }, test: (x, z, y, d) => d > SHOULDER_NEAR && d < VERGE_NEAR && y > WATERLINE + 0.35, parts: [{ geo: shared.grassCards, material: foliageMaterial(7238480, { roughness: 1 }), place: (p, m4, q, sc) => {
  const k = 0.13 + THREE.MathUtils.clamp((p.d - SHOULDER_NEAR) / (VERGE_NEAR - SHOULDER_NEAR), 0, 1) * 0.15;
  sc.set(k, k * (1.1 + p.r * 0.7), k), m4.compose(new THREE.Vector3(p.x, p.y + 2.7 * k * 0.94, p.z), q, sc);
} }, { geo: shared.bushCrown, material: canopyMaterial(6054729, { roughness: 0.98 }), place: (p, m4, q, sc) => {
  const near = THREE.MathUtils.clamp((p.d - SHOULDER_NEAR) / (VERGE_NEAR - SHOULDER_NEAR), 0, 1);
  if (p.r < 0.72 || near < 0.3) {
    sc.copy(ZERO), m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, sc);
    return;
  }
  const k = 0.12 + near * 0.1;
  sc.set(k * 1.15, k * 1, k * 1.1), m4.compose(new THREE.Vector3(p.x, p.y + 1.361 * k * 0.92, p.z), q, sc);
} }] }), KITS[id].props.push({ id: "verge", want: 5e3, tries: 15e3, lodTier: "far", reach: 0.9, along: { near: VERGE_NEAR, far: VERGE_FAR }, test: (x, z, y, d) => d > VERGE_NEAR && d < VERGE_FAR && y > WATERLINE + 0.6, parts: [{ geo: shared.bushCrown, material: canopyMaterial(6054729, { roughness: 0.98 }), place: (p, m4, q, sc) => {
  const k = 0.16 + p.r * 0.18;
  sc.set(k * 1.5, k * 0.7, k * 1.35), m4.compose(new THREE.Vector3(p.x, p.y + 1.6 * k * 0.48, p.z), q, sc);
} }, { geo: shared.grassCards, material: foliageMaterial(7238480, { roughness: 1 }), place: (p, m4, q, sc) => {
  if (!(p.r > 0.66)) {
    sc.copy(ZERO), m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, sc);
    return;
  }
  const k = 0.15 + p.r * 0.12;
  sc.set(k, k * (1.1 + p.r * 0.8), k), m4.compose(new THREE.Vector3(p.x, p.y + 2.7 * k, p.z), q, sc);
} }] });
const KIT_IDS = Object.keys(KITS);
function hasKit(id) {
  return Object.prototype.hasOwnProperty.call(KITS, id);
}
for (const [id, kit] of Object.entries(KITS)) kit.props.push({ id: "wildflowers", want: id.startsWith("nyc") ? 1300 : 3200, tries: 18e3, lodTier: "mid", reach: 0.6, along: { near: 11, far: 28 }, test: (x, z, y, d) => d > 11 && d < 28 && y > WATERLINE + 0.5 && Math.sin(x * 0.032) + Math.cos(z * 0.047) > 0.15, parts: [{ geo: shared.flowers, material: mat({ color: 14737632, vertexColors: true, roughness: 1, side: THREE.DoubleSide }), place: (p, m4, q, sc) => {
  const k = 0.8 + p.r * 0.5;
  sc.setScalar(k), m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, sc);
} }] });
class Scenery {
  constructor(scene, terrain, kitId, qualityLevel = 0, opts = {}) {
    this.scene = scene, this.terrain = terrain, this.kitId = kitId, this.qualityLevel = qualityLevel, this.reserved = terrain.stage.landmarks.filter((row) => row.kind !== "ridge").map((row) => {
      const curve = terrain.roads.legs[row.leg] || terrain.roads.legs.main, p = curve.getPointAt(row.at), t = curve.getTangentAt(row.at), side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), t).normalize();
      return p.addScaledVector(side, row.offset).addScaledVector(t, row.forward || 0), { x: p.x, z: p.z, cos: Math.cos(row.heading), sin: Math.sin(row.heading), hx: row.footprint.w * (row.kind === "span" ? 0.85 : 0.5) * (row.scale || 1), hz: row.footprint.d * 0.5 * (row.scale || 1) };
    }), this.meshes = [], this.instanceCount = 0, this.missing = !hasKit(kitId), this.built = false, this.arc = opts.arc ? { lo: opts.arc[0] - ARC_OVERLAP, hi: opts.arc[1] + ARC_OVERLAP, span: opts.arc[1] - opts.arc[0] } : null, !this.missing && (opts.defer || this._build(KITS[kitId], qualityLevel));
  }
  *finishSteps() {
    if (this.missing || this.built) return;
    const steps = this._buildSteps(KITS[this.kitId], this.qualityLevel);
    let r = steps.next();
    for (; !r.done; ) yield r.value || "scenery", r = steps.next();
  }
  _build(kit, qualityLevel) {
    const steps = this._buildSteps(kit, qualityLevel);
    for (; !steps.next().done; ) ;
  }
  _roadTable() {
    if (this._roads) return this._roads;
    const N = 600;
    return this._roads = Object.values(this.terrain.roads.legs).map((curve) => {
      const px = new Float64Array(N), pz = new Float64Array(N), nx = new Float64Array(N), nz = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1), p = curve.getPointAt(t), g = curve.getTangentAt(t);
        px[i] = p.x, pz[i] = p.z;
        const l = Math.hypot(g.x, g.z) || 1;
        nx[i] = -g.z / l, nz[i] = g.x / l;
      }
      return { n: N, length: curve.getLength(), px, pz, nx, nz };
    }), this._roads;
  }
  *_buildSteps(kit, qualityLevel) {
    const rnd = rng(kit.seed), scale = sceneryDensity(qualityLevel), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), axis = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), box = this.arc ? this.terrain.arcBounds(this.arc.lo, this.arc.hi, ARC_PAD) : this.terrain.world, density = this.arc ? Math.min(1, (this.arc.span + 2 * ARC_OVERLAP) * 2) : 1;
    for (const prop of kit.props) {
      const want = Math.max(1, Math.round(prop.want * scale * density)), reach = prop.parts.some(part => part.facade) ? Math.max(64, prop.reach || 0) : prop.reach ?? 3, spots = [], legs = prop.along ? this._roadTable() : null, legTotal = legs ? legs.reduce((a, l) => a + l.length, 0) : 0;
      for (let i = 0; i < prop.tries && spots.length < want; i++) {
        i && i % TRY_BATCH === 0 && (yield `scenery.tries:${prop.id}`);
        let x, z;
        if (legs && legTotal > 0) {
          let pick = rnd() * legTotal, li = 0;
          for (; li < legs.length - 1 && pick > legs[li].length; ) pick -= legs[li].length, li++;
          const tbl = legs[li], k = Math.min(tbl.n - 1, rnd() * tbl.n | 0), side = rnd() < 0.5 ? -1 : 1, lat = prop.along.near + rnd() * (prop.along.far - prop.along.near);
          x = tbl.px[k] + tbl.nx[k] * lat * side, z = tbl.pz[k] + tbl.nz[k] * lat * side;
        } else x = box.minX + rnd() * (box.maxX - box.minX), z = box.minZ + rnd() * (box.maxZ - box.minZ);
        if (!this.terrain.owns(x, z) || this.reserved.some((b) => {
          const dx = x - b.x, dz = z - b.z;
          return Math.abs(dx * b.cos - dz * b.sin) < b.hx + reach + 9 && Math.abs(dx * b.sin + dz * b.cos) < b.hz + reach + 9;
        })) continue;
        const s = this.terrain.sample(x, z);
        if (this.arc && (s.t < this.arc.lo || s.t > this.arc.hi)) continue;
        if (this.arc) {
          if (!this.terrain.districtSamples) {
            const curve = this.terrain.roads.legs.main, n = Math.max(200, Math.ceil(curve.getLength() / 8));
            this.terrain.districtSamples = Array.from({ length: n + 1 }, (_, i2) => {
              const p = curve.getPointAt(i2 / n);
              return { x: p.x, z: p.z, t: i2 / n };
            });
          }
          let nearest = 1 / 0, arc = 0;
          for (const p of this.terrain.districtSamples) {
            const d = (x - p.x) ** 2 + (z - p.z) ** 2;
            d < nearest && (nearest = d, arc = p.t);
          }
          if (arc < this.arc.lo || arc > this.arc.hi) continue;
        }
        const y = this.terrain.heightFrom(s, x, z), legName = s.li >= 0 ? this.terrain.legOrder[s.li] : null;
        if (legName && s.d < this.terrain.roads.halfRoadAt(legName, s.t) + TARMAC_MARGIN + reach) continue;
        const woody = /tree|pine|oak|hardwood|brush/.test(prop.id), grove = 0.12 + 0.84 * Math.pow(0.5 + 0.5 * Math.sin(x * 0.013 + Math.sin(z * 0.011)) * Math.cos(z * 0.012), 1.5);
        if (!(woody && hash01(x, z, 14) > grove) && prop.test(x, z, y, s.d)) {
          const plantY = legName && s.d < this.terrain.roads.halfRoadAt(legName, s.t) + 4.5 && this.terrain.roads.bridgeMix(legName, s.t) < 0.01 ? Math.max(y, s.y - 0.06) : y;
          spots.push({ x, y: plantY, z, d: s.d, r: rnd(), a: rnd() * Math.PI * 2 });
        }
      }
      if (yield `scenery.place:${prop.id}`, !!spots.length) {
        for (const part of prop.parts) {
          const shapes = part.geos || [part.geo], buckets = shapes.map(() => []);
          for (const p of spots) {
            const which = shapes.length === 1 ? 0 : Math.min(shapes.length - 1, Math.floor(hash01(p.x, p.z, 9) * shapes.length));
            buckets[which].push(p);
          }
          for (let v = 0; v < shapes.length; v++) {
            if (!buckets[v].length) continue;
            const geometry = shapes[v](), cells =  new Map();
            for (const p of buckets[v]) {
              const key = `${Math.floor(p.x / 360)},${Math.floor(p.z / 360)}`;
              cells.has(key) || cells.set(key, []), cells.get(key).push(p);
            }
            for (const mine of cells.values()) {
              const mesh = new THREE.InstancedMesh(geometry, part.material, mine.length);
              mesh.userData.groundHeights = new Float32Array(mine.length);
              const vary = part.facade ? null : VARY.get(part.vary || shapes[v]), basis = vary ? tintBasis(part.material.color) : null;
              let count = 0;
              mine.forEach((p) => {
                if (q.setFromAxisAngle(axis, p.a), part.place(p, m4, q, sc), sc.lengthSq() !== 0) {
                  if (mesh.setMatrixAt(count, m4), mesh.userData.groundHeights[count] = p.y, vary && mesh.setColorAt(count, tintAt(basis, vary, p.x, p.z, sceneryTint)), part.facade) {
                    const tones = [16777215, 12635090, 14862251, 10726829, 12818302, 11386825];
                    mesh.setColorAt(count, new THREE.Color(tones[Math.floor(hash01(p.x, p.z, 26) * tones.length)]));
                  }
                  count++;
                }
              }), mesh.count = count, mesh.instanceColor && (mesh.instanceColor.needsUpdate = true), mesh.castShadow = true, mesh.receiveShadow = true, mesh.instanceMatrix.needsUpdate = true, mesh.computeBoundingSphere(), mesh.userData.lodTier = prop.lodTier, mesh.userData.propId = prop.id, mesh.userData.facade = !!part.facade, this.scene.add(mesh), this.meshes.push(mesh), yield `scenery.batch:${prop.id}`;
            }
          }
        }
        this.instanceCount += spots.length;
      }
    }
    this.built = true;
  }
  setVisible(visible) {
    for (const m of this.meshes) m.visible = visible;
  }
  cullToOwnedGround() {
    if (!this.meshes.length) return 0;
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    let dropped = 0;
    const bounds = new THREE.Box3(), centre = new THREE.Vector3(), size = new THREE.Vector3();
    for (const mesh of this.meshes) {
      mesh.geometry.boundingBox || mesh.geometry.computeBoundingBox();
      let touched = false;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m), p.setFromMatrixPosition(m);
        let clear = this.terrain.owns(p.x, p.z);
        const planted = mesh.userData.groundHeights?.[i];
        if (clear && planted > WATERLINE + 0.5 && this.terrain.roadProtectors?.size) {
          const ground = this.terrain.renderedHeightAt(p.x, p.z);
          ground <= WATERLINE + 0.5 ? clear = false : Math.fround(ground) !== planted && (m.elements[13] += ground - planted, mesh.userData.groundHeights[i] = ground, mesh.setMatrixAt(i, m), touched = true);
        }
        if (clear && this.terrain.roadProtectors?.size) {
          instanceBounds(mesh.geometry.boundingBox, m, bounds), bounds.getCenter(centre), bounds.getSize(size);
          const reach = Math.hypot(size.x, size.z) / 2;
          for (const other of this.terrain.roadProtectors) {
            if (other.distanceAt(centre.x, centre.z) > other.roads.roadWidth / 2 + reach + 20) continue;
            const road = other.sample(centre.x, centre.z);
            if (road.d < other.roads.roadWidth / 2 + reach + 0.3 && bounds.max.y > road.y - 0.2 && bounds.min.y < road.y + 5.5) {
              clear = false;
              break;
            }
          }
        }
        clear || (m.scale(ZERO), mesh.setMatrixAt(i, m), touched = true, dropped++);
      }
      touched && (mesh.instanceMatrix.needsUpdate = true, mesh.computeBoundingSphere());
    }
    return dropped;
  }
  *prepareGroundCull(terrain = this.terrain) {
    if (!this.meshes.length) return () => 0;
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    let dropped = 0;
    const updates = [], bounds = new THREE.Box3(), centre = new THREE.Vector3(), size = new THREE.Vector3();
    for (const mesh of this.meshes) {
      mesh.geometry.boundingBox || mesh.geometry.computeBoundingBox();
      let touched = false;
      const changes = [], completeBounds = new THREE.Box3();
      for (let i = 0; i < mesh.count; i++) {
        i % 128 === 0 && (yield "scenery.reconcile"), mesh.getMatrixAt(i, m), p.setFromMatrixPosition(m);
        let clear = terrain.owns(p.x, p.z);
        const planted = mesh.userData.groundHeights?.[i];
        if (clear && planted > WATERLINE + 0.5 && terrain.roadProtectors?.size) {
          const ground = terrain.renderedHeightAt(p.x, p.z);
          ground <= WATERLINE + 0.5 ? clear = false : Math.fround(ground) !== planted && (m.elements[13] += ground - planted, changes.push({ index: i, matrix: m.clone(), ground }), touched = true);
        }
        if (clear && terrain.roadProtectors?.size) {
          instanceBounds(mesh.geometry.boundingBox, m, bounds), bounds.getCenter(centre), bounds.getSize(size);
          const reach = Math.hypot(size.x, size.z) / 2;
          for (const other of terrain.roadProtectors) {
            if (other.distanceAt(centre.x, centre.z) > other.roads.roadWidth / 2 + reach + 20) continue;
            const road = other.sample(centre.x, centre.z);
            if (road.d < other.roads.roadWidth / 2 + reach + 0.3 && bounds.max.y > road.y - 0.2 && bounds.min.y < road.y + 5.5) {
              clear = false;
              break;
            }
          }
        }
        if (clear) {
          (m.elements[0] || m.elements[1] || m.elements[2]) && (instanceBounds(mesh.geometry.boundingBox, m, bounds), completeBounds.union(bounds));
          continue;
        }
        m.scale(ZERO), changes.push({ index: i, matrix: m.clone() }), touched = true, dropped++;
      }
      touched && updates.push({ mesh, changes, sphere: completeBounds.getBoundingSphere(new THREE.Sphere()) });
    }
    let applied = false;
    return () => {
      if (applied) return 0;
      applied = true;
      for (const { mesh, changes, sphere } of updates) {
        for (const change of changes) mesh.setMatrixAt(change.index, change.matrix), change.ground !== void 0 && (mesh.userData.groundHeights[change.index] = change.ground);
        mesh.instanceMatrix.needsUpdate = true, mesh.boundingSphere = sphere;
      }
      return dropped;
    };
  }
  dispose() {
    const geometries =  new Set();
    for (const m of this.meshes) this.scene.remove(m), geometries.has(m.geometry) || (geometries.add(m.geometry), m.geometry.dispose()), m.dispose();
    this.meshes.length = 0;
  }
}
export {
  ARC_OVERLAP,
  KIT_IDS,
  Scenery,
  hasKit
};
