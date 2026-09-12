import * as THREE from "three";
import { WATERLINE } from "../physics/constants.js";
import { SEABED_Y } from "./ocean.js";
import { TERRAIN, applyMaps } from "../render/textures.js";
import { makeGroundMaterial } from "../render/groundShader.js";
const ROAD_CORRIDOR = 13, CORRIDOR_DROP = 0.45, ROAD_SAMPLE_STEP = 6, BUCKET = 40, SHORE_BUCKET = 90, FAR_BUCKET = 400, CELL = 9.5, TERRAIN_TILE = 5, MESH_BAND = 3, WORLD_MARGIN = 540, BEACH_REACH = 16, BEACH_FADE = 14, CLIP_SKIP = CELL * 2, BANK_RUN = 60, ROAD_KEEP = 34, ROAD_KEEP_FADE = 66, APPROACH_MARGIN = 150, smooth = (k) => k * k * (3 - 2 * k);
let terrainOrder = 0;
function insideBounds(b, x, z) {
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}
class Terrain {
  constructor(scene, roads, stage, opts = {}) {
    this.scene = scene, this.roads = roads, this.stage = stage, this.shoreSide = stage.shore ? stage.shore.side : 1, this.shoreOffset = stage.shore ? stage.shore.offset : 44, this.mesh = null, this.entryClip = roads.chained ? roads.entryPlane : null, this.prevBounds = opts.prevBounds || null, this.prevTerrain = opts.prevTerrain || null, this.nextTerrain = null, this.order = ++terrainOrder, this.exitClip = null, this.seamVerts = [], this._sampleRoads(), this._bounds(), this._bucket(), this._buildShore(), this._buildChannels(), this._scratch(), !opts.deferMesh && (this.mesh = this._buildMesh(), scene.add(this.mesh));
  }
  *finishSteps() {
    if (this.mesh) return;
    const steps = this.meshSteps();
    let r = steps.next();
    for (; !r.done; ) yield r.value || "terrain", r = steps.next();
    this.mesh = r.value, this.scene.add(this.mesh);
  }
  _sampleRoads() {
    this.legOrder = Object.keys(this.roads.legs), this.roadPts = [];
    for (const name of this.legOrder) {
      const c = this.roads.legs[name], n = Math.max(8, Math.round(c.getLength() / ROAD_SAMPLE_STEP)), li = this.legOrder.indexOf(name);
      for (let i = 0; i <= n; i++) {
        const p = c.getPointAt(i / n), tan = c.getTangentAt(i / n), sx = tan.z, sz = -tan.x, m = Math.hypot(sx, sz) || 1;
        this.roadPts.push({ x: p.x, y: p.y, z: p.z, sx: sx / m, sz: sz / m, os: this.shoreSide, li, t: i / n });
      }
    }
    for (const p of this.roadPts) p.base = p.y - CORRIDOR_DROP, p.crest = p.base + 19;
  }
  _bounds() {
    let a = 1 / 0, b = -1 / 0, c = 1 / 0, d = -1 / 0;
    for (const p of this.roadPts) a = Math.min(a, p.x), b = Math.max(b, p.x), c = Math.min(c, p.z), d = Math.max(d, p.z);
    const lo = (v) => Math.floor((v - WORLD_MARGIN) / CELL) * CELL, hi = (v) => Math.ceil((v + WORLD_MARGIN) / CELL) * CELL;
    this.world = { minX: lo(a), maxX: hi(b), minZ: lo(c), maxZ: hi(d) }, this.nx = Math.round((this.world.maxX - this.world.minX) / CELL), this.nz = Math.round((this.world.maxZ - this.world.minZ) / CELL), this.bx = Math.ceil((this.world.maxX - this.world.minX) / BUCKET) + 1, this.bz = Math.ceil((this.world.maxZ - this.world.minZ) / BUCKET) + 1;
  }
  _bucket() {
    this.fineSegs = this._makeSegs(4), this.farSegs = this._makeSegs(16), this.segBuckets = new Array(this.bx * this.bz);
    for (const s of this.fineSegs) {
      const k = this._bucketIndex(s.mx, s.mz);
      k >= 0 && (this.segBuckets[k] || (this.segBuckets[k] = [])).push(s);
    }
    this.fbx = Math.ceil((this.world.maxX - this.world.minX) / FAR_BUCKET) + 1, this.fbz = Math.ceil((this.world.maxZ - this.world.minZ) / FAR_BUCKET) + 1, this.farBuckets = new Array(this.fbx * this.fbz);
    for (const s of this.farSegs) {
      const x0 = Math.floor((Math.min(s.a.x, s.b.x) - this.world.minX) / FAR_BUCKET), x1 = Math.floor((Math.max(s.a.x, s.b.x) - this.world.minX) / FAR_BUCKET), z0 = Math.floor((Math.min(s.a.z, s.b.z) - this.world.minZ) / FAR_BUCKET), z1 = Math.floor((Math.max(s.a.z, s.b.z) - this.world.minZ) / FAR_BUCKET);
      for (let cx = Math.max(0, x0); cx <= Math.min(this.fbx - 1, x1); cx++) for (let cz = Math.max(0, z0); cz <= Math.min(this.fbz - 1, z1); cz++) {
        const k = cx * this.fbz + cz;
        (this.farBuckets[k] || (this.farBuckets[k] = [])).push(s);
      }
    }
  }
  _farScan(x, z) {
    const ix = Math.floor((x - this.world.minX) / FAR_BUCKET), iz = Math.floor((z - this.world.minZ) / FAR_BUCKET);
    let found = false;
    for (let a = -1; a <= 1; a++) {
      const cx = ix + a;
      if (!(cx < 0 || cx >= this.fbx)) for (let b = -1; b <= 1; b++) {
        const cz = iz + b;
        if (cz < 0 || cz >= this.fbz) continue;
        const arr = this.farBuckets[cx * this.fbz + cz];
        if (arr) {
          found = true;
          for (let i = 0; i < arr.length; i++) this._segScan(arr[i], x, z);
        }
      }
    }
    if (!found) for (let i = 0; i < this.farSegs.length; i++) this._segScan(this.farSegs[i], x, z);
  }
  _makeSegs(stride) {
    const out = [];
    let start = 0;
    for (; start < this.roadPts.length; ) {
      const li = this.roadPts[start].li;
      let end = start;
      for (; end + 1 < this.roadPts.length && this.roadPts[end + 1].li === li; ) end++;
      for (let i = start; i < end; i += stride) {
        const a = this.roadPts[i], b = this.roadPts[Math.min(i + stride, end)], dx = b.x - a.x, dz = b.z - a.z;
        out.push({ a, b, dx, dz, len2: dx * dx + dz * dz || 1, mx: (a.x + b.x) / 2, mz: (a.z + b.z) / 2 });
      }
      start = end + 1;
    }
    return out;
  }
  _bucketIndex(x, z) {
    const ix = Math.floor((x - this.world.minX) / BUCKET), iz = Math.floor((z - this.world.minZ) / BUCKET);
    return ix < 0 || iz < 0 || ix >= this.bx || iz >= this.bz ? -1 : ix * this.bz + iz;
  }
  _buildShore() {
    this.shore = [];
    const legs = this.stage.shore ? this.stage.shore.legs : [], up = new THREE.Vector3(0, 1, 0);
    for (const name of legs) {
      const c = this.roads.legs[name];
      if (!c) continue;
      const n = Math.max(8, Math.round(c.getLength() / 14)), isFirst = name === legs[0], isLast = name === legs[legs.length - 1];
      for (let i = 0; i <= n; i++) {
        const t = i / n, p = c.getPointAt(t), tan = c.getTangentAt(t), side = new THREE.Vector3().crossVectors(up, tan).normalize().multiplyScalar(this.shoreSide), q = p.clone().addScaledVector(side, this.shoreOffset);
        isFirst && i === 0 && this.shore.push({ x: q.x - tan.x * 800, z: q.z - tan.z * 800, sx: side.x, sz: side.z }), this.shore.push({ x: q.x, z: q.z, sx: side.x, sz: side.z }), isLast && i === n && this.shore.push({ x: q.x + tan.x * 800, z: q.z + tan.z * 800, sx: side.x, sz: side.z });
      }
    }
    this._bucketShore();
  }
  _bucketShore() {
    if (this.shoreBuckets = null, this.shore.length < 2) return;
    this.sbx = Math.ceil((this.world.maxX - this.world.minX) / SHORE_BUCKET) + 1, this.sbz = Math.ceil((this.world.maxZ - this.world.minZ) / SHORE_BUCKET) + 1;
    const buckets = new Array(this.sbx * this.sbz);
    for (let i = 0; i + 1 < this.shore.length; i++) {
      const a = this.shore[i], b = this.shore[i + 1], x0 = Math.floor((Math.min(a.x, b.x) - this.world.minX) / SHORE_BUCKET), x1 = Math.floor((Math.max(a.x, b.x) - this.world.minX) / SHORE_BUCKET), z0 = Math.floor((Math.min(a.z, b.z) - this.world.minZ) / SHORE_BUCKET), z1 = Math.floor((Math.max(a.z, b.z) - this.world.minZ) / SHORE_BUCKET);
      for (let cx = Math.max(0, x0); cx <= Math.min(this.sbx - 1, x1); cx++) for (let cz = Math.max(0, z0); cz <= Math.min(this.sbz - 1, z1); cz++) {
        const k = cx * this.sbz + cz;
        (buckets[k] || (buckets[k] = [])).push(i);
      }
    }
    this.shoreBuckets = buckets, this.shoreRingMax = Math.max(this.sbx, this.sbz);
  }
  _buildChannels() {
    this.channels = [];
    for (const def of this.stage.bridges || []) {
      const c = this.roads.legs[def.leg];
      if (!c) continue;
      const pts = [], n = Math.max(8, Math.round((def.toS - def.fromS) * c.getLength() / 10));
      for (let i = 0; i <= n; i++) {
        const p = c.getPointAt(def.fromS + (def.toS - def.fromS) * (i / n));
        pts.push({ x: p.x, z: p.z });
      }
      this.channels.push({ pts, half: def.waterHalfWidth, fade: 46 });
    }
    this._markSpanPoints();
  }
  _markSpanPoints() {
    for (const p of this.roadPts) p.onSpan = false;
    if (!this.channels.length) return;
    const legIndex = new Map(this.legOrder.map((n, i) => [n, i]));
    for (const def of this.stage.bridges || []) {
      const li = legIndex.get(def.leg);
      if (li === void 0) continue;
      const margin = APPROACH_MARGIN / this.roads.legs[def.leg].getLength();
      for (const p of this.roadPts) p.li === li && p.t >= def.fromS - margin && p.t <= def.toS + margin && (p.onSpan = true);
    }
  }
  channelMix(x, z) {
    if (!this.channels || !this.channels.length) return 0;
    let best = 0;
    for (const ch of this.channels) {
      let d2 = 1 / 0, perp = 1 / 0, over = 0;
      const last = ch.pts.length - 2;
      for (let i = 0; i + 1 < ch.pts.length; i++) {
        const a = ch.pts[i], b = ch.pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz || 1, raw = ((x - a.x) * dx + (z - a.z) * dz) / len2, u = THREE.MathUtils.clamp(raw, 0, 1), ex = x - (a.x + dx * u), ez = z - (a.z + dz * u), d = ex * ex + ez * ez;
        if (d >= d2) continue;
        d2 = d;
        const len = Math.sqrt(len2);
        i === 0 && raw < 0 ? (over = -raw * len, perp = Math.abs((x - a.x) * -dz + (z - a.z) * dx) / len) : i === last && raw > 1 ? (over = (raw - 1) * len, perp = Math.abs((x - a.x) * -dz + (z - a.z) * dx) / len) : (over = 0, perp = Math.sqrt(d));
      }
      if (perp >= ch.half || over >= BANK_RUN) continue;
      const across = smooth(THREE.MathUtils.clamp((ch.half - perp) / ch.fade, 0, 1)), along = smooth(THREE.MathUtils.clamp((BANK_RUN - over) / BANK_RUN, 0, 1));
      best = Math.max(best, across * along);
    }
    return best;
  }
  _scratch() {
    this._d = { d2: 1 / 0, base: 0, y: 0, lat: 0, hit: false, floor: 1 / 0, t: 0, li: -1, offSpanD2: 1 / 0 }, this._legD2 = new Array(this.legOrder.length).fill(1 / 0), this._legBase = new Array(this.legOrder.length).fill(0), this._t = { h: 0, d: 0, lat: 0, y: 0, t: 0, li: -1 };
  }
  shoreDistance(x, z) {
    let best = 1 / 0, sign = 1;
    const consider = (i) => {
      const a = this.shore[i], b = this.shore[i + 1], dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz || 1, u = THREE.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / len2, 0, 1), ex = x - (a.x + dx * u), ez = z - (a.z + dz * u), d2 = ex * ex + ez * ez;
      d2 < best && (best = d2, sign = ex * a.sx + ez * a.sz <= 0 ? 1 : -1);
    };
    if (this.shoreBuckets) {
      const ix = Math.floor((x - this.world.minX) / SHORE_BUCKET), iz = Math.floor((z - this.world.minZ) / SHORE_BUCKET);
      for (let r = 0; r <= this.shoreRingMax; r++) {
        for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
          if (r > 0 && Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
          const cx = ix + a, cz = iz + b;
          if (cx < 0 || cz < 0 || cx >= this.sbx || cz >= this.sbz) continue;
          const arr = this.shoreBuckets[cx * this.sbz + cz];
          if (arr) for (let k = 0; k < arr.length; k++) consider(arr[k]);
        }
        if (best !== 1 / 0 && Math.sqrt(best) <= r * SHORE_BUCKET) break;
      }
      if (best === 1 / 0) for (let i = 0; i + 1 < this.shore.length; i++) consider(i);
    } else for (let i = 0; i + 1 < this.shore.length; i++) consider(i);
    const border = Math.min(x - this.world.minX, this.world.maxX - x, z - this.world.minZ, this.world.maxZ - z) - 170;
    return this.shore.length ? Math.min(Math.sqrt(best) * sign, border) : border;
  }
  _segScan(s, x, z) {
    const u = THREE.MathUtils.clamp(((x - s.a.x) * s.dx + (z - s.a.z) * s.dz) / s.len2, 0, 1), ex = x - (s.a.x + s.dx * u), ez = z - (s.a.z + s.dz * u), d2 = ex * ex + ez * ez, a = s.a, b = s.b, bs = a.base + (b.base - a.base) * u;
    if (d2 < 676 && bs < this._d.floor && (this._d.floor = bs), !(a.onSpan && b.onSpan) && d2 < this._d.offSpanD2 && (this._d.offSpanD2 = d2), d2 < this._legD2[a.li] && (this._legD2[a.li] = d2, this._legBase[a.li] = bs), d2 >= this._d.d2) return;
    const sx = a.sx + (b.sx - a.sx) * u, sz = a.sz + (b.sz - a.sz) * u, m = Math.hypot(sx, sz) || 1;
    this._d.d2 = d2, this._d.y = a.y + (b.y - a.y) * u, this._d.base = bs, this._d.lat = (ex * sx + ez * sz) / m * a.os, this._d.t = a.t + (b.t - a.t) * u, this._d.li = a.li, this._d.hit = true;
  }
  sample(x, z) {
    const d = this._d;
    d.d2 = 1 / 0, d.hit = false, d.lat = 0, d.t = 0, d.li = -1, d.offSpanD2 = 1 / 0, d.base = this.roads.baseY, d.y = this.roads.baseY, d.floor = 1 / 0, this._legD2.fill(1 / 0);
    const ix = Math.floor((x - this.world.minX) / BUCKET), iz = Math.floor((z - this.world.minZ) / BUCKET);
    for (let a = -3; a <= 3; a++) {
      const cx = ix + a;
      if (!(cx < 0 || cx >= this.bx)) for (let b = -3; b <= 3; b++) {
        const cz = iz + b;
        if (cz < 0 || cz >= this.bz) continue;
        const arr = this.segBuckets[cx * this.bz + cz];
        if (arr) for (let i = 0; i < arr.length; i++) this._segScan(arr[i], x, z);
      }
    }
    d.d2 > 1600 && this._farScan(x, z);
    let wsum = 0, bsum = 0;
    for (let li = 0; li < this._legD2.length; li++) {
      if (this._legD2[li] === 1 / 0) continue;
      const w = 1 / (this._legD2[li] * this._legD2[li] + 1);
      wsum += w, bsum += w * this._legBase[li];
    }
    const land = Math.min(wsum > 0 ? bsum / wsum : d.base, d.floor), offSpan = Math.sqrt(d.offSpanD2), keep = THREE.MathUtils.clamp((offSpan - ROAD_KEEP) / ROAD_KEEP_FADE, 0, 1), water = this.channelMix(x, z) * smooth(keep);
    if (water > 0) return this._t.h = SEABED_Y + (land - SEABED_Y) * (1 - water), this._t.d = Math.sqrt(d.d2), this._t.lat = d.lat, this._t.y = d.y, this._t.t = d.t, this._t.li = d.li, this._t;
    const ds = this.shoreDistance(x, z), run = Math.min(this.shoreOffset - 8, 26 + Math.max(0, land - WATERLINE) * 0.9), k = THREE.MathUtils.clamp(ds / run, 0, 1);
    return this._t.h = SEABED_Y + (land - SEABED_Y) * smooth(k), this._t.d = Math.sqrt(d.d2), this._t.lat = d.lat, this._t.y = d.y, this._t.t = d.t, this._t.li = d.li, this._t;
  }
  arcBounds(lo, hi, pad) {
    let a = 1 / 0, b = -1 / 0, c = 1 / 0, d = -1 / 0;
    for (const p of this.roadPts) p.t < lo || p.t > hi || (a = Math.min(a, p.x), b = Math.max(b, p.x), c = Math.min(c, p.z), d = Math.max(d, p.z));
    return a === 1 / 0 ? { ...this.world } : { minX: Math.max(this.world.minX, a - pad), maxX: Math.min(this.world.maxX, b + pad), minZ: Math.max(this.world.minZ, c - pad), maxZ: Math.min(this.world.maxZ, d + pad) };
  }
  hills(x, z) {
    return Math.sin(x * 36e-4) * Math.cos(z * 43e-4) * 9 + Math.sin(x * 0.0102 + 1.7) * Math.cos(z * 91e-4 - 0.6) * 3.6 + Math.sin(x * 0.0231 - 0.4) * Math.cos(z * 0.0198 + 1.2) * 1.4;
  }
  heightAt(x, z) {
    let y = this.heightFrom(this.sample(x, z), x, z);
    for (const other of this.roadProtectors || []) y = this.protectedHeight(other, x, z, y);
    return y;
  }
  heightFrom(s, x, z) {
    if (s.h <= WATERLINE + 0.2) return s.h;
    const away = THREE.MathUtils.clamp((s.d - 46) / 90, 0, 1), above = THREE.MathUtils.clamp((s.h - WATERLINE) / 9, 0, 1);
    return s.h + this.hills(x, z) * away * above;
  }
  roadInfluence(x, z) {
    const s = this.sample(x, z);
    return { d: s.d, lat: s.lat, y: s.y, h: s.h };
  }
  _buildMesh() {
    const steps = this.meshSteps();
    let r = steps.next();
    for (; !r.done; ) r = steps.next();
    return r.value;
  }
  *meshSteps() {
    const NX = this.nx, NZ = this.nz, ROW = NX + 1, n = ROW * (NZ + 1), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), gmix = new Float32Array(n), uv = new Float32Array(n * 2), H = new Float32Array(n);
    this.D = new Float32Array(n);
    for (let j = 0; j <= NZ; j++) {
      for (let i = 0; i <= NX; i++) {
        const x = this.world.minX + i * CELL, z = this.world.minZ + j * CELL, k = j * ROW + i;
        pos[k * 3] = x, pos[k * 3 + 2] = z, uv[k * 2] = x / TERRAIN_TILE, uv[k * 2 + 1] = z / TERRAIN_TILE;
        const sample = this.sample(x, z);
        this.D[k] = sample.d;
        const y = this.heightFrom(sample, x, z);
        H[k] = y, pos[k * 3 + 1] = y;
      }
      yield "terrain.height";
    }
    const sand = new THREE.Color(14206620), grass = new THREE.Color(6060595), dry = new THREE.Color(9408334), rock = new THREE.Color(9208695), seabed = new THREE.Color(2377039), cx = CELL, cz = CELL, tmp = new THREE.Color();
    for (let j = 0; j <= NZ; j++) {
      for (let i = 0; i <= NX; i++) {
        const k = j * ROW + i, l = H[Math.max(0, i - 1) + j * ROW], r = H[Math.min(NX, i + 1) + j * ROW], d = H[i + Math.max(0, j - 1) * ROW], u = H[i + Math.min(NZ, j + 1) * ROW], slope = Math.hypot((r - l) / (2 * cx), (u - d) / (2 * cz)), y = H[k], px0 = pos[k * 3], pz0 = pos[k * 3 + 2];
        if (y < WATERLINE - 0.4) tmp.copy(seabed).lerp(sand, THREE.MathUtils.clamp((y - SEABED_Y) / (WATERLINE - SEABED_Y), 0, 1) * 0.8), gmix[k] = 0;
        else {
          const beach = 1 - THREE.MathUtils.clamp((Math.abs(this.shoreDistance(px0, pz0)) - BEACH_REACH) / BEACH_FADE, 0, 1), g = THREE.MathUtils.clamp((y - (WATERLINE + 0.5)) / 2.1, 0, 1) * (1 - beach) + (1 - beach) * 0.25, gc = THREE.MathUtils.clamp(g, 0, 1);
          tmp.copy(sand).lerp(grass, gc), gmix[k] = gc;
        }
        const px = pos[k * 3], pz = pos[k * 3 + 2], patch = Math.sin(px * 67e-4 + 0.9) * Math.cos(pz * 58e-4 - 2.2) + 0.42 * Math.sin(px * 0.031 - 1.7) * Math.cos(pz * 0.029 + 0.6) + 0.19 * Math.sin(px * 0.11 + 2.4) * Math.cos(pz * 0.104 - 1.1);
        y > WATERLINE + 5 && tmp.lerp(dry, THREE.MathUtils.clamp(patch * 0.62, 0, 1) * 0.62);
        const gA = px * 0.061 + pz * 0.052, gB = px * -0.043 + pz * 0.068, grain = 0.87 + 0.26 * (0.5 + 0.5 * (0.58 * Math.sin(gA + 0.4) + 0.42 * Math.cos(gB - 1.3)));
        tmp.multiplyScalar(grain);
        const rocky = THREE.MathUtils.clamp((slope - 0.85) / 0.75, 0, 1);
        tmp.lerp(rock, rocky), gmix[k] *= 1 - rocky, col[k * 3] = tmp.r, col[k * 3 + 1] = tmp.g, col[k * 3 + 2] = tmp.b;
      }
      j % (MESH_BAND * 4) === 0 && (yield "terrain.colour");
    }
    const nrm = new Float32Array(n * 3);
    for (let j = 0; j <= NZ; j++) {
      for (let i = 0; i <= NX; i++) this._normalAt(H, nrm, i, j);
      j % (MESH_BAND * 4) === 0 && (yield "terrain.normals");
    }
    const idx = new Uint32Array(NX * NZ * 6), geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)), geo.setAttribute("color", new THREE.BufferAttribute(col, 3)), geo.setAttribute("aGroundMix", new THREE.BufferAttribute(gmix, 1)), geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)), geo.setAttribute("normal", new THREE.BufferAttribute(nrm, 3)), geo.setIndex(new THREE.BufferAttribute(idx, 1)), this.H = H, this.geo = geo;
    for (let j = 0; j < NZ; j += 64) yield "terrain.index";
    this._writeIndex();
    const mesh = new THREE.Mesh(geo, makeGroundMaterial(applyMaps(new THREE.MeshStandardMaterial({ color: new THREE.Color(1 / 0.78, 1 / 0.78, 1 / 0.78), vertexColors: true, roughness: 1, envMapIntensity: 0.12, normalScale: new THREE.Vector2(0.22, 0.22) }), TERRAIN), TERRAIN.map));
    return mesh.material.roughnessMap = null, mesh.receiveShadow = true, mesh;
  }
  depthField() {
    if (this._depthField !== void 0) return this._depthField;
    if (!this.H) return this._depthField = null, null;
    const NX = this.nx, NZ = this.nz, ROW = NX + 1, data = new Uint8Array(ROW * (NZ + 1)), lo = SEABED_Y, span = Math.max(1e-3, WATERLINE - lo);
    for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, Math.round((this.H[i] - lo) / span * 255)));
    const tex = new THREE.DataTexture(data, ROW, NZ + 1, THREE.RedFormat);
    return tex.wrapS = THREE.ClampToEdgeWrapping, tex.wrapT = THREE.ClampToEdgeWrapping, tex.minFilter = THREE.LinearFilter, tex.magFilter = THREE.LinearFilter, tex.generateMipmaps = false, tex.needsUpdate = true, this._depthField = { texture: tex, min: new THREE.Vector2(this.world.minX, this.world.minZ), size: new THREE.Vector2(this.world.maxX - this.world.minX, this.world.maxZ - this.world.minZ) }, this._depthField;
  }
  _normalAt(H, nrm, i, j) {
    const NX = this.nx, NZ = this.nz, ROW = NX + 1, k = j * ROW + i, l = H[Math.max(0, i - 1) + j * ROW], r = H[Math.min(NX, i + 1) + j * ROW], d = H[i + Math.max(0, j - 1) * ROW], u = H[i + Math.min(NZ, j + 1) * ROW], nx = -(r - l) / (2 * CELL), nz = -(u - d) / (2 * CELL), m = Math.hypot(nx, 1, nz) || 1;
    nrm[k * 3] = nx / m, nrm[k * 3 + 1] = 1 / m, nrm[k * 3 + 2] = nz / m;
  }
  owns(x, z) {
    if (this.prevTerrain || this.nextTerrain) {
      const mine = this.distanceAt(x, z);
      for (const other of [this.prevTerrain, this.nextTerrain]) {
        if (!other || !insideBounds(other.world, x, z)) continue;
        const theirs = other.distanceAt(x, z);
        if (theirs < mine - 1e-6 || Math.abs(theirs - mine) <= 1e-6 && other.order > this.order) return false;
      }
      return true;
    }
    return !(this.entryClip && this.entryClip.ahead(x, z) < 0 && (!this.prevBounds || insideBounds(this.prevBounds, x, z)) || this.exitClip && this.exitClip.plane.ahead(x, z) >= 0 && insideBounds(this.exitClip.bounds, x, z));
  }
  distanceAt(x, z) {
    if (!this.D) return this.sample(x, z).d;
    const u = THREE.MathUtils.clamp((x - this.world.minX) / CELL, 0, this.nx - 1e-5), v = THREE.MathUtils.clamp((z - this.world.minZ) / CELL, 0, this.nz - 1e-5), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * (this.nx + 1) + i, row = this.nx + 1;
    return this.D[k] * (1 - a) * (1 - b) + this.D[k + 1] * a * (1 - b) + this.D[k + row] * (1 - a) * b + this.D[k + row + 1] * a * b;
  }
  renderedHeightAt(x, z) {
    if (!this.H) return this.heightAt(x, z);
    const u = THREE.MathUtils.clamp((x - this.world.minX) / CELL, 0, this.nx - 1e-5), v = THREE.MathUtils.clamp((z - this.world.minZ) / CELL, 0, this.nz - 1e-5), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * (this.nx + 1) + i, row = this.nx + 1;
    return a + b <= 1 ? this.H[k] * (1 - a - b) + this.H[k + 1] * a + this.H[k + row] * b : this.H[k + 1] * (1 - b) + this.H[k + row] * (1 - a) + this.H[k + row + 1] * (a + b - 1);
  }
  releasePrevious(other) {
    for (const _ of this.releasePreviousSteps(other)) ;
  }
  *releasePreviousSteps(other, { deferCommit = false } = {}) {
    if (this.prevTerrain !== other) return;
    const geometry = this.geo, next = this.nextTerrain, exit = this.exitClip, index = geometry?.index.clone(), prepared = Object.assign(Object.create(Object.getPrototypeOf(this)), this, { prevTerrain: null, prevBounds: null, entryClip: null, geo: geometry ? { index, drawRange: { ...geometry.drawRange }, setDrawRange(start, count) {
      this.drawRange = { start, count };
    } } : null });
    geometry && (yield* prepared._writeIndexSteps());
    let settled = false;
    const commit = () => settled || (settled = true, this.prevTerrain !== other || this.geo !== geometry || this.nextTerrain !== next || this.exitClip !== exit) ? false : (this.prevTerrain = null, this.prevBounds = null, this.entryClip = null, geometry && (geometry.index.array.set(index.array), geometry.index.needsUpdate = true, geometry.setDrawRange(prepared.geo.drawRange.start, prepared.geo.drawRange.count), this.seamVerts = prepared.seamVerts), true);
    if (commit.dispose = () => {
      settled = true;
    }, deferCommit) return commit;
    commit();
  }
  _writeIndex() {
    for (const _ of this._writeIndexSteps()) ;
  }
  *_writeIndexSteps() {
    const NX = this.nx, NZ = this.nz, ROW = NX + 1, idx = this.geo.index.array, kept = new Uint8Array(ROW * (NZ + 1)), gone = new Uint8Array(ROW * (NZ + 1));
    let w = 0;
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      (j * NX + i) % 128 === 0 && (yield "terrain.clip");
      const a = j * ROW + i, cx = this.world.minX + (i + 0.5) * CELL, cz = this.world.minZ + (j + 0.5) * CELL, mine = this.owns(cx, cz), flags = mine ? kept : gone;
      flags[a] = 1, flags[a + 1] = 1, flags[a + ROW] = 1, flags[a + ROW + 1] = 1, mine && (idx[w] = a, idx[w + 1] = a + ROW, idx[w + 2] = a + 1, idx[w + 3] = a + 1, idx[w + 4] = a + ROW, idx[w + 5] = a + ROW + 1, w += 6);
    }
    this.geo.index.needsUpdate = true, this.geo.setDrawRange(0, w), this.seamVerts = [];
    for (let k = 0; k < kept.length; k++) k % 512 === 0 && (yield "terrain.seam-index"), kept[k] && gone[k] && this.seamVerts.push(k);
  }
  clipAt(plane, bounds, other = null) {
    for (const _ of this.clipSteps(plane, bounds, other)) ;
  }
  *clipSteps(plane, bounds, other = null) {
    this.mesh && (this.exitClip = { plane, bounds }, other && (this.nextTerrain = other, other.prevTerrain = this), yield* this._writeIndexSteps());
  }
  weldTo(other) {
    for (const _ of this.weldSteps(other)) ;
  }
  *weldSteps(other) {
    if (!this.mesh || !this.seamVerts.length) return;
    const pos = this.geo.attributes.position.array, nrm = this.geo.attributes.normal.array, ROW = this.nx + 1;
    let work = 0;
    for (const k of this.seamVerts) {
      work++ % 32 === 0 && (yield "terrain.weld-heights");
      const x = pos[k * 3], z = pos[k * 3 + 2];
      if (!insideBounds(other.world, x, z)) continue;
      const y = other.heightAt(x, z);
      this.H[k] = y, pos[k * 3 + 1] = y;
    }
    work = 0;
    for (const k of this.seamVerts) {
      work++ % 128 === 0 && (yield "terrain.weld-normals");
      const i = k % ROW, j = (k - i) / ROW;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di, b = j + dj;
        a < 0 || b < 0 || a > this.nx || b > this.nz || this._normalAt(this.H, nrm, a, b);
      }
    }
    this.geo.attributes.position.needsUpdate = true, this.geo.attributes.normal.needsUpdate = true, yield* this._boundingSphereSteps();
  }
  protectRoads(other) {
    for (const _ of this.protectRoadSteps(other)) ;
  }
  protectedHeight(other, x, z, y) {
    if (!insideBounds(other.world, x, z)) return y;
    const s = other.sample(x, z), inner = other.roads.roadWidth / 2 + CELL * 1.5;
    if (s.d > inner + 30) return y;
    const ceiling = other.heightFrom(s, x, z), blend = 1 - smooth(THREE.MathUtils.clamp((s.d - inner) / 30, 0, 1));
    return y > ceiling ? y + (ceiling - y) * blend : y;
  }
  *protectRoadSteps(other) {
    if (!this.geo || !other) return;
    this.roadProtectors ||=  new Set(), this.roadProtectors.add(other);
    const pos = this.geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      k % 128 === 0 && (yield "terrain.road-clearance");
      const x = pos.getX(k), z = pos.getZ(k);
      this.H[k] = this.protectedHeight(other, x, z, pos.getY(k)), pos.setY(k, this.H[k]);
    }
    pos.needsUpdate = true, yield* this._vertexNormalSteps(), yield* this._boundingSphereSteps();
  }
  *_vertexNormalSteps() {
    const geo = this.geo, pos = geo.attributes.position, index = geo.index;
    let normal = geo.attributes.normal;
    normal || (normal = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3), geo.setAttribute("normal", normal));
    for (let i = 0; i < normal.count; i++) i % 512 === 0 && (yield "terrain.normal-reset"), normal.setXYZ(i, 0, 0, 0);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), na = new THREE.Vector3(), nb = new THREE.Vector3(), nc = new THREE.Vector3(), cb = new THREE.Vector3(), ab = new THREE.Vector3(), count = index ? index.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      i % 384 === 0 && (yield "terrain.normal-faces");
      const ia = index ? index.getX(i) : i, ib = index ? index.getX(i + 1) : i + 1, ic = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, ia), b.fromBufferAttribute(pos, ib), c.fromBufferAttribute(pos, ic), cb.subVectors(c, b), ab.subVectors(a, b), cb.cross(ab), index ? (na.fromBufferAttribute(normal, ia).add(cb), nb.fromBufferAttribute(normal, ib).add(cb), nc.fromBufferAttribute(normal, ic).add(cb), normal.setXYZ(ia, na.x, na.y, na.z), normal.setXYZ(ib, nb.x, nb.y, nb.z), normal.setXYZ(ic, nc.x, nc.y, nc.z)) : (normal.setXYZ(ia, cb.x, cb.y, cb.z), normal.setXYZ(ib, cb.x, cb.y, cb.z), normal.setXYZ(ic, cb.x, cb.y, cb.z));
    }
    for (let i = 0; i < normal.count; i++) i % 512 === 0 && (yield "terrain.normal-normalize"), na.fromBufferAttribute(normal, i).normalize(), normal.setXYZ(i, na.x, na.y, na.z);
    normal.needsUpdate = true;
  }
  *_boundingSphereSteps() {
    const pos = this.geo.attributes.position, box = new THREE.Box3(), point = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) i % 512 === 0 && (yield "terrain.bounds-box"), box.expandByPoint(point.fromBufferAttribute(pos, i));
    const sphere = new THREE.Sphere();
    box.getCenter(sphere.center);
    let radiusSq = 0;
    for (let i = 0; i < pos.count; i++) i % 512 === 0 && (yield "terrain.bounds-radius"), radiusSq = Math.max(radiusSq, sphere.center.distanceToSquared(point.fromBufferAttribute(pos, i)));
    sphere.radius = Math.sqrt(radiusSq), this.geo.boundingSphere = sphere;
  }
  dispose() {
    this.mesh && (this.scene.remove(this.mesh), this.mesh.geometry.dispose(), this.mesh.material.dispose(), this._depthField && (this._depthField.texture.dispose(), this._depthField = null), this.mesh = null, this.geo = null, this.H = null, this.seamVerts = []);
  }
}
export {
  CELL,
  CORRIDOR_DROP,
  ROAD_CORRIDOR,
  Terrain,
  WORLD_MARGIN,
  insideBounds
};
