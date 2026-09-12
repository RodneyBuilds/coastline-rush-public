import * as THREE from "three";
import { GRASS, LEAVES, BARK, applyMaps, FOLIAGE_ALPHA_TEST } from "../render/textures.js";
import { coniferCrown, treeCrown, bushCrown } from "./leafGeometry.js";
const FOLIAGE_MEAN = 0.58, BARK_MEAN = 0.62, KIT_CHROMA = 0.2;
function kitMultiplier(hex, mean, chroma) {
  const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
  return c.getHSL(hsl), c.setHSL(hsl.h, hsl.s * chroma, hsl.l), c.multiplyScalar(1 / mean);
}
function cell(i, sheetPx) {
  const inset = 1 / sheetPx, cx = i % 2, cy = i >> 1 & 1;
  return { u0: cx * 0.5 + inset, v0: cy * 0.5 + inset, u1: cx * 0.5 + 0.5 - inset, v1: cy * 0.5 + 0.5 - inset };
}
function builder(sheetPx = 1024) {
  const pos = [], nrm = [], uv = [], idx = [];
  return { quad(p, n, c) {
    const { u0, v0, u1, v1 } = cell(c, sheetPx), base = pos.length / 3, uvs = [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    for (let i = 0; i < 4; i++) pos.push(p[i].x, p[i].y, p[i].z), nrm.push(n[i].x, n[i].y, n[i].z), uv.push(uvs[i][0], uvs[i][1]);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }, done() {
    const g = new THREE.BufferGeometry();
    return g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)), g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)), g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)), g.setIndex(idx), g.computeBoundingSphere(), g;
  } };
}
function bentNormal(at, flat, centre, round) {
  const out = at.clone().sub(centre);
  return out.lengthSq() < 1e-6 && out.copy(flat), out.normalize(), out.multiplyScalar(round).addScaledVector(flat, 1 - round).normalize();
}
function grassCards() {
  const b = builder(512), centre = new THREE.Vector3(0, -1.2, 0);
  let c = 0;
  const LEAN = [0.14, -0.11, 0.05], RISE = [1, 0.79, 0.63];
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI / 3, across = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), W = 1.5, BOTTOM = -2.7, TOP = 2.7, root = W * 0.4, tip = W * 0.86, lean = W * LEAN[i], top = BOTTOM + (TOP - BOTTOM) * RISE[i], p = [across.clone().multiplyScalar(-root).setY(BOTTOM), across.clone().multiplyScalar(-tip + lean).setY(top), across.clone().multiplyScalar(tip + lean).setY(top), across.clone().multiplyScalar(root).setY(BOTTOM)], flat = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), n = p.map((v) => bentNormal(v, flat, centre, 0.5).add(new THREE.Vector3(0, 1.1, 0)).normalize());
    b.quad(p, n, c++ % 4);
  }
  return b.done();
}
function roundedFoliageLighting(material) {
  return material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
normal *= faceDirection;`);
  }, material.customProgramCacheKey = () => "rounded-foliage-v1", material;
}
function canopyMaterial(hex, opts = {}) {
  const color = new THREE.Color(hex).lerp(new THREE.Color(16777215), 0.34), m = new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.92, metalness: 0, side: THREE.DoubleSide, vertexColors: true, alphaTest: FOLIAGE_ALPHA_TEST, alphaToCoverage: true, envMapIntensity: 0.6, emissive: new THREE.Color(2504986), emissiveIntensity: 0.18 });
  return m.userData.foliage = true, roundedFoliageLighting(applyMaps(m, LEAVES, hex));
}
function foliageMaterial(hex, opts = {}) {
  const colour = kitMultiplier(hex, FOLIAGE_MEAN, KIT_CHROMA), m = new THREE.MeshStandardMaterial({ color: colour, roughness: opts.roughness === void 0 ? 0.92 : opts.roughness, metalness: 0, envMapIntensity: 0.25, emissive: new THREE.Color(2700571), emissiveIntensity: 0.5, side: THREE.DoubleSide, alphaTest: opts.alphaTest === void 0 ? FOLIAGE_ALPHA_TEST : opts.alphaTest });
  return roundedFoliageLighting(applyMaps(m, GRASS, hex));
}
function barkMaterial(hex, opts = {}) {
  const colour = kitMultiplier(hex, BARK_MEAN, KIT_CHROMA * 1.6), m = new THREE.MeshStandardMaterial({ color: colour, roughness: opts.roughness === void 0 ? 0.95 : opts.roughness, metalness: 0, normalScale: new THREE.Vector2(1, 1) });
  return applyMaps(m, BARK, hex);
}
export {
  barkMaterial,
  bushCrown,
  canopyMaterial,
  coniferCrown,
  foliageMaterial,
  grassCards,
  treeCrown
};
