import * as THREE from "three";
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
}
const FACADE_CLASSES = Object.freeze({ lowRise: { cols: 5, rows: 5, px: 256 }, midRise: { cols: 7, rows: 11, px: 512 }, tower: { cols: 9, rows: 22, px: 512 } }), cache =  new Map();
function buildMaps({ cls, wall, glass, seed }) {
  const spec = FACADE_CLASSES[cls] || FACADE_CLASSES.midRise, { cols, rows, px } = spec, wallCss = `#${wall.toString(16).padStart(6, "0")}`, glassCss = `#${glass.toString(16).padStart(6, "0")}`, colour = document.createElement("canvas");
  colour.width = colour.height = px;
  const c = colour.getContext("2d"), refl = document.createElement("canvas");
  refl.width = refl.height = px;
  const r = refl.getContext("2d");
  if (c.fillStyle = wallCss, c.fillRect(0, 0, px, px), cls !== "tower") {
    const brick = rng(seed + 91);
    for (let y = 0; y < px; y += 6) for (let x = -24; x < px; x += 24) {
      const offset = Math.floor(y / 6) % 2 * 12;
      c.fillStyle = brick() > 0.5 ? "rgba(255,239,209,.07)" : "rgba(31,25,22,.10)", c.fillRect(x + offset, y, 23, 5), c.fillStyle = "rgba(220,211,193,.12)", c.fillRect(x + offset, y + 5, 24, 1);
    }
  }
  r.fillStyle = "rgb(0,235,0)", r.fillRect(0, 0, px, px);
  const cw = px / cols, ch = px / rows, insetX = cw * 0.22, insetY = ch * 0.26, rnd = rng(seed);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = i * cw + insetX, y = j * ch + insetY, w = cw - insetX * 2, h = ch - insetY * 2, k = 0.82 + rnd() * 0.36;
      c.fillStyle = glassCss, c.globalAlpha = Math.min(1, k), c.fillRect(x, y, w, h), c.globalAlpha = 1;
      const rough = Math.round(58 + rnd() * 38), metal = Math.round(72 + rnd() * 32);
      r.fillStyle = `rgb(0,${rough},${metal})`, r.fillRect(x, y, w, h);
    }
    c.fillStyle = "rgba(0,0,0,0.16)", c.fillRect(0, j * ch + ch - Math.max(1, ch * 0.04), px, Math.max(1, ch * 0.04));
  }
  const map = new THREE.CanvasTexture(colour);
  map.colorSpace = THREE.SRGBColorSpace, map.wrapS = map.wrapT = THREE.RepeatWrapping, map.anisotropy = 8;
  const orm = new THREE.CanvasTexture(refl);
  return orm.colorSpace = THREE.NoColorSpace, orm.wrapS = orm.wrapT = THREE.RepeatWrapping, orm.anisotropy = 4, { map, orm };
}
function facadeMaterial({ cls, wall, glass = 2898762, seed }) {
  const key = `${cls}:${wall}:${glass}:${seed}`;
  cache.has(key) || cache.set(key, buildMaps({ cls, wall, glass, seed }));
  const { map, orm } = cache.get(key);
  return new THREE.MeshStandardMaterial({ map, roughness: 1, roughnessMap: orm, metalness: 1, metalnessMap: orm, envMapIntensity: 1 });
}
function facadeCacheSize() {
  return cache.size;
}
function facadeCanvases() {
  return [...cache.values()].map(({ orm }) => orm.image);
}
export {
  facadeCacheSize,
  facadeCanvases,
  facadeMaterial
};
