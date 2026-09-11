import * as THREE from "three";
import { WATERLINE } from "../physics/constants.js";
const sampleCache =  new WeakMap();
function* roadSampleSteps(networks) {
  const samples = [];
  let work = 0;
  for (const roads of new Set(networks)) {
    let cached = sampleCache.get(roads);
    if (!cached) {
      cached = [];
      for (const leg of roads.legNames) {
        const curve = roads.legs[leg], steps = Math.max(1, Math.ceil(curve.getLength() / 6));
        for (let i = 0; i <= steps; i++) {
          const s = i / steps, p = curve.getPointAt(s);
          cached.push({ x: p.x, y: p.y, z: p.z, half: roads.widthAt(leg, s) / 2 }), ++work === 32 && (work = 0, yield);
        }
      }
      sampleCache.set(roads, cached);
    }
    for (const sample of cached) samples.push(sample), ++work === 32 && (work = 0, yield);
  }
  return samples;
}
function supportRoadSamples(networks) {
  const steps = roadSampleSteps(networks);
  let result;
  do
    result = steps.next();
  while (!result.done);
  return result.value;
}
function blocksSupport(box, road, radius) {
  return box.y + box.h / 2 > road.y - 0.25 && box.y - box.h / 2 < road.y + 5.5 && Math.hypot(box.x - road.x, box.z - road.z) < road.half + radius + 3.5;
}
function supportClearsRoads(box, samples) {
  const radius = Math.hypot(box.w, box.d) / 2;
  return !samples.some((road) => blocksSupport(box, road, radius));
}
function* clearanceSteps(box, samples) {
  const radius = Math.hypot(box.w, box.d) / 2;
  for (let i = 0; i < samples.length; i++) {
    if (blocksSupport(box, samples[i], radius)) return false;
    (i + 1) % 128 === 0 && (yield);
  }
  return true;
}
class RoadSupports {
  constructor(parent, roads, terrain) {
    this.parent = parent, this.roads = roads, this.terrain = terrain, this.mesh = null, this.rebuildVersion = 0, this.disposed = false, this.pendingCommits =  new Set(), this.activeSteps =  new Set(), this.geometry = new THREE.BoxGeometry(1, 1, 1), this.material = new THREE.MeshStandardMaterial({ color: 8490129, roughness: 1 });
  }
  rebuild() {
    for (const _ of this.rebuildSteps()) ;
  }
  *rebuildSteps({ terrain = this.terrain, deferCommit = false } = {}) {
    if (this.disposed) return;
    for (const active of this.activeSteps) active.return();
    this.activeSteps.clear();
    for (const commit of this.pendingCommits) commit.dispose();
    const version = ++this.rebuildVersion, steps = this.prepareSteps(version, terrain, deferCommit);
    this.activeSteps.add(steps);
    try {
      for (; !this.disposed && version === this.rebuildVersion; ) {
        const result = steps.next();
        if (result.done) return result.value;
        yield;
      }
    } finally {
      steps.return(), this.activeSteps.delete(steps);
    }
  }
  *prepareSteps(version, terrain, deferCommit) {
    let pending = null;
    try {
      const terrains = [terrain, terrain.prevTerrain, terrain.nextTerrain, ...terrain.roadProtectors || []].filter(Boolean), samples = yield* roadSampleSteps(terrains.map((t) => t.roads)), groundAt = (x, z) => {
        let height = null;
        for (const t of terrains) {
          if (!t.owns(x, z)) continue;
          const y = t.renderedHeightAt(x, z);
          Number.isFinite(y) && (height = height === null ? y : Math.max(height, y));
        }
        return height;
      }, boxes = [], up = new THREE.Vector3(0, 1, 0);
      let candidates = 0;
      for (const leg of this.roads.legNames) {
        const curve = this.roads.legs[leg], length = curve.getLength();
        for (let at = 24; at < length - 12; at += 44) {
          ++candidates === 8 && (candidates = 0, yield);
          const s = at / length;
          if (this.roads.bridgeMix(leg, s) > 0.02) continue;
          const p = curve.getPointAt(s), ground = groundAt(p.x, p.z);
          if (ground === null || p.y - ground < 8) continue;
          const tangent = curve.getTangentAt(s), side = new THREE.Vector3().crossVectors(up, tangent).normalize(), yaw = Math.atan2(tangent.x, tangent.z), width = this.roads.widthAt(leg, s), cap = { x: p.x, y: p.y - 1.8, z: p.z, w: width + 0.5, h: 2, d: 3.6, yaw, kind: "cap" };
          if (!(yield* clearanceSteps(cap, samples))) continue;
          const pair = [];
          for (const sign of [-1, 1]) {
            const foot = p.clone().addScaledVector(side, sign * (width / 2 - 2)), y = groundAt(foot.x, foot.z);
            if (y === null) continue;
            const base = Math.min(y, WATERLINE) - 2, bottom = y > WATERLINE ? y - 0.8 : base, top = cap.y;
            if (top - bottom < 2) continue;
            const column = { x: foot.x, y: (bottom + top) / 2, z: foot.z, w: 2.6, h: top - bottom, d: 2.8, yaw, kind: "column" };
            (yield* clearanceSteps(column, samples)) && pair.push(column);
          }
          pair.length === 2 && boxes.push(...pair, cap);
        }
      }
      if (boxes.length) {
        pending = new THREE.InstancedMesh(this.geometry, this.material, boxes.length), pending.name = "road-viaduct-supports", pending.castShadow = pending.receiveShadow = true;
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3(), bounds = new THREE.Box3(), localBounds = this.geometry.boundingBox || new THREE.Box3().setFromBufferAttribute(this.geometry.attributes.position), transformed = new THREE.Box3();
        for (let i = 0; i < boxes.length; i++) {
          const box = boxes[i];
          m.compose(position.set(box.x, box.y, box.z), q.setFromAxisAngle(up, box.yaw), scale.set(box.w, box.h, box.d)), pending.setMatrixAt(i, m), bounds.union(transformed.copy(localBounds).applyMatrix4(m)), (i + 1) % 32 === 0 && (yield);
        }
        pending.userData.supportVolumes = boxes, pending.instanceMatrix.needsUpdate = true, pending.boundingBox = bounds, pending.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
      }
      if (yield, this.disposed || version !== this.rebuildVersion) return;
      const prepared = pending;
      pending = null;
      let settled = false;
      const commit = () => {
        if (settled) return;
        if (settled = true, this.pendingCommits.delete(commit), this.disposed || version !== this.rebuildVersion) {
          prepared && prepared.dispose();
          return;
        }
        const old = this.mesh;
        this.mesh = prepared, this.mesh && this.parent.add(this.mesh), old && (old.removeFromParent(), old.dispose());
      };
      if (commit.dispose = () => {
        settled || (settled = true, this.pendingCommits.delete(commit), prepared && prepared.dispose());
      }, deferCommit) return this.pendingCommits.add(commit), commit;
      commit();
    } finally {
      pending && pending.dispose();
    }
  }
  dispose() {
    this.disposed = true, this.rebuildVersion++;
    for (const active of this.activeSteps) active.return();
    this.activeSteps.clear();
    for (const commit of this.pendingCommits) commit.dispose();
    this.mesh && (this.mesh.removeFromParent(), this.mesh.dispose(), this.mesh = null), this.geometry.dispose(), this.material.dispose();
  }
}
export {
  RoadSupports,
  supportClearsRoads,
  supportRoadSamples
};
