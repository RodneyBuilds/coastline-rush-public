import { MPH_PER_UNIT } from "../physics/constants.js";
class Hud {
  constructor() {
    this.clock = document.getElementById("clock"), this.timeFill = document.getElementById("time-fill"), this.routeFill = document.getElementById("route-fill"), this.speed = document.getElementById("speed"), this.drift = document.getElementById("drift"), this.driftTier = document.getElementById("drift-tier"), this.flash = document.getElementById("flash"), this.callout = document.getElementById("fork-callout"), this.forkLeft = document.getElementById("fork-left"), this.forkRight = document.getElementById("fork-right"), this.startTime = 75, this.forkVisible = false, this._lastSpeed = -1, this._lastClock = -1, this._lastDrift = null;
  }
  setStage(stage) {
    this.startTime = stage.timeLimit, stage.fork ? (this.forkLeft.textContent = stage.fork.leftLabel, this.forkRight.textContent = stage.fork.rightLabel) : (this.forkLeft.textContent = "", this.forkRight.textContent = ""), this.setForkVisible(false), this._lastSpeed = -1, this._lastClock = -1, this._lastDrift = null;
  }
  update(P, timeLeft, progress, nearFork) {
    const mph = Math.round(P.speed * MPH_PER_UNIT);
    mph !== this._lastSpeed && (this.speed.textContent = String(mph), this._lastSpeed = mph);
    const secs = Math.max(0, Math.ceil(timeLeft));
    this.clock.classList.toggle("free-drive", !!this.freeDrive), secs !== this._lastClock && (this.clock.textContent = this.freeDrive ? "CRUISE" : String(secs), this._lastClock = secs);
    const frac = Math.max(0, Math.min(1, timeLeft / this.startTime));
    this.timeFill.style.transform = `scaleX(${this.freeDrive ? 1 : frac})`, this.timeFill.classList.toggle("low", !this.freeDrive && timeLeft < 10), this.routeFill.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
    const lit = P.drifting || P.recovering;
    lit !== this._lastDrift && (this.drift.classList.toggle("on", lit), this._lastDrift = lit), this.setForkVisible(nearFork);
  }
  setForkVisible(visible) {
    visible !== this.forkVisible && (this.forkVisible = visible, this.callout.classList.toggle("show", visible));
  }
  _pop(el, text, cls) {
    el.textContent = text, el.classList.remove(cls), el.offsetWidth, el.classList.add(cls);
  }
  checkpoint(bonus) {
    this._pop(this.flash, this.freeDrive ? "CHECKPOINT" : `CHECKPOINT +${Math.round(bonus)}s`, "pop");
  }
  forkChosen(label) {
    this._pop(this.flash, label, "pop");
  }
  driftReward(tier, chain) {
    const stars = "\u2605".repeat(Math.max(1, Math.min(3, tier))), text = chain > 0 ? `${stars} ${chain + 1} LINKED` : stars;
    this._pop(this.driftTier, text, "pop");
  }
  chain(chain) {
    this._pop(this.driftTier, `${chain + 1} LINKED`, "pop");
  }
}
export {
  Hud
};
