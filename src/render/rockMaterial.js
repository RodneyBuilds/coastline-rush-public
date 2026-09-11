function rockMaterial(material) {
  return material.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying vec3 vRockWorld;
` + shader.vertexShader.replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
vRockWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`), shader.fragmentShader = `
      varying vec3 vRockWorld;
      float rockHash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      float rockNoise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(rockHash(i),rockHash(i+vec3(1,0,0)),f.x),
                       mix(rockHash(i+vec3(0,1,0)),rockHash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(rockHash(i+vec3(0,0,1)),rockHash(i+vec3(1,0,1)),f.x),
                       mix(rockHash(i+vec3(0,1,1)),rockHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
    ` + shader.fragmentShader.replace("#include <color_fragment>", `
      #include <color_fragment>
      vec3 rp = vRockWorld;
      float coarse = rockNoise(rp * 0.065);
      float grain = rockNoise(rp * 0.65) * 0.5 + rockNoise(rp * 2.7) * 0.25;
      float layers = sin(rp.y * 1.1 + rockNoise(rp * 0.12) * 4.0) * 0.055;
      float cracks = smoothstep(0.43,0.49,rockNoise(vec3(rp.x * 0.28,rp.y * 0.045,rp.z * 0.28)));
      diffuseColor.rgb *= (0.60 + coarse * 0.52 + grain * 0.50 + layers) * mix(0.77,1.0,cracks);
    `);
  }, material.customProgramCacheKey = () => "world-rock-grain-v1", material;
}
export {
  rockMaterial
};
