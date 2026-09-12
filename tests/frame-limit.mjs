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

for (const fps of [30, 20, 15, 12, 10]) {
  let seconds = 0, dropped = 0, sampled = false;
  const loop = createLoop({ frameLimit: 0, onInput: () => { sampled = true; }, onFrame: () => { sampled = false; }, onStep: dt => { assert(sampled); seconds += dt; }, stepping: () => true, perf: { sample() {}, drop(dt) { dropped += dt; } } });
  loop.start();
  for (let tick = 0; tick <= fps * 10; tick++) callback(tick * 1000 / fps);
  loop.stop();
  assert(Math.abs(seconds - 10) < 0.01, `${fps} FPS must preserve elapsed driving time`);
  assert(dropped < 0.01);
}
let elapsed = 0, lost = 0, paused = false;
const stalled = createLoop({ frameLimit: 0, onFrame() {}, onStep: dt => { elapsed += dt; }, stepping: () => true, paused: () => paused, perf: { sample() {}, drop(dt) { lost += dt; } } });
stalled.start(); callback(0); callback(2000);
assert(elapsed <= 0.101 && lost >= 1.899);
paused = true; callback(4000); paused = false; callback(6000);
assert(elapsed <= 0.101);
stalled.stop();
console.log('PASS 10-30 FPS real-time simulation, input before movement, bounded stalls, and paused clock');
