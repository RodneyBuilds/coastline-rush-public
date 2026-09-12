const SLOW_MS = 40, CONTRACT_FRAME_MS = 33, KEEP_WORST = 25;
function createPerf(opts = {}) {
  const context = opts.context || (() => ({})), perf = { worst: [], dropped: 0, frames: 0, slow: 0, overContract: 0, t0: performance.now(), sample(ms) {
    perf.frames++, ms > 33 && perf.overContract++, !(ms < 40) && (perf.slow++, perf.worst.push({ at: +((performance.now() - perf.t0) / 1e3).toFixed(1), ms: +ms.toFixed(0), ...context(), droppedSoFar: +perf.dropped.toFixed(2) }), perf.worst.sort((a, b) => b.ms - a.ms), perf.worst.length > 25 && (perf.worst.length = 25));
  }, drop(seconds) {
    perf.dropped += seconds;
  }, reset() {
    perf.worst.length = 0, perf.dropped = 0, perf.frames = 0, perf.slow = 0, perf.overContract = 0, perf.t0 = performance.now();
  }, stats() {
    const seconds = (performance.now() - perf.t0) / 1e3;
    return { frames: perf.frames, seconds: +seconds.toFixed(1), fps: seconds > 0 ? +(perf.frames / seconds).toFixed(0) : 0, slow: perf.slow, overContract: perf.overContract, dropped: +perf.dropped.toFixed(2), worst: perf.worst.slice() };
  }, report() {
    const s = perf.stats();
    return console.log(`[clr perf] ${s.frames} frames in ${s.seconds}s = ${s.fps} fps avg`), console.log(`[clr perf] ${s.slow} frames over 40ms, ${s.overContract} over the 33ms contract, ${s.dropped}s of simulation dropped`), console.table ? console.table(s.worst) : console.log(s.worst), s.worst;
  } };
  return perf;
}
function heapMB() {
  const m = performance.memory;
  return !m || !Number.isFinite(m.usedJSHeapSize) ? null : +(m.usedJSHeapSize / (1024 * 1024)).toFixed(2);
}
export {
  CONTRACT_FRAME_MS,
  createPerf,
  heapMB
};
