import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { materials } from "../render/materials.js";
import { lodVisible } from "../render/quality.js";
import { buildLandmark, landmarkMaterials } from "./landmark-shapes.js";
import { disposeTree } from "./dispose.js";
const UP = new THREE.Vector3(0, 1, 0);
const SPAN_CLEARANCE = 9, SUPPORT_SETBACK = 12;
function placeholderFor(row, minDeckY = 0) {
  const g = new THREE.Group(), { w, d, h } = row.footprint;
  if (g.userData.placeholder = true, row.kind === "span") {
    const deckThickness = Math.max(1.5, h * 0.035), deckY = Math.max(h * 0.28, minDeckY) + deckThickness / 2, deck = new THREE.Mesh(new THREE.BoxGeometry(w, deckThickness, d), materials.placeholderMassing);
    deck.position.y = deckY, deck.castShadow = true, deck.receiveShadow = true, g.add(deck);
    const towerW = Math.max(3, Math.min(d * 0.9, w * 0.02)), towerH = Math.max(h, deckY + h * 0.35);
    for (const sign of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(towerW, towerH, Math.max(3, d * 0.75)), materials.placeholderMassing);
      tower.position.set(sign * w * 0.19, towerH / 2, 0), tower.castShadow = true, tower.receiveShadow = true, g.add(tower);
    }
    const topY = towerH, spanHalf = w * 0.19, STEPS = 6;
    for (let i = 0; i < STEPS; i++) {
      const t0 = i / STEPS, t1 = (i + 1) / STEPS, y0 = topY + (deckY - topY) * (1 - (2 * t0 - 1) * (2 * t0 - 1)), y1 = topY + (deckY - topY) * (1 - (2 * t1 - 1) * (2 * t1 - 1)), x0 = -spanHalf + t0 * spanHalf * 2, x1 = -spanHalf + t1 * spanHalf * 2, len = Math.hypot(x1 - x0, y1 - y0), cable = new THREE.Mesh(new THREE.BoxGeometry(len, Math.max(0.6, h * 8e-3), Math.max(0.6, h * 8e-3)), materials.placeholderMassing);
      cable.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0), cable.rotation.z = Math.atan2(y1 - y0, x1 - x0), g.add(cable);
    }
    return g.userData.deckY = deckY, g;
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.placeholderMassing);
  return body.position.y = h / 2, body.castShadow = true, body.receiveShadow = true, g.add(body), g;
}
class Landmarks {
  constructor(scene, roads, stage, terrain) {
    this.scene = scene, this.roads = roads, this.stage = stage, this.terrain = terrain, this.placed = [], this.placeholders = 0, this.disposed = false, this._place();
  }
  anchorFor(row) {
    const legName = row.leg && this.roads.legs[row.leg] ? row.leg : "main", curve = this.roads.legs[legName], t = THREE.MathUtils.clamp(row.at, 0, 1), p = curve.getPointAt(t).clone(), tan = curve.getTangentAt(t).clone(), side = new THREE.Vector3().crossVectors(UP, tan).normalize();
    p.addScaledVector(side, row.offset), row.forward && p.addScaledVector(tan, row.forward);
    const ground = this.terrain.heightAt(p.x, p.z);
    return p.y = Number.isFinite(ground) ? ground : p.y, { position: p, tangent: tan };
  }
  _clearanceFor(row, position) {
    const scale = row.scale || 1, pad = this.roads.roadWidth / 2 + 4, halfW = row.footprint.w / 2 * scale + pad, halfD = row.footprint.d / 2 * scale + pad, cos = Math.cos(row.heading), sin = Math.sin(row.heading);
    let highest = -1 / 0;
    for (const name of Object.keys(this.roads.legs)) {
      const curve = this.roads.legs[name], N = Math.max(240, Math.ceil(curve.getLength() / 3));
      for (let i = 0; i <= N; i++) {
        const p = curve.getPointAt(i / N), dx = p.x - position.x, dz = p.z - position.z, lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
        Math.abs(lx) > halfW || Math.abs(lz) > halfD || p.y > highest && (highest = p.y);
      }
    }
    return highest === -1 / 0 ? 0 : Math.max(0, (highest + SPAN_CLEARANCE - position.y) / scale);
  }
  _ridgeFor(row, anchor) {
    const legName = row.leg && this.roads.legs[row.leg] ? row.leg : "main", curve = this.roads.legs[legName], length = curve.getLength(), { w, d, h } = row.footprint, g = new THREE.Group();
    g.userData.placeholder = true;
    const SAMPLES = 800, line = [];
    for (const name of Object.keys(this.roads.legs)) {
      const c = this.roads.legs[name];
      for (let i = 0; i <= SAMPLES; i++) line.push(c.getPointAt(i / SAMPLES));
    }
    const clearOf = (x, z) => {
      let best = 1 / 0;
      for (const p of line) {
        const dx = x - p.x, dz = z - p.z, d2 = dx * dx + dz * dz;
        d2 < best && (best = d2);
      }
      return Math.sqrt(best);
    }, STEPS = Math.max(6, Math.min(48, Math.round(w / 120))), half = w / 2, chord = w / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const along = -half + chord * (i + 0.5), t = THREE.MathUtils.clamp(row.at + along / length, 0, 1), p = curve.getPointAt(t), tan = curve.getTangentAt(t), side = new THREE.Vector3().crossVectors(UP, tan).normalize(), q = p.clone().addScaledVector(side, row.offset), pieces = cliffChord(chord * 1.08, h, d, i), geo = mergeGeometries(pieces, false);
      for (const piece of pieces) piece.dispose();
      geo.computeBoundingBox();
      const blockSize = geo.boundingBox.getSize(new THREE.Vector3()), needed = Math.hypot(blockSize.x / 2, blockSize.z / 2) + this.roads.roadWidth / 2 + 8, dir = Math.sign(row.offset) || 1;
      for (let push = 0; push <= 900 && clearOf(q.x, q.z) < needed; push += 12) q.copy(p).addScaledVector(side, row.offset + (push + 12) * dir);
      const ground = this.terrain.heightAt(q.x, q.z), baseY = (Number.isFinite(ground) ? ground : q.y) - anchor.y, block = new THREE.Mesh(geo, landmarkMaterials.cliff);
      block.position.set(q.x - anchor.x, baseY, q.z - anchor.z), block.rotation.y = Math.atan2(tan.x, tan.z), block.castShadow = true, block.receiveShadow = true, g.add(block);
    }
    return g;
  }
  _clearSpanSupports(object) {
    const legs = [];
    for (const name of Object.keys(this.roads.legs)) {
      const c = this.roads.legs[name], N = Math.max(400, Math.round(c.getLength() / 3)), pts = [];
      for (let i = 0; i <= N; i++) {
        const p = c.getPointAt(i / N);
        pts.push([p.x, p.y, p.z, this.roads.halfRoadAt(name, i / N)]);
      }
      legs.push(pts);
    }
    object.updateMatrixWorld(true);
    const deckY = Number.isFinite(object.userData.deckY) ? object.position.y + object.userData.deckY * (object.scale.y || 1) : 1 / 0, size = new THREE.Vector3(), centre = new THREE.Vector3(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), quat = new THREE.Quaternion(), euler = new THREE.Euler(), doomed = [];
    object.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      o.geometry.boundingBox || o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      bb.getSize(size), bb.getCenter(centre), centre.applyMatrix4(o.matrixWorld), o.matrixWorld.decompose(pos, quat, scl), euler.setFromQuaternion(quat, "YXZ");
      const cos = Math.cos(-euler.y), sin = Math.sin(-euler.y), hx = Math.abs(size.x * scl.x) / 2, hz = Math.abs(size.z * scl.z) / 2, loY = centre.y - Math.abs(size.y * scl.y) / 2, hiY = centre.y + Math.abs(size.y * scl.y) / 2;
      if (!(centre.y >= deckY - 0.5)) for (const pts of legs) for (const q of pts) {
        const ex = q[0] - centre.x, ez = q[2] - centre.z, lx = ex * cos - ez * sin, lz = ex * sin + ez * cos, dx = Math.max(Math.abs(lx) - hx, 0), dz = Math.max(Math.abs(lz) - hz, 0);
        if (!(Math.hypot(dx, dz) > q[3] + SUPPORT_SETBACK) && !(loY > q[1] + SPAN_CLEARANCE) && !(hiY < q[1] - 0.5)) {
          doomed.push(o);
          return;
        }
      }
    });
    for (const o of doomed) o.removeFromParent(), o.geometry.dispose();
    return doomed.length;
  }
  _place() {
    for (const row of this.stage.landmarks) {
      const { position } = this.anchorFor(row), built = row.kind === "ridge" ? null : buildLandmark(row, row.kind === "span" ? this._clearanceFor(row, position) : 0), object = built || (row.kind === "ridge" ? this._ridgeFor(row, position) : placeholderFor(row, row.kind === "span" ? this._clearanceFor(row, position) : 0));
      object.position.copy(position), object.rotation.y = row.kind === "ridge" ? 0 : row.heading, object.scale.setScalar(row.kind === "ridge" ? 1 : row.scale), row.kind === "span" && (object.userData.removedSupports = this._clearSpanSupports(object)), object.userData.landmarkId = row.id, object.userData.lodTier = row.lodTier, this.scene.add(object);
      const excluded = row.kind === "span" && object.userData.removedSupports > 0;
      object.visible = !excluded, this.placed.push({ row, object, position, owned: false, excluded }), built || this.placeholders++;
    }
  }
  update(viewer) {
    const fogFar = this.stage && this.stage.lighting ? this.stage.lighting.fogFar : void 0;
    for (const e of this.placed) {
      const d = e.position.distanceTo(viewer);
      e.object.visible = !e.excluded && lodVisible(e.row.lodTier, d, fogFar);
    }
  }
  reconcileGround() {
    for (const e of this.placed) {
      const { row, object, position } = e;
      if (row.kind === "ridge") continue;
      if (row.kind === "span") {
        if (e.excluded) continue;
        for (const foot of e.feet || []) foot.removeFromParent(), foot.geometry.dispose();
        e.feet = [], object.updateMatrixWorld(true);
        const bases = [];
        object.traverse((part) => {
          if (!part.isMesh) return;
          const box = new THREE.Box3().setFromObject(part), size = box.getSize(new THREE.Vector3());
          Math.abs(box.min.y - position.y) > 1 || size.x > 60 || size.z > 60 || bases.push(box);
        });
        for (const base of bases) {
          const centre = base.getCenter(new THREE.Vector3()), terrain = [this.terrain, this.terrain.prevTerrain, this.terrain.nextTerrain].filter(Boolean).find((t) => t.owns(centre.x, centre.z));
          if (!terrain) continue;
          const ground = terrain.renderedHeightAt(centre.x, centre.z), depth = base.min.y - ground;
          if (depth < 1) continue;
          if (terrain.distanceAt(centre.x, centre.z) < this.roads.roadWidth / 2 + SUPPORT_SETBACK) {
            e.excluded = true;
            break;
          }
          const size = base.getSize(new THREE.Vector3()), foot = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.5, size.x), depth + 1, Math.max(0.5, size.z)), landmarkMaterials.concrete);
          foot.position.set(centre.x, base.min.y - depth / 2 - 0.5, centre.z), foot.updateMatrix(), foot.applyMatrix4(object.matrixWorld.clone().invert()), object.add(foot), e.feet.push(foot);
        }
        object.visible = !e.excluded;
        continue;
      }
      const halfW = row.footprint.w * row.scale * 0.5, halfD = row.footprint.d * row.scale * 0.5, cos = Math.cos(row.heading), sin = Math.sin(row.heading);
      let low = 1 / 0, high = -1 / 0, owned = true;
      for (const x of [-halfW, 0, halfW]) for (const z of [-halfD, 0, halfD]) {
        const wx = position.x + x * cos + z * sin, wz = position.z - x * sin + z * cos;
        owned &&= this.terrain.owns(wx, wz);
        const y = this.terrain.renderedHeightAt(wx, wz);
        low = Math.min(low, y), high = Math.max(high, y);
      }
      if (e.excluded = !owned || row.inWater && high > position.y + 4, !e.excluded && !row.inWater) {
        const ground = this.terrain.renderedHeightAt(position.x, position.z);
        object.position.y = position.y = ground;
        const depth = Math.max(0.5, ground - low + 1), safeBase = this.terrain.distanceAt(position.x, position.z) > Math.hypot(halfW, halfD) + this.roads.roadWidth / 2 + 2;
        if (depth < 3 || !safeBase) {
          e.foundation && (e.foundation.removeFromParent(), e.foundation.geometry.dispose(), e.foundation = null), object.visible = true;
          continue;
        }
        e.foundation || (e.foundation = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), landmarkMaterials.granite), e.foundation.receiveShadow = true, object.add(e.foundation)), e.foundation.scale.set(row.footprint.w, depth / row.scale, row.footprint.d), e.foundation.position.y = -depth / (2 * row.scale);
      }
      object.visible = !e.excluded;
    }
  }
  inFrustum(id, camera) {
    const entry = this.placed.find((e) => e.row.id === id);
    if (!entry || !entry.object.visible) return false;
    camera.updateMatrixWorld();
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const r = Math.max(entry.row.footprint.w, entry.row.footprint.h) * 0.5 * entry.row.scale, centre = entry.position.clone();
    return centre.y += entry.row.footprint.h * entry.row.scale / 2, frustum.intersectsSphere(new THREE.Sphere(centre, r));
  }
  anyInFrustum(camera) {
    if (!this.placed.length) return false;
    camera.updateMatrixWorld();
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const box = new THREE.Box3();
    for (const e of this.placed) if (e.object.visible && (box.setFromObject(e.object), frustum.intersectsBox(box))) return true;
    return false;
  }
  dispose() {
    this.disposed = true;
    for (const e of this.placed) this.scene.remove(e.object), disposeTree(e.object, { allMaterials: e.owned });
    this.placed.length = 0, this.placeholders = 0;
  }
}
function hash2(a, b) {
  let h = Math.imul(a | 0, 2654435761) ^ Math.imul(b | 0, 2246822507);
  return h = Math.imul(h ^ h >>> 15, 625341585), h ^= h >>> 13, (h >>> 0) / 4294967296;
}
function shadeRock(geo, height, tint) {
  const pos = geo.getAttribute("position"), out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) + height / 2) / Math.max(1e-6, height), 0, 1), k = (0.62 + 0.5 * t * t) * tint;
    out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = k;
  }
  return geo.setAttribute("color", new THREE.BufferAttribute(out, 3)), geo;
}
const CLIFF_COLUMN_W = 6, CLIFF_COLUMNS_MIN = 4, CLIFF_COLUMNS_MAX = 40, CLIFF_DEPTH_FACTOR = 1.55;
function cliffChord(chord, h, d, seed) {
  const out = [], columns = THREE.MathUtils.clamp(Math.round(chord / CLIFF_COLUMN_W), CLIFF_COLUMNS_MIN, CLIFF_COLUMNS_MAX), colW = chord / columns;
  for (let c = 0; c < columns; c++) {
    const r1 = hash2(seed * 977 + c, 11), r2 = hash2(seed * 977 + c, 29), r3 = hash2(seed * 977 + c, 53), w = colW * 1.1, ch = h * (0.86 + r1 * 0.2), cd = d * (0.55 + r2 * 0.62), g = new THREE.BoxGeometry(w, ch, cd), pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) pos.getY(i) > 0 && pos.setZ(i, pos.getZ(i) * 0.86);
    pos.needsUpdate = true, g.computeVertexNormals(), shadeRock(g, ch, 0.88 + r3 * 0.24), g.translate(-chord / 2 + colW * (c + 0.5), ch / 2, (r2 - 0.5) * d * 0.34), out.push(g);
  }
  const th = h * 0.16, talus = new THREE.BoxGeometry(chord * 1.02, th, d * CLIFF_DEPTH_FACTOR), tp = talus.getAttribute("position");
  for (let i = 0; i < tp.count; i++) tp.getY(i) > 0 && tp.setZ(i, tp.getZ(i) * 0.45);
  return tp.needsUpdate = true, talus.computeVertexNormals(), shadeRock(talus, th, 0.82 + hash2(seed, 7) * 0.16), talus.translate(0, th / 2, 0), out.push(talus), out;
}
export {
  Landmarks,
  SPAN_CLEARANCE,
  SUPPORT_SETBACK
};
