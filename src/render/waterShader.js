import * as THREE from "three";
const WATER_TOKENS = Object.freeze({ SWELL_TILE: 173, CHOP_TILE: 31, RIPPLE_TILE: 6.5, SWELL_WEIGHT: 1, CHOP_WEIGHT: 0.62, RIPPLE_WEIGHT: 0.34, RIPPLE_NEAR: 40, RIPPLE_FAR: 260, SHALLOW_TO: 7, FOAM_TO: 0.85, SWELL_SPEED: [55e-4, 31e-4], CHOP_SPEED: [-0.014, 92e-4], RIPPLE_SPEED: [0.031, -0.0255], DEEP_COLOR: 1926528, SHALLOW_COLOR: 5871247, FOAM_COLOR: 12175810 }), VERTEX_PARS = `
varying float vWaterDepth;
varying vec3 vWaterWorld;
`, VERTEX_BODY = `
  vWaterDepth = -( modelViewMatrix * vec4( transformed, 1.0 ) ).z;
  vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
`, FRAGMENT_PARS = `
varying float vWaterDepth;
varying vec3 vWaterWorld;
uniform float uTime;
uniform sampler2D uDepthMap;
uniform vec2 uFieldMin;
uniform vec2 uFieldSize;
uniform float uHasField;
uniform float uSeabed;
uniform float uWaterline;
uniform float uShallowTo;
uniform float uFoamTo;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec2 uChopScale;
uniform vec2 uRippleScale;
uniform vec2 uSwellSpeed;
uniform vec2 uChopSpeed;
uniform vec2 uRippleSpeed;
uniform float uChopWeight;
uniform float uRippleWeight;
uniform float uRippleNear;
uniform float uRippleFar;
`, COLOR_FRAGMENT = `



  vec2 fieldUv = ( vWaterWorld.xz - uFieldMin ) / uFieldSize;
  float inside = uHasField
    * step( 0.0, fieldUv.x ) * step( fieldUv.x, 1.0 )
    * step( 0.0, fieldUv.y ) * step( fieldUv.y, 1.0 );
  float ground = mix( uSeabed, uWaterline, 1.0 );
  float encoded = texture2D( uDepthMap, fieldUv ).r;
  ground = mix( uSeabed, uSeabed + ( uWaterline - uSeabed ) * encoded, inside );
  float depth = max( 0.0, uWaterline - ground );

  depth = mix( uShallowTo, depth, inside );

  float shallowness = 1.0 - smoothstep( 0.0, uShallowTo, depth );
  vec3 waterCol = mix( uDeepColor, uShallowColor, shallowness * shallowness );

  float foam = 1.0 - smoothstep( 0.0, uFoamTo, depth );
  waterCol = mix( waterCol, uFoamColor, foam * 0.72 );
  diffuseColor.rgb *= waterCol / max( vec3( 0.0001 ), uDeepColor );
`, NORMAL_FRAGMENT = `
#ifdef USE_NORMALMAP_TANGENTSPACE

  vec3 waterSwell = texture2D( normalMap, vNormalMapUv + uSwellSpeed * uTime ).xyz * 2.0 - 1.0;
  vec3 waterChop = texture2D( normalMap, vNormalMapUv * uChopScale + uChopSpeed * uTime ).xyz * 2.0 - 1.0;
  vec3 waterRipple = texture2D( normalMap, vNormalMapUv * uRippleScale + uRippleSpeed * uTime ).xyz * 2.0 - 1.0;



  float waterFine = 1.0 - smoothstep( uRippleNear, uRippleFar, vWaterDepth );

  vec3 mapN = vec3(
    waterSwell.xy
      + waterChop.xy * uChopWeight
      + waterRipple.xy * uRippleWeight * waterFine,
    waterSwell.z
  );
  mapN = normalize( mapN );
  mapN.xy *= normalScale;

  normal = normalize( tbn * mapN );

#elif defined( USE_BUMPMAP )

  normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );

#endif
`;
function makeWaterMaterial(material) {
  const t = WATER_TOKENS, uniforms = { uTime: { value: 0 }, uDepthMap: { value: new THREE.DataTexture(new Uint8Array([255]), 1, 1, THREE.RedFormat) }, uFieldMin: { value: new THREE.Vector2(0, 0) }, uFieldSize: { value: new THREE.Vector2(1, 1) }, uHasField: { value: 0 }, uSeabed: { value: 0 }, uWaterline: { value: 0 }, uShallowTo: { value: t.SHALLOW_TO }, uFoamTo: { value: t.FOAM_TO }, uDeepColor: { value: new THREE.Color(t.DEEP_COLOR) }, uShallowColor: { value: new THREE.Color(t.SHALLOW_COLOR) }, uFoamColor: { value: new THREE.Color(t.FOAM_COLOR) }, uChopScale: { value: new THREE.Vector2(t.SWELL_TILE / t.CHOP_TILE, t.SWELL_TILE / t.CHOP_TILE) }, uRippleScale: { value: new THREE.Vector2(t.SWELL_TILE / t.RIPPLE_TILE, t.SWELL_TILE / t.RIPPLE_TILE) }, uSwellSpeed: { value: new THREE.Vector2(...t.SWELL_SPEED) }, uChopSpeed: { value: new THREE.Vector2(...t.CHOP_SPEED) }, uRippleSpeed: { value: new THREE.Vector2(...t.RIPPLE_SPEED) }, uChopWeight: { value: t.CHOP_WEIGHT }, uRippleWeight: { value: t.RIPPLE_WEIGHT }, uRippleNear: { value: t.RIPPLE_NEAR }, uRippleFar: { value: t.RIPPLE_FAR } };
  return material.userData.waterUniforms = uniforms, uniforms.uDepthMap.value.needsUpdate = true, material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms), shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
${VERTEX_PARS}`).replace("#include <project_vertex>", `#include <project_vertex>
${VERTEX_BODY}`), shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
${FRAGMENT_PARS}`).replace("#include <color_fragment>", COLOR_FRAGMENT).replace("#include <normal_fragment_maps>", NORMAL_FRAGMENT);
  }, material.customProgramCacheKey = () => "coastline-water-v1", material;
}
export {
  WATER_TOKENS,
  makeWaterMaterial
};
