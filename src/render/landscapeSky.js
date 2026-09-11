import * as THREE from "three";
class LandscapeSky extends THREE.Mesh {
  isLandscapeSky = true;
  constructor() {
    super(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { sunPosition: { value: new THREE.Vector3(0, 1, 0) }, turbidity: { value: 3 }, rayleigh: { value: 1.6 }, mieCoefficient: { value: 45e-4 }, mieDirectionalG: { value: 0.86 } }, vertexShader: `
        varying vec3 skyDirection;
        void main() {
          skyDirection = position;
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`, fragmentShader: `
        uniform vec3 sunPosition;
        uniform float mieCoefficient;
        varying vec3 skyDirection;
        void main() {
          vec3 dir = normalize(skyDirection);
          vec3 sun = normalize(sunPosition);
          float daylight = smoothstep(0.015, 0.42, sun.y);
          float height = pow(max(dir.y, 0.0), 0.46);
          vec3 horizon = mix(vec3(0.70, 0.31, 0.13), vec3(0.50, 0.68, 0.79), daylight);
          vec3 zenith = mix(vec3(0.07, 0.13, 0.27), vec3(0.035, 0.19, 0.49), daylight);
          vec3 colour = mix(horizon, zenith, height);
          float facing = max(0.0, dot(dir, sun));
          float glow = pow(facing, 22.0) * (0.06 + mieCoefficient * 9.0);
          colour += mix(vec3(1.0, 0.44, 0.12), vec3(1.0, 0.9, 0.68), daylight) * glow;
          float disk = smoothstep(0.99980, 0.99994, facing);
          colour += vec3(8.0, 6.8, 4.8) * disk;
          gl_FragColor = vec4(colour, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` })), this.frustumCulled = false;
  }
}
export {
  LandscapeSky
};
