import * as THREE from "three";
import { WATERLINE, ROAD_MIN_CLEARANCE, CHAIN_DESCENT, GRAVEL_INSET, RAIL_OFFSET } from "../physics/constants.js";
const ROAD_STEP = 12, ARC_DIVISIONS = 2e3;
function smoothstep01(x) {
  const k = THREE.MathUtils.clamp(x, 0, 1);
  return k * k * (3 - 2 * k);
}
function integrateSegments(start, heading0, segs) {
  const pts = [new THREE.Vector3(start.x, start.y, start.z)];
  let x = start.x, y = start.y, z = start.z, h = heading0;
  for (const s of segs) {
    const n = Math.max(1, Math.round(s.len / ROAD_STEP)), dL = s.len / n;
    for (let i = 0; i < n; i++) h -= (s.curve || 0) * dL, x += Math.sin(h) * dL, z += Math.cos(h) * dL, y += (s.grade || 0) * dL, pts.push(new THREE.Vector3(x, y, z));
  }
  return { pts, end: new THREE.Vector3(x, y, z), heading: h };
}
function curveFromSegments(start, heading0, segs) {
  const built = integrateSegments(start, heading0, segs), c = new THREE.CatmullRomCurve3(built.pts, false, "centripetal");
  return c.arcLengthDivisions = ARC_DIVISIONS, c.updateArcLengths(), c.__end = built.end, c.__heading = built.heading, c;
}
function tightestRadius(segs) {
  let r = 1 / 0;
  for (const s of segs) s.curve && (r = Math.min(r, Math.abs(1 / s.curve)));
  return r;
}
function segmentsLength(segs) {
  let total = 0;
  for (const s of segs) total += s.len;
  return total;
}
function segmentsProfile(segs) {
  let y = 0, lo = 0, hi = 0;
  for (const s of segs) y += (s.grade || 0) * s.len, lo = Math.min(lo, y), hi = Math.max(hi, y);
  return { lo, hi, net: y };
}
function segmentsRise(segs) {
  const p = segmentsProfile(segs);
  return p.hi - p.lo;
}
function firstStageFrame(stage) {
  return { x: 0, y: WATERLINE + ROAD_MIN_CLEARANCE + CHAIN_DESCENT, z: 60, heading: stage.startHeading };
}
function framePlane(frame) {
  const nx = Math.sin(frame.heading), nz = Math.cos(frame.heading);
  return { x: frame.x, z: frame.z, nx, nz, ahead(x, z) {
    return (x - this.x) * this.nx + (z - this.z) * this.nz;
  } };
}
class RoadNetwork {
  constructor(stage, entry) {
    this.stage = stage, this.chained = !!entry, this.entry = entry || firstStageFrame(stage), this.entryPlane = framePlane(this.entry), this.roadWidth = stage.roadWidth, this.halfRoad = stage.roadWidth / 2 - GRAVEL_INSET, this.railOff = RAIL_OFFSET + (stage.roadWidth - 15) / 2, this.lanes = [-1.5, -0.5, 0.5, 1.5].map((k) => k * (stage.roadWidth / 4));
    const fork = stage.fork;
    this.forkOffset = fork ? fork.offset : 0, this.throatLen = fork ? fork.throatLen : 0, this.throatWidth = fork ? 2 * this.forkOffset + this.roadWidth : this.roadWidth, this.throatGrow = (this.throatWidth - this.roadWidth) / 2, this.baseY = this.entry.y, this.legs = this._buildLegs(), this.legNames = Object.keys(this.legs), this.mainLength = this.legs.main.getLength(), this.segmentsByLeg = { main: stage.segments, ...fork ? { left: fork.leftSegments, right: fork.rightSegments } : {} }, this.exitLegs = fork ? ["left", "right"] : ["main"], this.entryPhase = entry && Number.isFinite(entry.roadPhase) ? entry.roadPhase : 0;
  }
  exitFrame(leg) {
    const c = this.legs[leg];
    return { x: c.__end.x, y: c.__end.y, z: c.__end.z, heading: c.__heading, roadPhase: this.legPhase(leg) + c.getLength() / MARK_TILE };
  }
  legPhase(leg) {
    return ((leg === "main" ? this.entryPhase : this.entryPhase + this.mainLength / MARK_TILE) % 1 + 1) % 1;
  }
  _buildLegs() {
    const stage = this.stage, e = this.entry, main = curveFromSegments(new THREE.Vector3(e.x, e.y, e.z), e.heading, stage.segments);
    if (!stage.fork) return { main };
    const h = main.__heading, sx = Math.cos(h), sz = -Math.sin(h), mouth = (sign) => new THREE.Vector3(main.__end.x + sx * this.forkOffset * sign, main.__end.y, main.__end.z + sz * this.forkOffset * sign);
    return { main, left: curveFromSegments(mouth(1), h, stage.fork.leftSegments), right: curveFromSegments(mouth(-1), h, stage.fork.rightSegments) };
  }
  throatMix(leg, t) {
    if (leg !== "main" || !this.stage.fork) return 0;
    const d = (1 - t) * this.mainLength;
    return d >= this.throatLen ? 0 : smoothstep01(1 - d / this.throatLen);
  }
  halfRoadAt(leg, t) {
    return this.halfRoad + this.throatMix(leg, t) * this.throatGrow;
  }
  railOffsetAt(leg, t) {
    return this.railOff + this.throatMix(leg, t) * this.throatGrow;
  }
  widthAt(leg, t) {
    return this.roadWidth + this.throatMix(leg, t) * this.throatGrow * 2;
  }
  bridgeMix(leg, t) {
    const list = this.stage.bridges;
    if (!list || !list.length) return 0;
    let m = 0;
    for (const b of list) {
      if (b.leg !== leg) continue;
      const ramp = 18 / Math.max(1, this.legLength(leg)), k = Math.min(smoothstep01((t - (b.fromS - ramp)) / ramp), smoothstep01((b.toS + ramp - t) / ramp));
      m = Math.max(m, THREE.MathUtils.clamp(k, 0, 1));
    }
    return m;
  }
  legLength(leg) {
    return this.legs[leg].getLength();
  }
  longestRouteLength() {
    const main = this.mainLength;
    return this.stage.fork ? main + Math.max(this.legLength("left"), this.legLength("right")) : main;
  }
}
const MARK_TILE = 8;
function roadStrip(curve, width, segs, lift = 0.02, latOffset = 0, farY = null, uvWidth = 15, vStart = 0, opts = {}) {
  const widthAt = typeof width == "function" ? width : () => width, offsetAt = typeof latOffset == "function" ? latOffset : () => latOffset, tFrom = opts.tFrom === void 0 ? 0 : opts.tFrom, tTo = opts.tTo === void 0 ? 1 : opts.tTo, pos = [], uv = [], idx = [], up = new THREE.Vector3(0, 1, 0), safe = (off, radius) => {
    const cap = 0.72 * radius;
    return Math.abs(off) <= cap ? off : Math.sign(off) * cap;
  }, total = curve.getLength(), radiusAt = (t) => {
    const a = curve.getTangentAt(Math.max(0, t - 4e-3)), b = curve.getTangentAt(Math.min(1, t + 4e-3));
    let turn = Math.atan2(b.x, b.z) - Math.atan2(a.x, a.z);
    for (; turn > Math.PI; ) turn -= Math.PI * 2;
    for (; turn < -Math.PI; ) turn += Math.PI * 2;
    const arc = total * (Math.min(1, t + 4e-3) - Math.max(0, t - 4e-3));
    return Math.abs(turn) < 1e-5 ? 1 / 0 : Math.abs(arc / turn);
  };
  for (let i = 0; i <= segs; i++) {
    const t = tFrom + (tTo - tFrom) * (i / segs), p = curve.getPointAt(t), tan = curve.getTangentAt(t), side = new THREE.Vector3().crossVectors(up, tan).normalize(), R = radiusAt(t), w = widthAt(t), off = offsetAt(t), l = p.clone().addScaledVector(side, safe(off + w / 2, R)), r = p.clone().addScaledVector(side, safe(off - w / 2, R));
    pos.push(l.x, farY === null ? l.y + lift : farY, l.z, r.x, r.y + lift, r.z);
    const uh = w / (2 * uvWidth), v = vStart + t * total / MARK_TILE;
    if (uv.push(0.5 - uh, v, 0.5 + uh, v), i < segs) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  return geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)), geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)), geo.setIndex(idx), geo.computeVertexNormals(), geo;
}
export {
  MARK_TILE,
  RoadNetwork,
  curveFromSegments,
  firstStageFrame,
  framePlane,
  integrateSegments,
  roadStrip,
  segmentsLength,
  segmentsProfile,
  segmentsRise,
  smoothstep01,
  tightestRadius
};
