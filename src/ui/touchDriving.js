import { input, clearKeys } from "../core/input.js";
import { touchDevice } from "../core/device.js";
import "./touchDriving.css";

function installTouchDriving({ game, pause }) {
  if (!touchDevice) return { update() {} };
  document.body.classList.add("touch-device");
  document.getElementById("device-notice").textContent = "Rotate your phone to landscape to drive.";
  document.getElementById("btn-start").textContent = "Tap to start";
  document.querySelector(".demo-footer span:last-child").textContent = "TOUCH CONTROLS";
  document.querySelector("#select .go-row .hint").textContent = "Auto acceleration. Hold arrows to steer. Brake while steering to drift.";
  document.getElementById("btn-demo").textContent = "Back to demo";
  document.getElementById("btn-again").textContent = "Back to garage";
  document.querySelector("#select .panel-title").textContent = "Choose your ride";
  const root = document.createElement("div");
  root.id = "touch-driving";
  root.hidden = true;
  root.innerHTML = '<div class="touch-steering"><button type="button" data-steer="-1" aria-label="Steer left">◀</button><button type="button" data-steer="1" aria-label="Steer right">▶</button></div><button type="button" id="touch-brake">BRAKE / DRIFT</button>';
  document.body.append(root);
  const held = new Map();
  const reset = () => {
    held.clear();
    input.touchSteer = 0;
    input.touchBrake = 0;
    root.querySelectorAll("button").forEach(button => button.classList.remove("held"));
  };
  const sync = () => {
    input.touchSteer = Math.max(-1, Math.min(1, [...held.values()].reduce((sum, button) => sum + Number(button.dataset.steer || 0), 0)));
    input.touchBrake = [...held.values()].some(button => button.id === "touch-brake") ? 1 : 0;
    root.querySelectorAll("button").forEach(button => button.classList.toggle("held", [...held.values()].includes(button)));
  };
  for (const button of root.querySelectorAll("button")) {
    button.onpointerdown = event => {
      event.preventDefault();
      if (root.hidden) return;
      button.setPointerCapture(event.pointerId);
      held.set(event.pointerId, button);
      sync();
    };
    const release = event => { held.delete(event.pointerId); sync(); };
    button.onpointerup = release;
    button.onpointercancel = release;
    button.onlostpointercapture = release;
    button.oncontextmenu = event => event.preventDefault();
  }
  const interrupt = () => {
    reset();
    input.touchActive = false;
    clearKeys();
    if (game.state === "drive") pause();
  };
  addEventListener("blur", interrupt);
  document.addEventListener("visibilitychange", () => { if (document.hidden) interrupt(); });
  addEventListener("driving-pause-change", () => { reset(); input.touchActive = false; root.hidden = true; });
  addEventListener("resize", () => { if (innerHeight > innerWidth) interrupt(); });
  let active = false;
  return { update() {
    const portrait = innerHeight > innerWidth;
    if (portrait && game.state === "drive") interrupt();
    const next = game.state === "drive" && !game.paused && !document.hidden && !portrait && !document.querySelector("dialog[open]");
    if (next !== active) reset();
    active = next;
    input.touchActive = next;
    root.hidden = !next;
  } };
}
export { installTouchDriving };
