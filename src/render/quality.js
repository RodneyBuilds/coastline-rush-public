import * as THREE from "three";
const RATIOS = [1, 0.8, 0.62], STEP_DOWN_FPS = 52, STEP_UP_FPS = 59, DOWN_COOLDOWN = 1.5, UP_COOLDOWN = 30, SUSTAINED_HEADROOM = 20, FRAME_AVERAGE_SECONDS = 0.75, LOD_TIERS = Object.freeze({ hero: { cullAtFog: false }, mid: { cullAtFog: true }, far: { cullAtFog: true } });
class QualityGovernor {
  constructor({ renderer, bloomPass, aoPass, onLevel, targetFPS = () => 60 }) {
    this.targetFPS = targetFPS;
    this.renderer = renderer, this.bloomPass = bloomPass, this.aoPass = aoPass || null, this.onLevel = onLevel || null, this.level = 0, this.ema = 60, this.frameSeconds = 1 / 60, this.headroomSeconds = 0, this.overloadSeconds = 0, this.cooldown = 0, this.upgradeCooldown = UP_COOLDOWN, this.enabled = true, this.pinned = null;
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const target = Math.min(60, Math.max(30, this.targetFPS() || 60));
    const downFPS = STEP_DOWN_FPS * target / 60, upFPS = STEP_UP_FPS * target / 60;
    const elapsed = Math.min(dt, 0.25), weight = 1 - Math.exp(-elapsed / FRAME_AVERAGE_SECONDS);
    this.frameSeconds += (elapsed - this.frameSeconds) * weight, this.ema = 1 / this.frameSeconds, this.cooldown = Math.max(0, this.cooldown - elapsed), this.upgradeCooldown = Math.max(0, this.upgradeCooldown - elapsed), this.overloadSeconds = this.ema < downFPS ? this.overloadSeconds + elapsed : 0, this.headroomSeconds = this.ema > upFPS && elapsed <= 1 / upFPS ? this.headroomSeconds + elapsed : 0, !(!this.enabled || this.cooldown > 0) && (this.overloadSeconds >= 0.75 && this.level < RATIOS.length - 1 ? this._set(this.level + 1, DOWN_COOLDOWN) : this.upgradeCooldown === 0 && this.headroomSeconds >= SUSTAINED_HEADROOM && this.level > 0 && this._set(this.level - 1, UP_COOLDOWN));
  }
  _set(level, cooldown) {
    this.level = level, this.renderer.setPixelRatio(RATIOS[level]), this.bloomPass.enabled = level < 2, this.aoPass && (this.aoPass.enabled = level < 1), this.renderer.shadowMap.autoUpdate = level < 2, this.cooldown = Math.min(cooldown, DOWN_COOLDOWN), this.upgradeCooldown = UP_COOLDOWN, this.headroomSeconds = 0, this.overloadSeconds = 0, this.onLevel && this.onLevel(level);
  }
  pin(level) {
    this.enabled = false, this.pinned = THREE.MathUtils.clamp(level | 0, 0, RATIOS.length - 1), this._set(this.pinned, 0);
  }
  reset() {
    this.pinned !== null && this.level !== this.pinned && this._set(this.pinned, 0), this.ema = 60, this.frameSeconds = 1 / 60, this.headroomSeconds = 0, this.overloadSeconds = 0, this.cooldown = 0, this.upgradeCooldown = UP_COOLDOWN;
  }
}
function lodVisible(tier, distance, fogFar) {
  return (LOD_TIERS[tier] || LOD_TIERS.mid).cullAtFog ? distance <= (Number.isFinite(fogFar) && fogFar > 0 ? fogFar : FALLBACK_CULL) : true;
}
const FALLBACK_CULL = 3200;
function sceneryDensity(level) {
  return THREE.MathUtils.clamp(1 - 0.28 * level, 0.3, 1);
}
export {
  FALLBACK_CULL,
  LOD_TIERS,
  QualityGovernor,
  lodVisible,
  sceneryDensity
};
