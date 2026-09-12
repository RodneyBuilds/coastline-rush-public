import { DEADZONE, RAMP_ATTACK, RAMP_RELEASE, RAMP_THROTTLE, RAMP_BRAKE, BRAKE_TAP_GRACE, shapeSteer } from "../physics/constants.js";
import { controllerSteer, getPreferences } from "./playerPreferences.js";
const PAD_STALE_SECONDS = 1.5, input = { steer: 0, steerRaw: 0, steerTarget: 0, analog: false, throttle: 0, brake: 0, brakeEdge: false, brakeHeld: 0, tapWindow: 0, confirm: false, back: false, confirmEdge: false, backEdge: false, leftEdge: false, rightEdge: false, upEdge: false, downEdge: false, easyEdge: false, padConnected: false, padName: "", _kb:  Object.create(null), _tapped:  new Map(), _rest:  Object.create(null), _restPad: "", _padStamp: -1, _padStale: 0, _rampSteer: 0, _rampThr: 0, _rampBrk: 0, _prevBrakeDown: false, _prevConfirm: false, _prevBack: false, _prevLeft: false, _prevRight: false, _prevUp: false, _prevDown: false, _prevEasy: false }, hooks = { toast: null, gesture: null };
function attachInput(opts = {}) {
  hooks.toast = opts.toast || null, hooks.gesture = opts.gesture || null;
  const onKeyDown = (e) => {
    if (!(/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName) || e.target?.closest?.("#player-settings-dialog, .player-settings-button, #driving-lesson, #learn-driving")) && !(e.key === "F8" || e.key === "F9") && (hooks.gesture && hooks.gesture(), ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key) && e.preventDefault(), input._kb[e.key.toLowerCase()] = true, input._kb[e.key] = true, !e.repeat)) {
      const k = e.key.toLowerCase();
      input._tapped.set(k, Math.min(4, (input._tapped.get(k) || 0) + 1));
    }
  }, onKeyUp = (e) => {
    input._kb[e.key.toLowerCase()] = false, input._kb[e.key] = false;
  }, onPointerDown = () => {
    hooks.gesture && hooks.gesture();
  }, noop = () => {
  };
  return addEventListener("keydown", onKeyDown), addEventListener("keyup", onKeyUp), addEventListener("pointerdown", onPointerDown), addEventListener("gamepadconnected", noop), addEventListener("gamepaddisconnected", noop), () => {
    removeEventListener("keydown", onKeyDown), removeEventListener("keyup", onKeyUp), removeEventListener("pointerdown", onPointerDown), removeEventListener("gamepadconnected", noop), removeEventListener("gamepaddisconnected", noop);
  };
}
function clearKeys() {
  input._kb =  Object.create(null), input._tapped.clear(), input._prevConfirm = false, input._prevBack = false, input._prevLeft = false, input._prevRight = false, input._prevUp = false, input._prevDown = false, input._prevEasy = false, input._prevBrakeDown = false;
}
function axis(pad, i) {
  const v = pad.axes && pad.axes.length > i ? pad.axes[i] : 0;
  return Number.isFinite(v) ? v : 0;
}
function pressed(pad, i) {
  return !!(pad.buttons && pad.buttons[i] && pad.buttons[i].pressed);
}
function value(pad, i) {
  const b = pad.buttons && pad.buttons[i], v = b ? b.value : 0;
  return Number.isFinite(v) ? v : 0;
}
function pollInput(dt) {
  if (globalThis.document?.querySelector("dialog[open]")) {
    clearKeys();
    for (const key of ["steer", "steerRaw", "steerTarget", "throttle", "brake", "_rampSteer", "_rampThr", "_rampBrk"]) input[key] = 0;
    for (const key of ["confirm", "back", "confirmEdge", "backEdge", "leftEdge", "rightEdge", "upEdge", "downEdge", "easyEdge", "brakeEdge"]) input[key] = false;
    return;
  }
  const kb = input._kb, tap = input._tapped, down = (...keys) => keys.some((k) => kb[k] || (tap.get(k) || 0) > 0), held = (...keys) => keys.some((k) => !!kb[k]);
  let dSteer = (down("arrowright", "d") ? 1 : 0) - (down("arrowleft", "a") ? 1 : 0), dThr = down("arrowup", "w") ? 1 : 0, dBrk = down("arrowdown", "s", " ") ? 1 : 0, aSteer = null, confirmNow = down("enter"), backNow = down("escape", "backspace"), leftNow = down("arrowleft", "a"), rightNow = down("arrowright", "d"), upNow = down("arrowup", "w"), downNow = down("arrowdown", "s"), heldConfirm = held("enter"), heldBack = held("escape", "backspace"), heldLeft = held("arrowleft", "a"), heldRight = held("arrowright", "d"), heldUp = held("arrowup", "w"), heldDown = held("arrowdown", "s"), easyNow = down("e"), heldEasy = held("e");
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let pad = null;
  for (const p of pads) if (p && p.connected) {
    pad = p;
    break;
  }
  if (pad && typeof pad.timestamp == "number" && (pad.timestamp !== input._padStamp ? (input._padStamp = pad.timestamp, input._padStale = 0) : (input._padStale += dt, input._padStale > PAD_STALE_SECONDS && (pad = null))), pad && !input.padConnected && (input.padConnected = true, input.padName = pad.id || "", hooks.toast && hooks.toast("connected")), !pad && input.padConnected && (input.padConnected = false, hooks.toast && hooks.toast("disconnected")), pad) {
    input._restPad !== (pad.id || "") + ":" + pad.index && (input._restPad = (pad.id || "") + ":" + pad.index, input._rest =  Object.create(null));
    const rest = input._rest, ax = axis(pad, 0), ay = axis(pad, 1);
    Math.abs(ax) <= DEADZONE && (rest.ax = true), Math.abs(ay) <= DEADZONE && (rest.ay = true);
    const menuAx = rest.ax ? ax : 0, menuAy = rest.ay ? ay : 0;
    !down("arrowleft", "a", "arrowright", "d") && Math.abs(ax) > getPreferences().deadzone && (aSteer = controllerSteer(ax));
    const armB = (i) => {
      const p = pressed(pad, i);
      return p || (rest["b" + i] = true), p && !!rest["b" + i];
    };
    armB(14) && (dSteer = -1), armB(15) && (dSteer = 1);
    const rt = rest.b7 || value(pad, 7) <= 0.05 ? value(pad, 7) : 0;
    value(pad, 7) <= 0.05 && (rest.b7 = true), (armB(0) || rt > 0.05) && (dThr = Math.max(dThr, armB(0) ? 1 : rt));
    const lt = rest.b6 || value(pad, 6) <= 0.05 ? value(pad, 6) : 0;
    value(pad, 6) <= 0.05 && (rest.b6 = true), (armB(1) || armB(2) || lt > 0.05) && (dBrk = Math.max(dBrk, 1));
    const pu = armB(12), pd = armB(13), pl = armB(14), pr = armB(15), padEasy = armB(3), padConfirm = armB(0) || armB(9), padBack = armB(1) || armB(8);
    heldConfirm = heldConfirm || padConfirm, heldBack = heldBack || padBack, heldLeft = heldLeft || pl || menuAx < -0.5, heldRight = heldRight || pr || menuAx > 0.5, heldUp = heldUp || pu || menuAy < -0.5, heldDown = heldDown || pd || menuAy > 0.5, heldEasy = heldEasy || padEasy, easyNow = easyNow || padEasy, confirmNow = confirmNow || padConfirm, backNow = backNow || padBack, leftNow = leftNow || pl || menuAx < -0.5, rightNow = rightNow || pr || menuAx > 0.5, upNow = upNow || pu || menuAy < -0.5, downNow = downNow || pd || menuAy > 0.5;
  }
  const target = dSteer, rate = Math.sign(target) !== Math.sign(input._rampSteer) || target === 0 ? RAMP_RELEASE : RAMP_ATTACK;
  input._rampSteer += (target - input._rampSteer) * Math.min(1, rate * dt), Math.abs(input._rampSteer) < 4e-3 && target === 0 && (input._rampSteer = 0), input.steerRaw = aSteer !== null ? aSteer : input._rampSteer, input.steer = shapeSteer(input.steerRaw), input.steerTarget = aSteer !== null ? aSteer : dSteer, input.analog = aSteer !== null, input._rampThr += (dThr - input._rampThr) * Math.min(1, RAMP_THROTTLE * dt), input._rampBrk += (dBrk - input._rampBrk) * Math.min(1, RAMP_BRAKE * dt), input.throttle = input._rampThr, input.brake = input._rampBrk;
  const brakeDown = dBrk > 0.5;
  input.brakeEdge = brakeDown && !input._prevBrakeDown, input.brakeHeld = brakeDown ? input.brakeHeld + dt : 0, input._prevBrakeDown = brakeDown, input.brakeEdge ? input.tapWindow = BRAKE_TAP_GRACE : input.tapWindow = Math.max(0, input.tapWindow - dt), input.confirm = confirmNow, input.back = backNow, input.confirmEdge = confirmNow && !input._prevConfirm, input.backEdge = backNow && !input._prevBack, input.leftEdge = leftNow && !input._prevLeft, input.rightEdge = rightNow && !input._prevRight, input.upEdge = upNow && !input._prevUp, input.downEdge = downNow && !input._prevDown, input.easyEdge = easyNow && !input._prevEasy, input._prevConfirm = heldConfirm, input._prevBack = heldBack, input._prevLeft = heldLeft, input._prevRight = heldRight, input._prevUp = heldUp, input._prevDown = heldDown, input._prevEasy = heldEasy;
  for (const [k, n] of tap) n > 1 ? tap.set(k, n - 1) : tap.delete(k);
  for (const k of ["steer", "steerRaw", "steerTarget", "throttle", "brake", "brakeHeld", "tapWindow"]) Number.isFinite(input[k]) || (input[k] = 0);
}
function anyKeyDown() {
  if (input._tapped.size) return true;
  for (const k in input._kb) if (input._kb[k]) return true;
  return false;
}
export {
  anyKeyDown,
  attachInput,
  clearKeys,
  input,
  pollInput
};
