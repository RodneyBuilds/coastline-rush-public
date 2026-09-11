import * as THREE from "three";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { GLARE_BLOOM_EASE } from "./lighting.js";
const BLOOM = Object.freeze({ strength: 0.55, radius: 0.2, threshold: 3 });
function createBloomPass() {
  const pass = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  return pass.materialHighPassFilter.fragmentShader = pass.materialHighPassFilter.fragmentShader.replace("vec4 texel = texture2D( tDiffuse, vUv );", `vec4 texel = texture2D( tDiffuse, vUv );
     if (any(isnan(texel)) || any(isinf(texel))) texel = vec4(0.0);
     texel = clamp(texel, vec4(0.0), vec4(64.0));`), pass;
}
function applyStageBloom(pass, lighting) {
  pass.threshold = lighting.bloomThreshold, pass.strength = BLOOM.strength;
}
function easeSunGlare(pass, glare) {
  const g = THREE.MathUtils.clamp(glare, 0, 1);
  pass.strength = BLOOM.strength * (1 - GLARE_BLOOM_EASE * g);
}
export {
  BLOOM,
  applyStageBloom,
  createBloomPass,
  easeSunGlare
};
