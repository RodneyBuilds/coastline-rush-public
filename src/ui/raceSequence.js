import { context, sfxBus } from "../audio/engine.js";
import { announce } from "../audio/announcer.js";
function tone(frequency, duration = 0.18) {
  const ctx = context();
  if (!ctx) return;
  const oscillator = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime;
  oscillator.type = "sine", oscillator.frequency.value = frequency, gain.gain.setValueAtTime(0.18, now), gain.gain.exponentialRampToValueAtTime(1e-3, now + duration), oscillator.connect(gain), gain.connect(sfxBus()), oscillator.start(), oscillator.stop(now + duration), oscillator.onended = () => {
    oscillator.disconnect(), gain.disconnect();
  };
}
async function raceCountdown(game) {
  const element = document.createElement("div");
  element.id = "race-sequence", document.body.append(element);
  let elapsed = 0, last = performance.now(), shown = "";
  await new Promise((resolve) => {
    const tick = (now) => {
      game.paused || (elapsed += Math.min(0.1, (now - last) / 1e3)), last = now;
      const label = elapsed < 1 ? "3" : elapsed < 2 ? "2" : elapsed < 3 ? "1" : "GO!";
      if (label !== shown && (element.textContent = label, shown = label, announce({ 3: "three", 2: "two", 1: "one", "GO!": "go" }[label])), elapsed >= 3.35) {
        element.remove(), resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
async function raceCelebration({ game, player, curve, place, reducedMotion, cancelled = () => false }) {
  announce("finish");
  const element = document.createElement("div");
  element.id = "race-sequence", element.innerHTML = '<div style="text-align:center">FINISH!<p style="font:700 20px Arial;letter-spacing:.2em">EAST COAST COMPLETE</p></div>', element.className = "finish-banner", document.body.append(element);
  const confetti = document.createElement("canvas");
  confetti.id = "finish-confetti", document.body.append(confetti), confetti.width = innerWidth, confetti.height = innerHeight;
  const ctx = confetti.getContext("2d"), pieces = Array.from({ length: reducedMotion ? 0 : 130 }, (_, i) => ({ x: i * 0.618 % 1 * innerWidth, y: -(i * 71 % innerHeight), speed: 90 + i % 7 * 25, angle: i, color: ["#ddff7b", "#5ce8d2", "#fff", "#ff8c89"][i % 4] })), initial = player.s, speed = player.speed, length = curve.getLength(), travel = Math.max(0, Math.min(0.986 - initial, speed * 1.5 / length));
  let elapsed = 0, last = performance.now();
  [523, 659, 784, 1047].forEach((frequency, i) => setTimeout(() => tone(frequency, 0.5), i * 150)), await new Promise((resolve) => {
    const tick = (now) => {
      if (cancelled()) {
        element.remove(), confetti.remove(), resolve();
        return;
      }
      const dt = game.paused ? 0 : Math.min(0.1, (now - last) / 1e3);
      last = now, elapsed += dt;
      const t = Math.min(1, elapsed / 3);
      player.s = initial + travel * (2 * t - t * t), player.speed = speed * (1 - t), player.pos.copy(curve.getPointAt(player.s));
      const tangent = curve.getTangentAt(player.s);
      player.heading = player.velDir = Math.atan2(tangent.x, tangent.z), player.slip = 0, player.drifting = false, place(), ctx.clearRect(0, 0, confetti.width, confetti.height);
      for (const p of pieces) p.y += p.speed * dt, p.x += Math.sin(elapsed * 2 + p.angle) * 28 * dt, ctx.save(), ctx.translate(p.x, p.y), ctx.rotate(p.angle + elapsed * 2), ctx.fillStyle = p.color, ctx.fillRect(-4, -8, 8, 16), ctx.restore();
      if (elapsed >= 5) {
        element.remove(), confetti.remove(), resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
export {
  raceCelebration,
  raceCountdown
};
