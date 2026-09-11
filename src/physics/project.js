import * as THREE from "three";
const UP = new THREE.Vector3(0, 1, 0), _probe = new THREE.Vector3(), _cp = new THREE.Vector3(), _tan = new THREE.Vector3(), _side = new THREE.Vector3(), _rel = new THREE.Vector3(), _out = { s: 0, lateral: 0, y: 0, slope: 0 }, PROBE_STEPS = [4e-3, 4e-4, 4e-5, 6e-6];
function projectToCurve(curve, sGuess, pos) {
  let bestT = sGuess, bestD = 1 / 0;
  for (const step of PROBE_STEPS) {
    const center = bestT;
    for (let i = -6; i <= 8; i++) {
      const t = THREE.MathUtils.clamp(center + i * step, 0, 1), d = curve.getPointAt(t, _probe).distanceToSquared(pos);
      d < bestD && (bestD = d, bestT = t);
    }
  }
  return bestT;
}
function resolveOnLeg(curve, sGuess, pos) {
  const s = projectToCurve(curve, sGuess, pos), cp = curve.getPointAt(s, _cp), tan = curve.getTangentAt(s, _tan), side = _side.crossVectors(UP, tan).normalize(), rel = _rel.copy(pos).sub(cp);
  return _out.s = s, _out.lateral = rel.dot(side), _out.y = cp.y, _out.slope = tan.y, _out;
}
function frameAt(curve, s, outPoint, outSide, outTangent) {
  curve.getPointAt(s, outPoint), curve.getTangentAt(s, outTangent), outSide.crossVectors(UP, outTangent).normalize();
}
function legTransition(leg, s, lateral, hasFork) {
  return leg === "main" ? s <= 0.999 ? { kind: "none" } : hasFork ? { kind: "fork", branch: lateral > 0 ? "left" : "right" } : { kind: "finish" } : s > 0.999 ? { kind: "finish" } : { kind: "none" };
}
function stageProgress(leg, s, hasFork) {
  return hasFork ? leg === "main" ? 0.5 * s : 0.5 + 0.5 * s : THREE.MathUtils.clamp(s, 0, 1);
}
export {
  frameAt,
  legTransition,
  projectToCurve,
  resolveOnLeg,
  stageProgress
};
