import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { MeshNormalMaterial, NoBlending } from "three";
const AO_TOKENS = Object.freeze({ ao: Object.freeze({ radius: 3, distanceExponent: 1.4, thickness: 1, distanceFallOff: 1, scale: 1, samples: 16, screenSpaceRadius: false }), denoise: Object.freeze({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 16 }), blendIntensity: 0.9 });
class GroundedAOPass extends GTAOPass {
  cutoutNormals =  new WeakMap();
  normalFor(material, fallback) {
    if (!material.alphaTest) return fallback;
    let normal = this.cutoutNormals.get(material);
    if (!normal) {
      normal = new MeshNormalMaterial({ side: material.side, blending: NoBlending });
      const mask = material.alphaMap;
      mask && (mask.updateMatrix(), normal.onBeforeCompile = (shader) => {
        shader.uniforms.foliageMask = { value: mask }, shader.uniforms.foliageMaskTransform = { value: mask.matrix }, shader.uniforms.foliageCutoff = { value: material.alphaTest }, shader.vertexShader = `varying vec2 vFoliageUv; uniform mat3 foliageMaskTransform;
` + shader.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
vFoliageUv = (foliageMaskTransform * vec3(uv, 1.0)).xy;`), shader.fragmentShader = `varying vec2 vFoliageUv; uniform sampler2D foliageMask; uniform float foliageCutoff;
` + shader.fragmentShader.replace("void main() {", `void main() {
if (texture2D(foliageMask, vFoliageUv).g < foliageCutoff) discard;`), shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
normal *= faceDirection;`);
      }, normal.customProgramCacheKey = () => "foliage-normal-mask-v1"), this.cutoutNormals.set(material, normal), material.addEventListener("dispose", () => normal.dispose());
    }
    return normal;
  }
  renderOverride(renderer, overrideMaterial, renderTarget, clearColor, clearAlpha) {
    const auto = renderer.shadowMap.autoUpdate, autoClear = renderer.autoClear, alpha = renderer.getClearAlpha();
    renderer.getClearColor(this.originalClearColor);
    const materials = [], hidden = [];
    renderer.shadowMap.autoUpdate = false;
    try {
      this.scene.traverseVisible((object) => {
        if (object.userData.noAO) {
          hidden.push(object), object.visible = false;
          return;
        }
        object.isMesh && (materials.push([object, object.material]), object.material = Array.isArray(object.material) ? object.material.map((m) => this.normalFor(m, overrideMaterial)) : this.normalFor(object.material, overrideMaterial));
      }), renderer.setRenderTarget(renderTarget), renderer.autoClear = false, renderer.setClearColor(clearColor, clearAlpha), renderer.clear(), renderer.render(this.scene, this.camera);
    } finally {
      for (const [object, material] of materials) object.material = material;
      for (const object of hidden) object.visible = true;
      renderer.autoClear = autoClear, renderer.setClearColor(this.originalClearColor, alpha), renderer.shadowMap.autoUpdate = auto;
    }
  }
}
function createAOPass(scene, camera, width, height) {
  const pass = new GroundedAOPass(scene, camera, width, height);
  return pass.gtaoMaterial.fragmentShader = pass.gtaoMaterial.fragmentShader.replace("ao = pow(ao, scale);", "ao = mix(pow(ao, scale), 1.0, smoothstep(70.0, 220.0, -viewPos.z));"), pass.updateGtaoMaterial({ ...AO_TOKENS.ao }), pass.updatePdMaterial({ ...AO_TOKENS.denoise }), pass.blendIntensity = AO_TOKENS.blendIntensity, pass.output = GTAOPass.OUTPUT.Default, pass;
}
export {
  AO_TOKENS,
  GroundedAOPass,
  createAOPass
};
