import * as THREE from "three";
import { materials, signTexture, highwaySignTexture } from "../render/materials.js";
import { disposeTree } from "./dispose.js";
import { COPY, destinationSign } from "../ui/copy.js";
const UP = new THREE.Vector3(0, 1, 0), FORK_CLEAR = 45, KERB_W = 0.55, NOSE_W = 1.3, ISLAND_RUN = 190, DESTINATION_AT = 0.84;
function buildRail(scene, curve, sideSign, from = 0, to = 1, offsetAt = null, defaultOffset = 9.6) {
  const span = to - from, offAt = offsetAt || (() => defaultOffset), n = Math.max(8, Math.round(curve.getLength() * span / 9)), posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.85, 0.14), materials.railPost, n), m4 = new THREE.Matrix4(), railPts = [];
  for (let i = 0; i < n; i++) {
    const t = from + i / (n - 1) * span, p = curve.getPointAt(t), tan = curve.getTangentAt(t), side = new THREE.Vector3().crossVectors(UP, tan).normalize(), pp = p.clone().addScaledVector(side, offAt(t) * sideSign);
    m4.makeTranslation(pp.x, pp.y + 0.42, pp.z), posts.setMatrixAt(i, m4), railPts.push(new THREE.Vector3(pp.x, pp.y + 0.74, pp.z));
  }
  posts.castShadow = true, posts.instanceMatrix.needsUpdate = true, scene.add(posts);
  const beam = new THREE.Mesh(wBeamGeometry(new THREE.CatmullRomCurve3(railPts), Math.max(24, n * 2), sideSign), materials.railBeam);
  return beam.castShadow = true, scene.add(beam), [posts, beam];
}
const W_PROFILE = Object.freeze([[-0.018, -0.156], [0.03, -0.132], [0.046, -0.072], [0.014, 0], [0.046, 0.072], [0.03, 0.132], [-0.018, 0.156]]);
function wBeamGeometry(curve, segs, sideSign) {
  const nSeg = W_PROFILE.length - 1, verts = new Float32Array(nSeg * 2 * (segs + 1) * 3), idx = [], p = new THREE.Vector3(), tan = new THREE.Vector3(), face = new THREE.Vector3();
  let v = 0;
  for (let j = 0; j < nSeg; j++) {
    const base = v / 3;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      curve.getPointAt(t, p), curve.getTangentAt(t, tan), face.crossVectors(UP, tan).normalize().multiplyScalar(-sideSign);
      for (const k of [j, j + 1]) {
        const [d, h] = W_PROFILE[k];
        verts[v++] = p.x + face.x * d, verts[v++] = p.y + h, verts[v++] = p.z + face.z * d;
      }
    }
    for (let i = 0; i < segs; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, e = a + 3;
      idx.push(a, c, b, b, c, e);
    }
  }
  const g = new THREE.BufferGeometry();
  return g.setAttribute("position", new THREE.BufferAttribute(verts, 3)), g.setIndex(idx), g.computeVertexNormals(), g.computeBoundingSphere(), g;
}
function buildIsland(scene, roads) {
  const added = [], stage = roads.stage;
  if (!stage.fork) return added;
  const islandH = stage.fork.islandHeight, legLeft = roads.legs.left, legRight = roads.legs.right, legMain = roads.legs.main, edge = (curve, sign, t) => {
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t), side = new THREE.Vector3().crossVectors(UP, tan).normalize();
    return p.clone().addScaledVector(side, roads.roadWidth / 2 * sign);
  }, N = 72, spanL = ISLAND_RUN / legLeft.getLength(), spanR = ISLAND_RUN / legRight.getLength(), pair = (k) => [edge(legLeft, -1, k * spanL), edge(legRight, 1, k * spanR)];
  let k0 = 0;
  for (let i = 0; i <= N * 4; i++) {
    const k = i / (N * 4), [a, b] = pair(k);
    if (a.distanceTo(b) >= NOSE_W) {
      k0 = k;
      break;
    }
  }
  const topPos = [], topIdx = [], kerbPos = [], kerbIdx = [], rows = [];
  for (let i = 0; i <= N; i++) {
    const k = k0 + i / N * (1 - k0), [a, b] = pair(k), across = b.clone().sub(a), w = across.length(), u = across.clone().divideScalar(w || 1), inset = Math.min(KERB_W, Math.max(0, (w - 0.2) / 2));
    rows.push({ a, b, aIn: a.clone().addScaledVector(u, inset), bIn: b.clone().addScaledVector(u, -inset) });
  }
  for (let i = 0; i <= N; i++) {
    const r = rows[i];
    if (topPos.push(r.aIn.x, r.aIn.y + islandH, r.aIn.z, r.bIn.x, r.bIn.y + islandH, r.bIn.z), kerbPos.push(r.a.x, r.a.y + 0.03, r.a.z, r.aIn.x, r.aIn.y + islandH, r.aIn.z, r.bIn.x, r.bIn.y + islandH, r.bIn.z, r.b.x, r.b.y + 0.03, r.b.z), i < N) {
      const o = i * 2;
      topIdx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
      const q2 = i * 4;
      kerbIdx.push(q2, q2 + 1, q2 + 4, q2 + 1, q2 + 5, q2 + 4), kerbIdx.push(q2 + 2, q2 + 3, q2 + 6, q2 + 3, q2 + 7, q2 + 6);
    }
  }
  const mkGeo = (pos, idx) => {
    const g = new THREE.BufferGeometry();
    return g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)), g.setIndex(idx), g.computeVertexNormals(), g;
  }, island = new THREE.Mesh(mkGeo(topPos, topIdx), materials.island);
  island.receiveShadow = true, scene.add(island), added.push(island);
  const kerb = new THREE.Mesh(mkGeo(kerbPos, kerbIdx), materials.kerb);
  kerb.castShadow = true, kerb.receiveShadow = true, scene.add(kerb), added.push(kerb);
  const nose = rows[0], noseMid = nose.a.clone().add(nose.b).multiplyScalar(0.5), tanM = legMain.getTangentAt(1), faceY = Math.atan2(tanM.x, tanM.z), board = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshStandardMaterial({ map: goreArrowTexture(), roughness: 0.55, side: THREE.DoubleSide, emissive: 3351562 }));
  board.position.set(noseMid.x, noseMid.y + islandH + 1.9, noseMid.z), board.rotation.y = faceY, board.castShadow = true, board.userData.ownedMaterials = [board.material], scene.add(board), added.push(board);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.9), materials.signPost);
    post.position.set(noseMid.x + Math.cos(faceY) * s * 1.7, noseMid.y + islandH + 0.95, noseMid.z - Math.sin(faceY) * s * 1.7), post.castShadow = true, scene.add(post), added.push(post);
  }
  const CHEVRONS = 8, chev = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 5865540, roughness: 1 }), CHEVRONS), m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, faceY, 0)), sc = new THREE.Vector3(1.1, 0.65, 1.4);
  for (let i = 0; i < CHEVRONS; i++) {
    const r = rows[Math.round((i + 1) / (CHEVRONS + 2) * N)], mid = r.aIn.clone().add(r.bIn).multiplyScalar(0.5);
    m4.compose(new THREE.Vector3(mid.x, mid.y + islandH + 0.5, mid.z), q, sc), chev.setMatrixAt(i, m4);
  }
  return chev.castShadow = true, chev.userData.ownedMaterials = [chev.material], chev.instanceMatrix.needsUpdate = true, scene.add(chev), added.push(chev), added;
}
function goreArrowTexture() {
  const c = document.createElement("canvas");
  c.width = 512, c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#14171c", g.fillRect(0, 0, 512, 256), g.fillStyle = "#ffd23f";
  for (const dir of [-1, 1]) {
    const cx = dir < 0 ? 128 : 384;
    for (let s = 0; s < 3; s++) {
      const o = s * 46 - 46;
      g.beginPath(), g.moveTo(cx + dir * (o + 40), 128), g.lineTo(cx + dir * o, 40), g.lineTo(cx + dir * (o - 22), 40), g.lineTo(cx + dir * (o + 18), 128), g.lineTo(cx + dir * (o - 22), 216), g.lineTo(cx + dir * o, 216), g.closePath(), g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  return t.colorSpace = THREE.SRGBColorSpace, t;
}
function makeSignpost(scene, curve, facing, t, text, color, roadWidth) {
  const p = curve.getPointAt(t), tan = curve.getTangentAt(t), side = new THREE.Vector3().crossVectors(UP, tan).normalize(), g = new THREE.Group(), post = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 6.6), materials.signPost);
  post.position.copy(p).addScaledVector(side, roadWidth / 2 + 2.2), post.position.y += 3.3, post.castShadow = true, g.add(post);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 2.6), new THREE.MeshStandardMaterial({ map: signTexture(text, color, 768, 176, true), roughness: 0.55, side: THREE.DoubleSide, emissive: 2763306 }));
  board.position.copy(post.position), board.position.y += 2.4, board.position.addScaledVector(side, -1.2);
  const away = facing.getTangentAt(1);
  return board.lookAt(board.position.clone().sub(new THREE.Vector3(away.x, 0, away.z))), board.castShadow = true, board.userData.signText = text, board.userData.signKind = "signpost", g.add(board), g.userData.ownedMaterials = [board.material], scene.add(g), g;
}
function strut(a, b, thickness, material) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length(), mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, len, thickness), material);
  return mesh.position.copy(a).addScaledVector(dir, 0.5), mesh.quaternion.setFromUnitVectors(UP, dir.normalize()), mesh.castShadow = true, mesh;
}
const GANTRY_CLEAR = 5.4, PANEL_H = 2.6;
function makeArch(scene, curve, t, text, color, roadWidth) {
  const p = curve.getPointAt(t), tan = curve.getTangentAt(t), side = new THREE.Vector3().crossVectors(UP, tan).normalize(), g = new THREE.Group(), span = roadWidth + 3.2, legOut = roadWidth / 2 + 1.6, trussY = GANTRY_CLEAR + PANEL_H + 0.55;
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.62, trussY, 0.62), materials.archPost);
    leg.position.copy(p).addScaledVector(side, legOut * s), leg.position.y += trussY / 2, leg.castShadow = true, g.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), materials.gantryTrim);
    foot.position.copy(p).addScaledVector(side, legOut * s), foot.position.y += 0.25, foot.castShadow = true, foot.receiveShadow = true, g.add(foot);
    const foot3 = p.clone().addScaledVector(side, legOut * s).setY(p.y + trussY - 3.2), head3 = p.clone().addScaledVector(side, (legOut - 2.4) * s).setY(p.y + trussY - 0.34), behind = new THREE.Vector3(tan.x, 0, tan.z).normalize().multiplyScalar(0.5);
    foot3.add(behind), head3.add(behind), g.add(strut(foot3, head3, 0.28, materials.archPost));
  }
  for (const dy of [0, -(PANEL_H + 0.42)]) {
    const a = p.clone().addScaledVector(side, -(span / 2 + 0.7)).setY(p.y + trussY + dy), b = p.clone().addScaledVector(side, span / 2 + 0.7).setY(p.y + trussY + dy);
    g.add(strut(a, b, 0.34, materials.archPost));
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(span, PANEL_H, 0.22), [materials.gantryTrim, materials.gantryTrim, materials.gantryTrim, materials.gantryTrim, new THREE.MeshStandardMaterial({ map: highwaySignTexture(text), roughness: 1, emissive: 1054736, envMapIntensity: 0.1 }), materials.gantryTrim]);
  return banner.position.copy(p), banner.position.y += GANTRY_CLEAR + PANEL_H / 2, banner.lookAt(banner.position.clone().sub(new THREE.Vector3(tan.x, 0, tan.z))), banner.castShadow = true, banner.userData.signText = text, banner.userData.signKind = "arch", g.add(banner), g.userData.ownedMaterials = [banner.material[4]], scene.add(g), g;
}
class Signage {
  constructor(scene, roads, nextNames = {}, { defer = false } = {}) {
    if (this.scene = scene, this.roads = roads, this.objects = [], this.building = this._build(nextNames), !defer) for (const unused of this.finishSteps()) ;
  }
  *finishSteps() {
    this.building && (yield* this.building, this.building = null);
  }
  *_build(nextNames) {
    const scene = this.scene, roads = this.roads, stage = roads.stage, rw = roads.roadWidth, add = (o) => {
      Array.isArray(o) ? this.objects.push(...o) : this.objects.push(o);
    };
    if (stage.fork) {
      add(buildRail(scene, roads.legs.main, 1, 0, 1, (t) => roads.railOffsetAt("main", t))), yield "signage.rail", add(buildRail(scene, roads.legs.left, 1, 0, 1, null, roads.railOff)), yield "signage.rail", add(buildRail(scene, roads.legs.right, -1, 0, 1, null, roads.railOff)), yield "signage.rail";
      const start = FORK_CLEAR / roads.legs.right.getLength();
      add(buildRail(scene, roads.legs.right, 1, start, 1, null, roads.railOff)), yield "signage.rail", add(buildIsland(scene, roads)), yield "signage.island";
      const archAt = 1 - (roads.throatLen + 26) / roads.mainLength;
      add(makeArch(scene, roads.legs.main, archAt, COPY.signage.routeWarning, "#0d2a66", rw)), yield "signage.sign", add(makeSignpost(scene, roads.legs.left, roads.legs.main, 0.055, stage.fork.leftLabel, "#1f7ac4", rw)), yield "signage.sign", add(makeSignpost(scene, roads.legs.right, roads.legs.main, 0.062, stage.fork.rightLabel, "#c4531f", rw)), yield "signage.sign";
    } else add(buildRail(scene, roads.legs.main, 1, 0, 1, null, roads.railOff)), yield "signage.rail", add(buildRail(scene, roads.legs.main, -1, 0, 1, null, roads.railOff)), yield "signage.rail";
    stage.gateway && (add(makeArch(scene, roads.legs.main, stage.gateway.at, stage.gateway.label, "#0d6b3f", rw)), yield "signage.sign");
    for (const marker of stage.markers || []) add(makeArch(scene, roads.legs.main, marker.at, marker.label, "#0d6b3f", rw)), yield "signage.sign";
    for (const cp of stage.checkpoints) for (const [leg, t] of this._legPositionsFor(cp.at)) add(makeArch(scene, roads.legs[leg], t, cp.label || COPY.signage.checkpoint, "#ff5a4e", rw)), yield "signage.sign";
    if (stage.fork) {
      const ends = [["left", stage.fork.leftStage, nextNames.leftName, nextNames.leftRegion], ["right", stage.fork.rightStage, nextNames.rightName, nextNames.rightRegion]];
      for (const [leg, nextId, name, region] of ends) {
        const text = nextId && region ? destinationSign(region, stage.region, name) : COPY.signage.finish;
        add(makeArch(scene, roads.legs[leg], DESTINATION_AT, text, "#ffb400", rw)), yield "signage.sign";
      }
    } else add(makeArch(scene, roads.legs.main, 0.975, COPY.signage.finish, "#ffb400", rw)), yield "signage.sign";
  }
  _legPositionsFor(at) {
    if (!this.roads.stage.fork) return [["main", at]];
    if (at < 0.5) return [["main", at * 2]];
    const t = (at - 0.5) * 2;
    return [["left", t], ["right", t]];
  }
  dispose() {
    this.building?.return(), this.building = null;
    for (const o of this.objects) this.scene.remove(o), disposeTree(o), o.dispose && o.dispose();
    this.objects.length = 0;
  }
}
export {
  Signage,
  buildIsland,
  buildRail,
  makeArch,
  makeSignpost
};
