import * as THREE from "three";
function tyreSlip(speed, drifting, brake, held = 0) {
  if (speed < 5) return 0;
  const braking = brake * THREE.MathUtils.clamp((held - 0.1) * 5, 0, 1);
  return THREE.MathUtils.clamp(Math.max(drifting ? 0.7 : 0, braking) * speed / 22, 0, 1);
}
class TyreSmoke {
  constructor(scene) {
    this.count = 240, this.cursor = 0, this.carry = 0, this.emitted = 0, this.life = new Float32Array(this.count), this.velocity = new Float32Array(this.count * 3), this.positions = new Float32Array(this.count * 3), this.sizes = new Float32Array(this.count), this.alpha = new Float32Array(this.count);
    const g = this.geometry = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage)), g.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage)), g.setAttribute("opacity", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage)), this.material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { pixelScale: { value: 600 } }, vertexShader: `attribute float size; attribute float opacity; varying float a;
        uniform float pixelScale;
        void main(){vec4 p=modelViewMatrix*vec4(position,1.);a=opacity;
          gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*pixelScale/max(1.,-p.z),0.,180.);}`, fragmentShader: `varying float a;
        void main(){vec2 uv=gl_PointCoord-.5; float r=length(uv)*2.;
          float cloud=exp(-r*r*4.)*(1.-smoothstep(.55,1.,r));
          gl_FragColor=vec4(vec3(.72,.76,.78),a*cloud);}` }), this.mesh = new THREE.Points(g, this.material), this.mesh.frustumCulled = false, this.mesh.userData.noAO = true, scene.add(this.mesh);
  }
  clear() {
    this.life.fill(0), this.alpha.fill(0), this.carry = 0, this.geometry.attributes.opacity.needsUpdate = true;
  }
  update(dt, P, input, height = 720) {
    this.material.uniforms.pixelScale.value = height * 0.9;
    const intensity = tyreSlip(P.speed, P.drifting, input.brake, input.brakeHeld);
    for (this.carry += dt * intensity * 65; this.carry >= 1; ) {
      this.carry--;
      for (const side of [-1, 1]) {
        const i = this.cursor++ % this.count, k = i * 3, yaw = P.heading;
        this.life[i] = 1.4, this.sizes[i] = 0.55, this.positions[k] = P.pos.x - Math.sin(yaw) * 1.45 + Math.cos(yaw) * side * 0.78, this.positions[k + 1] = P.pos.y + 0.14, this.positions[k + 2] = P.pos.z - Math.cos(yaw) * 1.45 - Math.sin(yaw) * side * 0.78, this.velocity[k] = Math.sin(yaw) * P.speed * 0.06 + (Math.random() - 0.5) * 0.6, this.velocity[k + 1] = 0.5 + Math.random() * 0.4, this.velocity[k + 2] = Math.cos(yaw) * P.speed * 0.06 + (Math.random() - 0.5) * 0.6, this.emitted++;
      }
    }
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const k = i * 3;
      for (let j = 0; j < 3; j++) this.positions[k + j] += this.velocity[k + j] * dt;
      this.sizes[i] += dt * 2.1, this.alpha[i] = Math.max(0, this.life[i] / 1.4) * 0.46;
    }
    for (const a of Object.values(this.geometry.attributes)) a.needsUpdate = true;
  }
}
export {
  TyreSmoke,
  tyreSlip
};
