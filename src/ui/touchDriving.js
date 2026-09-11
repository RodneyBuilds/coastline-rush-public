import { input, clearKeys } from "../core/input.js";
import { touchDevice } from "../core/device.js";
import "./touchDriving.css";
import { installMobileGarage } from "./mobileGarage.js";

function installTouchDriving({ game, pause }) {
  if (!touchDevice) return { update() {} };
  document.body.classList.add("touch-device");
  document.getElementById("device-notice").textContent = "Rotate your phone to landscape to drive.";
  document.getElementById("btn-start").textContent = "Tap to start";
  document.querySelector(".demo-footer span:last-child").textContent = "TOUCH CONTROLS";
  document.querySelector("#select .go-row .hint").textContent = "Auto acceleration. Slide your left thumb to steer. Hold the lower-right area to brake or drift.";
  document.getElementById("btn-demo").textContent = "Back to demo";
  document.getElementById("btn-again").textContent = "Back to garage";
  document.querySelector("#select .panel-title").textContent = "Choose your ride";
  installMobileGarage();
  const root = document.createElement("div");
  root.id = "touch-driving";
  root.hidden = true;
  root.innerHTML = '<div id="touch-steer" aria-label="Slide to steer"><span class="touch-hint">SLIDE TO STEER</span><div class="touch-stick" hidden><span></span></div></div><div id="touch-brake" aria-label="Hold to brake or drift"><span class="touch-hint">HOLD TO BRAKE / DRIFT</span></div>';
  document.body.append(root);
  const steering = root.querySelector("#touch-steer");
  const brake = root.querySelector("#touch-brake");
  const stick = root.querySelector(".touch-stick");
  const knob = stick.firstElementChild;
  let steeringPointer = null;
  let anchorX = 0;
  const brakingPointers = new Set();
  const reset = () => {
    steeringPointer = null;
    brakingPointers.clear();
    input.touchSteer = 0;
    input.touchBrake = 0;
    stick.hidden = true;
    steering.classList.remove("held");
    brake.classList.remove("held");
  };
  steering.onpointerdown = event => {
    event.preventDefault();
    if (root.hidden || steeringPointer !== null) return;
    steeringPointer = event.pointerId;
    anchorX = event.clientX;
    input.touchSteer = 0;
    steering.setPointerCapture(event.pointerId);
    stick.style.left = `${event.clientX}px`;
    stick.style.top = `${event.clientY}px`;
    knob.style.transform = "translateX(0px)";
    stick.hidden = false;
    steering.classList.add("held");
  };
  steering.onpointermove = event => {
    if (event.pointerId !== steeringPointer) return;
    const displacement = Math.max(-64, Math.min(64, event.clientX - anchorX));
    input.touchSteer = Math.sign(displacement) * Math.max(0, (Math.abs(displacement) - 6) / 58);
    knob.style.transform = `translateX(${displacement * 0.65}px)`;
  };
  const releaseSteering = event => {
    if (event.pointerId !== steeringPointer) return;
    steeringPointer = null;
    input.touchSteer = 0;
    stick.hidden = true;
    steering.classList.remove("held");
  };
  steering.onpointerup = releaseSteering;
  steering.onpointercancel = releaseSteering;
  steering.onlostpointercapture = releaseSteering;
  brake.onpointerdown = event => {
    event.preventDefault();
    if (root.hidden) return;
    brake.setPointerCapture(event.pointerId);
    brakingPointers.add(event.pointerId);
    input.touchBrake = 1;
    brake.classList.add("held");
  };
  const releaseBrake = event => {
    brakingPointers.delete(event.pointerId);
    input.touchBrake = brakingPointers.size ? 1 : 0;
    brake.classList.toggle("held", brakingPointers.size > 0);
  };
  brake.onpointerup = releaseBrake;
  brake.onpointercancel = releaseBrake;
  brake.onlostpointercapture = releaseBrake;
  const playSurface = target => game.state === "drive" && !game.paused && !document.querySelector("dialog[open]") && !target?.closest?.("#drive-controls, #pause-panel, dialog");
  const preventGesture = event => { if (playSurface(event.target) && event.cancelable) event.preventDefault(); };
  for (const type of ["touchstart", "touchmove", "touchend", "gesturestart", "gesturechange", "gestureend", "contextmenu", "selectstart", "dragstart"]) {
    document.addEventListener(type, preventGesture, { passive: false });
  }
  document.addEventListener("selectionchange", () => {
    if (game.state === "drive" && !game.paused && getSelection()?.rangeCount) getSelection().removeAllRanges();
  });
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
