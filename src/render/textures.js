import * as THREE from "three";
const BASE = "assets/textures/", loader = new THREE.TextureLoader(), all = [];
let users = [], pending = 0, settled = false;
const failed =  new Set();
function resolved() {
  --pending > 0 || (settled = true, users = []);
}
function preserveAlphaCoverage(t, alphaTest) {
  const img = t.image;
  if (!img || !img.width || !img.height) return;
  const cut = alphaTest * 255, read = (source, w2, h2) => {
    const c = document.createElement("canvas");
    c.width = w2, c.height = h2;
    const g = c.getContext("2d", { willReadFrequently: true });
    return g.drawImage(source, 0, 0, w2, h2), { canvas: c, data: g.getImageData(0, 0, w2, h2).data };
  }, coverage = (data, scale) => {
    let n = 0;
    for (let i = 0; i < data.length; i += 4) data[i] * scale >= cut && n++;
    return n / (data.length / 4);
  };
  let w = img.width, h = img.height;
  const top = read(img, w, h), target = coverage(top.data, 1);
  if (target <= 0 || target >= 1) return;
  const mips = [top.canvas];
  let src = top.data;
  for (; w > 1 || h > 1; ) {
    const nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1), down = new Uint8ClampedArray(nw * nh * 4);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      let sum = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const sx = Math.min(w - 1, x * 2 + dx), sy = Math.min(h - 1, y * 2 + dy);
        sum += src[(sy * w + sx) * 4];
      }
      const k = (y * nw + x) * 4;
      down[k] = down[k + 1] = down[k + 2] = sum / 4, down[k + 3] = 255;
    }
    let lo = 0, hi = 16;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      coverage(down, mid) < target ? lo = mid : hi = mid;
    }
    const scale = (lo + hi) / 2, out = new Uint8ClampedArray(down.length);
    for (let i = 0; i < down.length; i += 4) {
      const v = Math.min(255, down[i] * scale);
      out[i] = out[i + 1] = out[i + 2] = v, out[i + 3] = 255;
    }
    const c = document.createElement("canvas");
    c.width = nw, c.height = nh, c.getContext("2d").putImageData(new ImageData(out, nw, nh), 0, 0), mips.push(c), src = down, w = nw, h = nh;
  }
  t.mipmaps = mips, t.generateMipmaps = false, t.minFilter = THREE.LinearMipmapLinearFilter, t.needsUpdate = true;
}
function map(file, o = {}) {
  pending++;
  const t = loader.load(BASE + file, (tex) => {
    o.coverage && preserveAlphaCoverage(tex, o.coverage), resolved();
  }, void 0, () => onFailure(t, file));
  return t.wrapS = o.clamp || o.clampX ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping, t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping, o.repeat && t.repeat.set(o.repeat[0], o.repeat[1]), o.srgb && (t.colorSpace = THREE.SRGBColorSpace), t.anisotropy = 8, all.push(t), t;
}
function onFailure(t, file) {
  failed.add(t), console.warn(`[textures] ${file} did not load. That surface falls back to flat colour.`);
  for (const u of users) u.texture === t && (u.material[u.key] = null, u.key === "map" && u.fallbackHex !== void 0 && u.material.color.setHex(u.fallbackHex), u.material.needsUpdate = true);
  resolved();
}
const ROAD = { map: map("road_color.webp", { srgb: true, clampX: true }), normalMap: map("road_normal.webp", { clampX: true }), roughnessMap: map("road_rough.webp", { clampX: true }) }, GROUND = { map: map("ground_color.webp", { srgb: true, repeat: [2, 2] }), normalMap: map("ground_normal.webp", { repeat: [2, 2] }), roughnessMap: map("ground_rough.webp", { repeat: [2, 2] }) }, TERRAIN = { map: map("terrain_color.webp", { srgb: true }), normalMap: map("terrain_normal.webp"), roughnessMap: map("terrain_rough.webp") }, FOLIAGE_ALPHA_TEST = 0.42, GRASS = { map: map("grass_color.webp", { srgb: true, clamp: true }), alphaMap: map("grass_alpha.webp", { clamp: true, coverage: FOLIAGE_ALPHA_TEST }) }, LEAVES = { map: map("leaves_color.webp", { srgb: true, clamp: true }), alphaMap: map("leaves_alpha.webp", { clamp: true, coverage: FOLIAGE_ALPHA_TEST }) }, BARK = { map: map("bark_color.webp", { srgb: true, repeat: [3, 2.5] }), normalMap: map("bark_normal.webp", { repeat: [3, 2.5] }), roughnessMap: map("bark_rough.webp", { repeat: [3, 2.5] }) };
function applyMaps(material, maps, fallbackHex) {
  for (const key of Object.keys(maps)) {
    const t = maps[key];
    settled || users.push({ material, key, texture: t, fallbackHex }), failed.has(t) ? (material[key] = null, key === "map" && fallbackHex !== void 0 && material.color.setHex(fallbackHex)) : material[key] = t;
  }
  return material.needsUpdate = true, material;
}
function applyAnisotropy(renderer) {
  const max = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  for (const t of all) t.anisotropy !== max && (t.anisotropy = max, t.needsUpdate = true);
}
export {
  BARK,
  FOLIAGE_ALPHA_TEST,
  GRASS,
  GROUND,
  LEAVES,
  ROAD,
  TERRAIN,
  applyAnisotropy,
  applyMaps
};
