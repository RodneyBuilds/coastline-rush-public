const TRANSITIONS = Object.freeze({ boot: ["attract"], attract: ["select"], select: ["drive", "attract"], drive: ["results", "paused"], paused: ["drive"], results: ["select"] }), PRESSES_TO_DRIVE = Object.freeze({ boot: 2, attract: 2, select: 1, drive: 0, paused: 0, results: 2 });
class StateMachine {
  constructor(hooks = {}) {
    this.state = "boot", this.previous = null, this.hooks = hooks;
  }
  can(next) {
    const allowed = TRANSITIONS[this.state];
    return !!allowed && allowed.includes(next);
  }
  go(next) {
    if (next === this.state) return false;
    if (!this.can(next)) return this.hooks.onReject && this.hooks.onReject(this.state, next), false;
    const from = this.state;
    return this.hooks.onExit && this.hooks.onExit(from, next), this.previous = from, this.state = next, this.hooks.onEnter && this.hooks.onEnter(next, from), true;
  }
  is(s) {
    return this.state === s;
  }
  get driving() {
    return this.state === "drive";
  }
}
function checkStateTable() {
  const problems = [], states = Object.keys(TRANSITIONS);
  for (const s of states) {
    TRANSITIONS[s].length || problems.push(`state "${s}" is a dead end: it exits to nothing`);
    for (const t of TRANSITIONS[s]) states.includes(t) || problems.push(`state "${s}" exits to "${t}", which is not a state`);
  }
  const reachable =  new Set(["boot"]);
  let grew = true;
  for (; grew; ) {
    grew = false;
    for (const s of [...reachable]) for (const t of TRANSITIONS[s]) reachable.has(t) || (reachable.add(t), grew = true);
  }
  for (const s of states) reachable.has(s) || problems.push(`state "${s}" is unreachable from boot`);
  for (const s of states) PRESSES_TO_DRIVE[s] === void 0 ? problems.push(`state "${s}" has no press count`) : PRESSES_TO_DRIVE[s] > 2 && problems.push(`state "${s}" is ${PRESSES_TO_DRIVE[s]} presses from driving, and the brief caps it at 2`);
  return problems;
}
export {
  PRESSES_TO_DRIVE,
  StateMachine,
  TRANSITIONS,
  checkStateTable
};
