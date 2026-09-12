import * as THREE from "three";
class FinishFestival {
  constructor(parent, roads) {
    this.root = new THREE.Group(), parent.add(this.root), this.time = 0, this.spots = [], this.parts = {};
    const curve = roads.legs.main, up = new THREE.Vector3(0, 1, 0);
    this.centre = curve.getPointAt(0.993);
    const skin = [1578e4, 12222552, 7818040, 14065784], shirts = [2603944, 15234391, 16108370, 4820691, 15658730, 10846677], make = (name, geometry, count, colour) => {
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.85 }), count);
      return mesh.castShadow = mesh.receiveShadow = true, this.parts[name] = mesh, this.root.add(mesh), mesh;
    }, n = 84;
    make("shirt", new THREE.CylinderGeometry(0.3, 0.23, 0.68, 12), n, 16777215), make("neck", new THREE.CylinderGeometry(0.085, 0.1, 0.2, 8), n, 16777215), make("waist", new THREE.SphereGeometry(0.24, 10, 8), n, 3425117), make("head", new THREE.SphereGeometry(0.235, 12, 9), n, 16777215), make("hair", new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.54), n, 3746597), make("arms", new THREE.CapsuleGeometry(0.085, 0.5, 4, 8), n * 2, 16777215), make("hands", new THREE.SphereGeometry(0.1, 8, 6), n * 2, 16777215), make("legs", new THREE.CapsuleGeometry(0.115, 0.48, 4, 8), n * 2, 3425117), make("shoes", new THREE.SphereGeometry(1, 8, 6), n * 2, 15986405), make("eyes", new THREE.SphereGeometry(0.023, 6, 5), n * 2, 2041392);
    for (let i = 0; i < n; i++) {
      const front = i >= 48, t = front ? 0.993 + Math.floor((i - 48) / 9) * 17e-4 : 0.974 + (i >> 1) * 65e-5, p = curve.getPointAt(t), tan = curve.getTangentAt(t), side2 = new THREE.Vector3().crossVectors(up, tan).normalize();
      p.addScaledVector(side2, front ? ((i - 48) % 9 - 4) * 1.35 : (i % 2 ? 1 : -1) * (roads.roadWidth * 0.5 + 2.7 + i % 3 * 0.5)), this.spots.push({ p, yaw: Math.atan2(tan.x, tan.z) + Math.PI, scale: 0.9 + i % 5 * 0.055 }), this.parts.shirt.setColorAt(i, new THREE.Color(shirts[i % 6])), this.parts.head.setColorAt(i, new THREE.Color(skin[i % 4])), this.parts.neck.setColorAt(i, new THREE.Color(skin[i % 4]));
      for (let j = 0; j < 2; j++) this.parts.arms.setColorAt(i * 2 + j, new THREE.Color(skin[i % 4])), this.parts.hands.setColorAt(i * 2 + j, new THREE.Color(skin[i % 4]));
    }
    const tiles = make("line", new THREE.BoxGeometry(roads.roadWidth / 12, 0.04, 1.5), 24, 16777215), centre = curve.getPointAt(0.975), tangent = curve.getTangentAt(0.975), side = new THREE.Vector3().crossVectors(up, tangent).normalize(), q = new THREE.Quaternion().setFromAxisAngle(up, Math.atan2(tangent.x, tangent.z)), m = new THREE.Matrix4();
    for (let i = 0; i < 24; i++) {
      const p = centre.clone().addScaledVector(side, (i % 12 - 5.5) * roads.roadWidth / 12).addScaledVector(tangent, i < 12 ? -0.75 : 0.75);
      p.y += 0.06, m.compose(p, q, new THREE.Vector3(1, 1, 1)), tiles.setMatrixAt(i, m), tiles.setColorAt(i, new THREE.Color((i % 12 + (i < 12 ? 0 : 1)) % 2 ? 16777215 : 1318958));
    }
    this.balloons = [];
    const balloonGeometry = new THREE.SphereGeometry(0.55, 12, 10), stringGeometry = new THREE.CylinderGeometry(0.012, 0.012, 2.5, 4);
    for (let i = 0; i < 18; i++) {
      const spot = this.spots[48 + i * 2], g = new THREE.Group();
      g.position.copy(spot.p);
      const balloon = new THREE.Mesh(balloonGeometry, new THREE.MeshStandardMaterial({ color: shirts[i % 6], roughness: 0.38 }));
      balloon.position.y = 4.1, balloon.scale.y = 1.25;
      const string = new THREE.Mesh(stringGeometry, new THREE.MeshStandardMaterial({ color: 15197400, roughness: 1 }));
      string.position.y = 2.65, g.add(balloon, string), this.root.add(g), this.balloons.push(g);
    }
    this.update(0);
  }
  update(dt, viewer) {
    if (viewer?.camera && this.centre.distanceTo(viewer.camera.position) > 400) return;
    this.time += dt;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), local = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), axis = new THREE.Vector3(0, 0, 1);
    this.spots.forEach((spot, i) => {
      const rotation = new THREE.Quaternion().setFromAxisAngle(up, spot.yaw), jump = Math.max(0, Math.sin(this.time * 3.5 + i)) * 0.13, put = (name, id, x, y, z, sx = 1, sy = 1, sz = 1, angle = 0) => {
        const p = new THREE.Vector3(x, y + jump, z).multiplyScalar(spot.scale).applyQuaternion(rotation).add(spot.p);
        q.copy(rotation).multiply(local.setFromAxisAngle(axis, angle)), m.compose(p, q, new THREE.Vector3(sx, sy, sz).multiplyScalar(spot.scale)), this.parts[name].setMatrixAt(id, m);
      };
      put("shirt", i, 0, 1.12, 0, 1, 1, 0.72), put("waist", i, 0, 0.76, 0, 1, 0.7, 0.75), put("neck", i, 0, 1.5, 0), put("head", i, 0, 1.76, 0, 0.9, 1.12, 0.95), put("hair", i, 0, 1.8, 0, 0.93, 1.05, 1);
      for (const side of [-1, 1]) {
        const id = i * 2 + (side > 0 ? 1 : 0), wave = 0.35 + Math.sin(this.time * 4 + i) * 0.35, ax = side * 0.25, ay = 1.37, bx = side * (0.53 + wave * 0.2), by = 1.88 + wave * 0.2;
        put("arms", id, (ax + bx) / 2, (ay + by) / 2, 0, 1, Math.hypot(bx - ax, by - ay) / 0.67, 1, -Math.atan2(bx - ax, by - ay)), put("hands", id, bx, by, 0), put("legs", id, side * 0.14, 0.38, 0), put("shoes", id, side * 0.14, 0.09, 0.085, 0.14, 0.09, 0.25), put("eyes", id, side * 0.073, 1.8, 0.213);
      }
    });
    for (const [name, mesh] of Object.entries(this.parts)) name !== "line" && (mesh.instanceMatrix.needsUpdate = true, mesh.computeBoundingSphere());
    this.balloons.forEach((g, i) => g.rotation.z = Math.sin(this.time * 1.3 + i) * 0.06);
  }
  dispose() {
    const mats =  new Set(), geos =  new Set();
    this.root.traverse((o) => {
      o.isMesh && (geos.add(o.geometry), mats.add(o.material), o.dispose?.());
    });
    for (const geo of geos) geo.dispose();
    for (const mat of mats) mat.dispose();
    this.root.removeFromParent();
  }
}
export {
  FinishFestival
};
