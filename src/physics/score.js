class DriftScore {
  constructor() {
    this.reset();
  }
  reset() {
    this.total = 0, this.slide = 0, this.seconds = 0, this.best = 0, this.multiplier = 1, this.active = false;
  }
  tick(dt, player) {
    if (player.drifting && player.speed > 5) this.active = true, this.seconds += dt, this.multiplier = Math.min(5, 1 + Math.floor(this.seconds / 2) + Math.max(0, player.chain || 0)), this.slide += Math.min(player.speed, 60) * dt * 10 * this.multiplier;
    else if (this.active && !player.recovering) {
      const banked = Math.round(this.slide);
      return this.total += banked, this.best = Math.max(this.best, banked), this.slide = 0, this.seconds = 0, this.multiplier = 1, this.active = false, banked;
    }
    return 0;
  }
}
export {
  DriftScore
};
