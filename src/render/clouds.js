import * as THREE from "three";
const CLOUD_TOKENS = Object.freeze({ DOME: 5200, HEIGHT: 900, SCALE: 1500, COVER: 0.6, EDGE: 0.17, OPACITY: 0.64, DRIFT: [7.5, 3.1], HORIZON_FADE: 0.055 }), VERT = `
varying vec3 vDir;
void main() {


  vDir = normalize( position );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

  gl_Position.z = gl_Position.w;
}
`, FRAG = `
varying vec3 vDir;
uniform vec3 uLit;
uniform vec3 uShade;
uniform float uHeight;
uniform float uScale;
uniform float uCover;
uniform float uEdge;
uniform float uOpacity;
uniform float uHorizonFade;
uniform vec2 uDrift;
uniform float uTime;
uniform sampler2D uNoise;











void main() {
  float up = vDir.y;



  float horizon = smoothstep( 0.0, uHorizonFade, up );
  if ( horizon <= 0.0 ) discard;



  vec2 hit = vDir.xz * ( uHeight / max( up, 0.0001 ) );
  vec2 p = hit / uScale + uDrift * uTime / uScale;

  float n = texture2D( uNoise, p ).r;



  float broad = texture2D( uNoise, p * 0.31 + 0.137 ).r;
  float density = n * 0.72 + broad * 0.46;

  float cloud = smoothstep( uCover, uCover + uEdge, density );
  if ( cloud <= 0.001 ) discard;



  vec3 col = mix( uShade, uLit, smoothstep( 0.30, 0.95, density ) );



  float far = mix( 0.45, 1.0, smoothstep( 0.0, 0.42, up ) );

  gl_FragColor = vec4( col, cloud * uOpacity * horizon * far );
}
`;
function bakeCloudNoise(size = 256) {
  const hash = (x, y, period) => {
    const xi = (x % period + period) % period, yi = (y % period + period) % period;
    let h = Math.imul(xi | 0, 2654435761) ^ Math.imul(yi | 0, 2246822507);
    return h = Math.imul(h ^ h >>> 15, 739982445), h ^= h >>> 12, (h >>> 8 & 65535) / 65535;
  }, smooth = (t) => t * t * (3 - 2 * t), octave = (u, v, period) => {
    const x = u * period, y = v * period, x0 = Math.floor(x), y0 = Math.floor(y), fx = smooth(x - x0), fy = smooth(y - y0), a = hash(x0, y0, period), b = hash(x0 + 1, y0, period), c = hash(x0, y0 + 1, period), d = hash(x0 + 1, y0 + 1, period);
    return a + (b - a) * fx + (c + (d - c) * fx - (a + (b - a) * fx)) * fy;
  }, data = new Uint8Array(size * size);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = i / size, v = j / size;
    let value = 0, amp = 0.5, period = 4;
    for (let o = 0; o < 5; o++) value += amp * octave(u, v, period), amp *= 0.5, period *= 2;
    data[j * size + i] = Math.max(0, Math.min(255, Math.round(value * 255)));
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  return tex.wrapS = THREE.RepeatWrapping, tex.wrapT = THREE.RepeatWrapping, tex.minFilter = THREE.LinearMipmapLinearFilter, tex.magFilter = THREE.LinearFilter, tex.generateMipmaps = true, tex.needsUpdate = true, tex;
}
class CloudLayer {
  constructor(scene) {
    const t = CLOUD_TOKENS;
    this.scene = scene, this.time = 0, this.noise = bakeCloudNoise(), this.uniforms = { uNoise: { value: this.noise }, uLit: { value: new THREE.Color(16774372) }, uShade: { value: new THREE.Color(10135220) }, uHeight: { value: t.HEIGHT }, uScale: { value: t.SCALE }, uCover: { value: t.COVER }, uEdge: { value: t.EDGE }, uOpacity: { value: t.OPACITY }, uHorizonFade: { value: t.HORIZON_FADE }, uDrift: { value: new THREE.Vector2(...t.DRIFT) }, uTime: { value: 0 } }, this.material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms, side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: true, fog: false }), this.mesh = new THREE.Mesh(new THREE.SphereGeometry(t.DOME, 24, 16), this.material), this.mesh.renderOrder = -2, this.mesh.frustumCulled = false, scene.add(this.mesh);
  }
  apply(litHex, shadeHex) {
    this.uniforms.uLit.value.setHex(litHex), this.uniforms.uShade.value.setHex(shadeHex);
  }
  update(dt, camera) {
    this.time += dt, this.uniforms.uTime.value = this.time, this.mesh.position.copy(camera.position);
  }
  dispose() {
    this.scene.remove(this.mesh), this.mesh.geometry.dispose(), this.material.dispose(), this.noise.dispose();
  }
}
export {
  CLOUD_TOKENS,
  CloudLayer
};
