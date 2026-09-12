import * as THREE from "three";
import { materials } from "../render/materials.js";
import { WATERLINE } from "../physics/constants.js";
const TOWER_RISE = 62, PIER = { along: 11, across: 9 }, EDGE_GAP = 2.6, ARCH_CLEAR = 13, SUSPENDER_STEP = 13, CABLE = 0.9;
function cableHeight(u, t0, t1) {
  const top = TOWER_RISE;
  if (u <= t0) return top * (u / t0);
  if (u >= t1) return top * ((1 - u) / (1 - t1));
  const k = (u - t0) / (t1 - t0);
  return top * (1 - 0.78 * 4 * k * (1 - k));
}
class Bridge {
  constructor(scene, roads, def) {
    this.scene = scene, this.def = def, this.objects = [];
    const curve = roads.legs[def.leg];
    if (!curve) return;
    const outer = roads.roadWidth / 2 + EDGE_GAP, from = def.fromS, to = def.toS, span = (to - from) * curve.getLength(), at = (u) => curve.getPointAt(from + (to - from) * u), frameAt = (u) => {
      const t = from + (to - from) * u, p = curve.getPointAt(t), tan = curve.getTangentAt(t), side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize();
      return { p, tan, side };
    };
    for (const sign of [1, -1]) this.objects.push(this._rail(curve, from, to, outer * sign));
    const towers = [def.towerAt[0], def.towerAt[1]];
    for (const u of towers) {
      const f = frameAt(u), g = new THREE.Group(), foundationDepth = Math.max(0, f.p.y - WATERLINE + 3);
      for (const sign of [1, -1]) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(PIER.across, TOWER_RISE + foundationDepth, PIER.along), materials.bridgeStone);
        pier.position.copy(f.p).addScaledVector(f.side, sign * (outer + PIER.across / 2)), pier.position.y += TOWER_RISE / 2 - 2 - foundationDepth / 2, pier.castShadow = true, g.add(pier);
      }
      for (const [y, h] of [[ARCH_CLEAR, 3.4], [ARCH_CLEAR + 16, 3]]) {
        const width = (outer + PIER.across) * 2, beam = new THREE.Mesh(new THREE.BoxGeometry(width, h, PIER.along * 0.8), materials.bridgeStone);
        beam.position.copy(f.p), beam.position.y += y + h / 2, beam.castShadow = true, g.add(beam);
      }
      g.lookAt(f.p.clone().add(f.tan)), g.quaternion.identity(), g.position.set(0, 0, 0);
      for (const child of g.children) child.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(f.tan.x, 0, f.tan.z).normalize());
      this.scene.add(g), this.objects.push(g);
    }
    const t0 = towers[0], t1 = towers[1], steps = Math.max(24, Math.round(span / 10));
    for (const sign of [1, -1]) {
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const u = i / steps, f = frameAt(u), p = f.p.clone().addScaledVector(f.side, sign * (outer + PIER.across / 2));
        p.y += cableHeight(u, t0, t1), pts.push(p);
      }
      const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), steps, CABLE / 2, 5, false), materials.bridgeCable);
      this.scene.add(cable), this.objects.push(cable);
    }
    const drops = [], n = Math.max(2, Math.round(span / SUSPENDER_STEP));
    for (let i = 1; i < n; i++) {
      const u = i / n;
      if (u < t0 || u > t1) continue;
      const h = cableHeight(u, t0, t1);
      if (h < 3) continue;
      const f = frameAt(u);
      for (const sign of [1, -1]) drops.push({ p: f.p.clone().addScaledVector(f.side, sign * (outer + PIER.across / 2)), h });
    }
    if (drops.length) {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 1, 0.34), materials.bridgeCable, drops.length), m = new THREE.Matrix4();
      drops.forEach((d, i) => {
        m.makeScale(1, d.h, 1), m.setPosition(d.p.x, d.p.y + d.h / 2, d.p.z), mesh.setMatrixAt(i, m);
      }), mesh.instanceMatrix.needsUpdate = true, this.scene.add(mesh), this.objects.push(mesh);
    }
  }
  _rail(curve, from, to, lateral) {
    const up = new THREE.Vector3(0, 1, 0), segs = Math.max(24, Math.round((to - from) * curve.getLength() / 6)), pos = [], idx = [], H = 1.5, T = 0.5;
    for (let i = 0; i <= segs; i++) {
      const t = from + (to - from) * (i / segs), p = curve.getPointAt(t), tan = curve.getTangentAt(t), side = new THREE.Vector3().crossVectors(up, tan).normalize(), a = p.clone().addScaledVector(side, lateral - T / 2), b = p.clone().addScaledVector(side, lateral + T / 2);
      if (pos.push(a.x, p.y, a.z, b.x, p.y, b.z, a.x, p.y + H, a.z, b.x, p.y + H, b.z), i < segs) {
        const k = i * 4;
        idx.push(k, k + 4, k + 2, k + 2, k + 4, k + 6), idx.push(k + 1, k + 3, k + 5, k + 3, k + 7, k + 5), idx.push(k + 2, k + 6, k + 3, k + 3, k + 6, k + 7), idx.push(k, k + 1, k + 4, k + 1, k + 5, k + 4);
      }
    }
    idx.push(0, 2, 1, 1, 2, 3);
    const end = segs * 4;
    idx.push(end, end + 1, end + 2, end + 1, end + 3, end + 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)), geo.setIndex(idx), geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, materials.bridgeStone);
    return mesh.castShadow = true, this.scene.add(mesh), mesh;
  }
  dispose() {
    for (const o of this.objects) this.scene.remove(o), o.traverse((c) => {
      c.geometry && c.geometry.dispose(), c.isInstancedMesh && c.dispose();
    });
    this.objects.length = 0;
  }
}
export {
  Bridge,
  cableHeight
};
