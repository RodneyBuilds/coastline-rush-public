import assert from "node:assert/strict";
import { buildVehicle, PROPORTIONS } from "../src/render/vehicleBody.js";
import "three";
globalThis.document = { createElement: () => ({ getContext: () => ({ createRadialGradient: () => ({ addColorStop() {
} }), fillRect() {
} }) }) };
for (const id of ["toy", "crv", "gt"]) {
  const car = buildVehicle(id), p = PROPORTIONS[id];
  let draws = 0, triangles = 0;
  car.traverse((o) => {
    if (!o.isMesh) return;
    draws++;
    const a = o.geometry.attributes.position.array;
    assert.ok(Array.from(a).every(Number.isFinite), `${id} finite geometry`), triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  }), assert.ok(draws <= 20, `${id} ${draws} draw calls`), assert.ok(triangles < 3e4, `${id} triangle budget`);
  const body = car.getObjectByName("body");
  body.geometry.computeBoundingBox(), assert.ok(body.geometry.boundingBox.max.z - body.geometry.boundingBox.min.z <= p.length + 0.01, `${id} preserved body length`);
  for (const name of ["glass", "panel-trim", "hardware", "pillars-mirrors", "lamp-tail", "lamp-head"]) assert.ok(car.getObjectByName(name), `${id} ${name}`);
  const wheels = car.children.filter((o) => o.name.startsWith("wheel-"));
  assert.equal(wheels.length, 4), car.userData.turnWheels(2, 0.6);
  const first = wheels[0].children[0].rotation.x;
  car.userData.turnWheels(2, 0.6), assert.equal(wheels[0].children[0].rotation.x, first, "cumulative distance is idempotent"), assert.equal(wheels.filter((w) => w.rotation.y !== 0).length, 2, "front steering only"), car.userData.turnWheels(3, 0), assert.ok(wheels.every((w) => w.rotation.y === 0)), console.log(`${id}: ${draws} draw calls, ${triangles} triangles, geometry and wheel rig PASS`);
}
