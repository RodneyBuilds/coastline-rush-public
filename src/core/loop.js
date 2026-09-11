import { FIXED_DT, MAX_STEPS_PER_FRAME, MAX_FRAME_DT } from "../physics/constants.js";
function createLoop({ onFrame, onStep, onInput, stepping, paused, perf, frameLimit = 60 }) {
  let acc = 0, last = null, running = false, handle = 0, limit = [0, 30, 60, 120].includes(frameLimit) ? frameLimit : 60, deadline = null;
  const frame = (now) => {
    if (!running) return;
    if (handle = requestAnimationFrame(frame), paused && paused()) {
      last = null, deadline = null, acc = 0;
      return;
    }
    const interval = limit ? 1e3 / limit : 0;
    if (interval && deadline !== null && now + 0.75 < deadline) return;
    interval ? deadline = deadline === null || now - deadline >= interval ? now + interval : deadline + interval : deadline = null, last === null && (last = now);
    const rawMs = Math.max(0, now - last), dt = Math.min(MAX_FRAME_DT, rawMs / 1e3);
    last = now;
    perf && perf.sample(rawMs);
    onInput && onInput(dt);
    if (stepping()) {
      perf && rawMs / 1e3 > dt && perf.drop(rawMs / 1e3 - dt);
      acc += dt;
      let steps = 0;
      for (; acc + 1e-9 >= FIXED_DT && steps < MAX_STEPS_PER_FRAME && stepping(); ) onStep(FIXED_DT), acc -= FIXED_DT, steps++;
      acc = Math.max(0, acc);
      if (acc >= FIXED_DT) {
        const discarded = acc - acc % FIXED_DT;
        perf && perf.drop(discarded);
        acc -= discarded;
      }
    } else acc = 0;
    onFrame(dt, rawMs / 1e3);
  };
  return { start() {
    running || (running = true, last = null, deadline = null, handle = requestAnimationFrame(frame));
  }, stop() {
    running = false, handle && cancelAnimationFrame(handle), handle = 0;
  }, reseed() {
    last = null, deadline = null, acc = 0;
  }, setFrameLimit(value) {
    limit = [0, 30, 60, 120].includes(value) ? value : 60, deadline = null;
  }, getFrameLimit() {
    return limit;
  }, stepOnce(n) {
    for (let i = 0; i < n; i++) onStep(FIXED_DT);
  } };
}
export {
  createLoop
};
