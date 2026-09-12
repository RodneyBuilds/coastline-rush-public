import * as THREE from "three";
import { LandscapeSky as Sky } from "./landscapeSky.js";
const SKY_TOKENS = Object.freeze({ turbidity: 4, rayleigh: 2.2, mieCoefficient: 45e-4, mieDirectionalG: 0.86, elevation: 7, azimuth: 206, shadowRadius: 4 }), GLARE_TIGHT = 20, GLARE_WIDE = 58, GLARE_HIGH_SUN = 30, GLARE_EXPOSURE_EASE = 0.3, GLARE_BLOOM_EASE = 0.72, GLARE_MIE_KEEP = 0.28, SHADOW_LEVELS = Object.freeze([Object.freeze({ size: 4096, half: 90 }), Object.freeze({ size: 2048, half: 45 }), Object.freeze({ size: 1024, half: 22.5 })]);
class LightingRig {
  constructor(scene, renderer) {
    this.scene = scene, this.renderer = renderer, this.sun = new THREE.Vector3(), this.sky = new Sky(), this.sky.scale.setScalar(6e3), scene.add(this.sky), this.pmrem = new THREE.PMREMGenerator(renderer), this.pmrem.compileEquirectangularShader(), this.envScene = new THREE.Scene(), this.envSky = new Sky(), this.envSky.scale.setScalar(100), this.envScene.add(this.envSky), this.envTarget = null, this.sunLight = new THREE.DirectionalLight(16772307, 2.6), this.sunLight.castShadow = true, this.sunLight.shadow.bias = -2e-4, this.sunLight.shadow.normalBias = 0.06, this.sunLight.shadow.radius = SKY_TOKENS.shadowRadius, this.shadowDistance = 0, this._shadowLevel = -1, this.setQuality(0), scene.add(this.sunLight), scene.add(this.sunLight.target), this.hemi = new THREE.HemisphereLight(12967935, 5398843, 0.85), scene.add(this.hemi), this.fill = new THREE.DirectionalLight(15922412, 0.35), this.fill.position.set(60, 30, 80), scene.add(this.fill), this.apply({ skyTurbidity: SKY_TOKENS.turbidity, rayleigh: SKY_TOKENS.rayleigh, sunElevation: SKY_TOKENS.elevation, sunAzimuth: SKY_TOKENS.azimuth, exposure: 0.6 });
  }
  apply(lighting) {
    const u = this.sky.material.uniforms;
    u.turbidity.value = lighting.skyTurbidity, u.rayleigh.value = lighting.rayleigh, u.mieCoefficient.value = SKY_TOKENS.mieCoefficient, u.mieDirectionalG.value = SKY_TOKENS.mieDirectionalG, this.sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - lighting.sunElevation), THREE.MathUtils.degToRad(lighting.sunAzimuth)), u.sunPosition.value.copy(this.sun), Number.isFinite(lighting.exposure) && (this._stageExposure = lighting.exposure, this.renderer.toneMappingExposure = lighting.exposure);
    const daylight = THREE.MathUtils.smoothstep(lighting.sunElevation, 4, 28);
    this.sunLight.color.setHex(16759426).lerp(new THREE.Color(16774109), daylight), this._elevation = lighting.sunElevation, this._bakeEnvironment(lighting);
  }
  easeGlare(forward) {
    const elevation = Number.isFinite(this._elevation) ? this._elevation : SKY_TOKENS.elevation, fx = forward.x, fz = forward.z, fl = Math.hypot(fx, fz) || 1, sl = Math.hypot(this.sun.x, this.sun.z) || 1, dot = THREE.MathUtils.clamp((fx * this.sun.x + fz * this.sun.z) / (fl * sl), -1, 1), angle = THREE.MathUtils.radToDeg(Math.acos(dot)), t = THREE.MathUtils.smoothstep(angle, GLARE_TIGHT, GLARE_WIDE), low = THREE.MathUtils.clamp(1 - Math.max(0, elevation) / GLARE_HIGH_SUN, 0, 1), g = (1 - t) * low;
    return this.glare = g, Number.isFinite(this._stageExposure) && (this.renderer.toneMappingExposure = this._stageExposure * (1 - GLARE_EXPOSURE_EASE * g)), this.sky.material.uniforms.mieCoefficient.value = SKY_TOKENS.mieCoefficient * (1 - (1 - GLARE_MIE_KEEP) * g), g;
  }
  applyBlend(a, b, k) {
    const t = THREE.MathUtils.clamp(k, 0, 1), mix = (key) => a[key] + (b[key] - a[key]) * t;
    this.apply({ skyTurbidity: mix("skyTurbidity"), rayleigh: mix("rayleigh"), sunElevation: mix("sunElevation"), sunAzimuth: mix("sunAzimuth"), exposure: mix("exposure") });
  }
  _bakeEnvironment(lighting) {
    const last = this._baked;
    if (last && Math.abs(last.skyTurbidity - lighting.skyTurbidity) < 0.15 && Math.abs(last.rayleigh - lighting.rayleigh) < 0.05 && Math.abs(last.sunElevation - lighting.sunElevation) < 0.15 && Math.abs(last.sunAzimuth - lighting.sunAzimuth) < 0.5) return;
    this._baked = { skyTurbidity: lighting.skyTurbidity, rayleigh: lighting.rayleigh, sunElevation: lighting.sunElevation, sunAzimuth: lighting.sunAzimuth };
    const su = this.envSky.material.uniforms;
    su.turbidity.value = lighting.skyTurbidity, su.rayleigh.value = lighting.rayleigh, su.mieCoefficient.value = SKY_TOKENS.mieCoefficient, su.mieDirectionalG.value = SKY_TOKENS.mieDirectionalG, su.sunPosition.value.copy(this.sun);
    const previous = this.envTarget;
    this.envTarget = this.pmrem.fromScene(this.envScene, 0.02), this.scene.environment = this.envTarget.texture, previous && previous.dispose();
  }
  setQuality(level) {
    const i = THREE.MathUtils.clamp(level | 0, 0, SHADOW_LEVELS.length - 1);
    if (i === this._shadowLevel) return;
    this._shadowLevel = i;
    const { size, half } = SHADOW_LEVELS[i];
    const mapSize = size;
      this.sunLight.shadow.mapSize.set(mapSize, mapSize);
    const cam = this.sunLight.shadow.camera;
    Object.assign(cam, { left: -half, right: half, top: half, bottom: -half, near: 0.5, far: half * 6 }), cam.updateProjectionMatrix(), this.shadowDistance = half * 3, this.sunLight.shadow.map && (this.sunLight.shadow.map.dispose(), this.sunLight.shadow.map = null);
  }
  follow(target) {
    this.sunLight.position.copy(target).addScaledVector(this.sun, this.shadowDistance), this.sunLight.target.position.copy(target);
  }
  dispose() {
    this.envTarget && this.envTarget.dispose(), this.pmrem.dispose();
  }
}
export {
  GLARE_BLOOM_EASE,
  GLARE_EXPOSURE_EASE,
  GLARE_HIGH_SUN,
  GLARE_MIE_KEEP,
  GLARE_TIGHT,
  GLARE_WIDE,
  LightingRig,
  SKY_TOKENS
};
