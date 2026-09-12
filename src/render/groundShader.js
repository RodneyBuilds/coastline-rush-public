import * as THREE from "three";
const GROUND_TOKENS = Object.freeze({ NEAR_TILE: 5, FAR_TILE: 37, FADE_START: 55, FADE_END: 190, FAR_MIX: 0.82, ROCK_START: 0.72, ROCK_FULL: 1.35, ROCK_BREAK: 0.3, ROCK_COLOR: 9208695, PATCH_WAVELENGTH: 260, PATCH_DEPTH: 0.19, GRASS_STRENGTH: 0.72, GRASS_TILE: 0.83, GRASS_SHARPEN: 2.6 }), VERTEX_PARS = `
attribute float aGroundMix;
varying vec3 vGroundWorld;
varying vec3 vGroundNormal;
varying float vGroundDepth;
varying float vGroundMix;
`, VERTEX_BODY = `


  vec4 groundWorld = modelMatrix * vec4( transformed, 1.0 );
  vGroundWorld = groundWorld.xyz;
  vGroundNormal = normalize( mat3( modelMatrix ) * objectNormal );
  vGroundDepth = -( modelViewMatrix * vec4( transformed, 1.0 ) ).z;
  vGroundMix = aGroundMix;
`, FRAGMENT_PARS = `
varying vec3 vGroundWorld;
varying vec3 vGroundNormal;
varying float vGroundDepth;
varying float vGroundMix;

uniform sampler2D uGrassMap;
uniform float uGrassStrength;
uniform float uGrassTile;
uniform float uGrassSharpen;
uniform float uFarScale;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uFarMix;
uniform float uRockStart;
uniform float uRockFull;
uniform float uRockBreak;
uniform vec3  uRockColor;
uniform float uPatchFreq;
uniform float uPatchDepth;




float groundWave( vec2 p, float freq, float phaseA, float phaseB ) {
  float a = ( p.x * 0.61 + p.y * 0.52 ) * freq;
  float b = ( p.x * -0.43 + p.y * 0.68 ) * freq;
  return 0.58 * sin( a + phaseA ) + 0.42 * cos( b + phaseB );
}
`, MAP_FRAGMENT = `
#ifdef USE_MAP

  vec4 groundNear = texture2D( map, vMapUv );
  vec4 groundFar  = texture2D( map, vMapUv * uFarScale );
  float groundFade = smoothstep( uFadeStart, uFadeEnd, vGroundDepth ) * uFarMix;
  vec4 sampledDiffuseColor = mix( groundNear, groundFar, groundFade );










  float grassEdge = groundWave( vGroundWorld.xz, 0.19, -0.4, 2.1 ) * 0.22;
  float grassAmt = clamp( ( vGroundMix + grassEdge - 0.5 ) * uGrassSharpen + 0.5, 0.0, 1.0 );
  vec4 grassNear = texture2D( uGrassMap, vMapUv * uGrassTile );
  vec4 grassFar  = texture2D( uGrassMap, vMapUv * uGrassTile * uFarScale );
  vec4 grassTex  = mix( grassNear, grassFar, groundFade );
  sampledDiffuseColor = mix( sampledDiffuseColor, grassTex, grassAmt * uGrassStrength );

  diffuseColor *= sampledDiffuseColor;

#endif






  vec3 groundN = normalize( vGroundNormal );
  float groundSlope = length( groundN.xz ) / max( 0.08, abs( groundN.y ) );
  float rockBreak = groundWave( vGroundWorld.xz, 0.085, 1.7, -0.6 ) * uRockBreak;
  float rockAmount = smoothstep( uRockStart, uRockFull, groundSlope + rockBreak );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * uRockColor * 1.9, rockAmount * 0.55 );




  float groundPatch = groundWave( vGroundWorld.xz, uPatchFreq, 0.9, -2.2 );
  diffuseColor.rgb *= 1.0 + groundPatch * uPatchDepth;
`, NORMAL_FRAGMENT = `
#ifdef USE_NORMALMAP_OBJECTSPACE

  normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;

  #ifdef FLIP_SIDED
    normal = - normal;
  #endif

  #ifdef DOUBLE_SIDED
    normal = normal * faceDirection;
  #endif

  normal = normalize( normalMatrix * normal );

#elif defined( USE_NORMALMAP_TANGENTSPACE )

  vec3 groundMapNear = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
  vec3 groundMapFar  = texture2D( normalMap, vNormalMapUv * uFarScale ).xyz * 2.0 - 1.0;
  float groundNFade = smoothstep( uFadeStart, uFadeEnd, vGroundDepth ) * uFarMix;
  vec3 mapN = normalize( mix( groundMapNear, groundMapFar, groundNFade ) );
  mapN.xy *= normalScale;

  normal = normalize( tbn * mapN );

#elif defined( USE_BUMPMAP )

  normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );

#endif
`;
function makeGroundMaterial(material, grassMap = null) {
  const t = GROUND_TOKENS, uniforms = { uGrassMap: { value: grassMap }, uGrassStrength: { value: grassMap ? t.GRASS_STRENGTH : 0 }, uGrassTile: { value: t.GRASS_TILE }, uGrassSharpen: { value: t.GRASS_SHARPEN }, uFarScale: { value: t.NEAR_TILE / t.FAR_TILE }, uFadeStart: { value: t.FADE_START }, uFadeEnd: { value: t.FADE_END }, uFarMix: { value: t.FAR_MIX }, uRockStart: { value: t.ROCK_START }, uRockFull: { value: t.ROCK_FULL }, uRockBreak: { value: t.ROCK_BREAK }, uRockColor: { value: new THREE.Color(t.ROCK_COLOR) }, uPatchFreq: { value: Math.PI * 2 / t.PATCH_WAVELENGTH }, uPatchDepth: { value: t.PATCH_DEPTH } };
  return material.userData.groundUniforms = uniforms, material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms), shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
${VERTEX_PARS}`).replace("#include <project_vertex>", `#include <project_vertex>
${VERTEX_BODY}`), shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
${FRAGMENT_PARS}`).replace("#include <map_fragment>", MAP_FRAGMENT).replace("#include <normal_fragment_maps>", NORMAL_FRAGMENT).replace("#include <opaque_fragment>", `
        if (any(isnan(outgoingLight)) || any(isinf(outgoingLight))) {
          outgoingLight = max(diffuseColor.rgb, vec3(0.0)) * 0.5;
        }
        #include <opaque_fragment>`);
  }, material.customProgramCacheKey = () => "coastline-ground-v2-finite", material;
}
export {
  GROUND_TOKENS,
  makeGroundMaterial
};
