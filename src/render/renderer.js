import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createBloomPass } from "./bloom.js";
import { createAOPass } from "./ao.js";
const RENDER_TOKENS = Object.freeze({ TONE_MAPPING: THREE.ACESFilmicToneMapping, TONE_EXPOSURE: 0.78, SHADOW_TYPE: THREE.PCFSoftShadowMap, FOG_COLOR: 15777942, FOG_DENSITY: 82e-5, FOG_FAR_REFERENCE: 3e3, MIN_FAR_PLANE: 3400, CAMERA_FOV: 58, CAMERA_NEAR: 0.3, CAMERA_FAR: 3e3, PIXEL_RATIO: 1, MSAA_SAMPLES: 4 }), FOG_K = RENDER_TOKENS.FOG_DENSITY * RENDER_TOKENS.FOG_FAR_REFERENCE;
function fogDensityFor(fogFar) {
  return FOG_K / Math.max(1, fogFar);
}
function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(innerWidth, innerHeight, false), renderer.setPixelRatio(RENDER_TOKENS.PIXEL_RATIO), renderer.toneMapping = RENDER_TOKENS.TONE_MAPPING, renderer.toneMappingExposure = RENDER_TOKENS.TONE_EXPOSURE, renderer.shadowMap.enabled = true, renderer.shadowMap.type = RENDER_TOKENS.SHADOW_TYPE;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(RENDER_TOKENS.FOG_COLOR, RENDER_TOKENS.FOG_DENSITY);
  const camera = new THREE.PerspectiveCamera(RENDER_TOKENS.CAMERA_FOV, innerWidth / innerHeight, RENDER_TOKENS.CAMERA_NEAR, RENDER_TOKENS.CAMERA_FAR), samples = renderer.capabilities.isWebGL2 ? Math.min(RENDER_TOKENS.MSAA_SAMPLES, renderer.capabilities.maxSamples || 0) : 0, target = new THREE.WebGLRenderTarget(Math.max(1, innerWidth), Math.max(1, innerHeight), { type: THREE.HalfFloatType, samples });
  target.texture.name = "EffectComposer.rt1";
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const aoPass = createAOPass(scene, camera, Math.max(1, innerWidth), Math.max(1, innerHeight));
  composer.addPass(aoPass);
  const bloomPass = createBloomPass();
  composer.addPass(bloomPass), composer.addPass(new OutputPass());
  let width = 0, height = 0, resizeFrame = 0;
  const setSize = () => {
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(bounds.width));
    const nextHeight = Math.max(1, Math.round(bounds.height));
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
  };
  const scheduleSize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(setSize);
  };
  const observer = new ResizeObserver(scheduleSize);
  observer.observe(canvas);
  addEventListener("resize", scheduleSize);
  addEventListener("pageshow", scheduleSize);
  visualViewport?.addEventListener("resize", scheduleSize);
  setSize();
  return { renderer, scene, camera, composer, bloomPass, aoPass, setSize, dispose() {
    observer.disconnect();
    cancelAnimationFrame(resizeFrame);
    removeEventListener("resize", scheduleSize);
    removeEventListener("pageshow", scheduleSize);
    visualViewport?.removeEventListener("resize", scheduleSize);
    aoPass.dispose(); composer.dispose(); renderer.dispose();
  } };

}
function applyStageFog(scene, camera, lighting) {
  scene.fog.color.setHex(lighting.fogColor), scene.fog.density = fogDensityFor(lighting.fogFar), camera.far = Math.max(lighting.fogFar, RENDER_TOKENS.MIN_FAR_PLANE), camera.updateProjectionMatrix();
}
const _fogA = new THREE.Color(), _fogB = new THREE.Color();
function blendStageFog(scene, camera, a, b, k) {
  const t = THREE.MathUtils.clamp(k, 0, 1);
  scene.fog.color.copy(_fogA.setHex(a.fogColor)).lerp(_fogB.setHex(b.fogColor), t);
  const far = a.fogFar + (b.fogFar - a.fogFar) * t;
  scene.fog.density = fogDensityFor(far), camera.far = Math.max(far, RENDER_TOKENS.MIN_FAR_PLANE), camera.updateProjectionMatrix();
}
function frameCost(renderer, scene, camera) {
  renderer.render(scene, camera);
  const i = renderer.info;
  return { drawCalls: i.render.calls, triangles: i.render.triangles, programs: i.programs ? i.programs.length : 0 };
}
export {
  RENDER_TOKENS,
  applyStageFog,
  blendStageFog,
  createRenderer,
  fogDensityFor,
  frameCost
};
