import assert from 'node:assert/strict';
import { createLoop } from '../src/core/loop.js';
let callback;
globalThis.requestAnimationFrame = fn => { callback = fn; return 1; };
globalThis.cancelAnimationFrame = () => {};
const results = [];
for (const limit of [30, 60, 120]) {
  let frames = 0, seconds = 0;
  const loop = createLoop({ frameLimit: limit, onFrame: () => frames++, onStep: dt => seconds += dt, stepping: () => true, paused: () => false });
  assert.equal(loop.getFrameLimit(), limit);
  loop.start();
  for (let tick = 0; tick <= 240; tick++) callback(tick * 1000 / 120);
  assert(Math.abs(frames - (limit * 2 + 1)) <= 1);
  assert(Math.abs(seconds - 2) < 0.02);
  loop.setFrameLimit(30);
  assert.equal(loop.getFrameLimit(), 30);
  loop.stop();
  results.push({ limit, frames, seconds });
}
console.log('PASS frame limits preserve simulation speed', results);
