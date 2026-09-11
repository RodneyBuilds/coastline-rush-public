const COPY = { attract: { title: "COASTLINE RUSH", titleWords: ["COASTLINE", "RUSH"], tagline: "Drift the coast. Race the clock.", subline: "RHODE ISLAND TO NEW YORK \xB7 6 STAGES \xB7 EVERY FORK IS A NEW ROAD", start: "PRESS ENTER OR (A) TO START", routeMapTitle: "THE ROUTE", routeMapCaption: "Every route ends at The Battery, with the harbour behind the line." }, select: { panelTitle: "CHOOSE YOUR RIDE / \u25C0 \u25B6 \xB7 EASY MODE: E / (Y) \xB7 GO: ENTER / (A)", go: "LET\u2019S DRIVE  \u2192", goHint: "GO: ENTER / (A)", musicTitle: "THE SOUNDTRACK", creditsLabel: "NOW PLAYING", controls: "Drive: \u2191 or W or RT \xB7 Steer: \u2190 \u2192 or stick or d-pad \xB7 Drift: turn in, tap the brake (\u2193 or S or space or B or LT), then hold the angle with the wheel \xB7 Counter-steer to swing it the other way through an S" }, hud: { speedUnit: "MPH", drift: "DRIFT" }, signage: { routeWarning: "CHOOSE YOUR ROUTE", checkpoint: "CHECKPOINT", finish: "FINISH: NEW YORK, NEXT EXIT", nextExit: "NEXT EXIT", regions: { "rhode-island": "RHODE ISLAND", connecticut: "CONNECTICUT", "new-york": "NEW YORK" } }, results: { finished: "FINISH! NEW YORK AHEAD", timeout: "TIME! WHAT A RUN", labelDistance: "DISTANCE", labelBest: "FAMILY BEST", labelRoute: "ROUTE", labelCar: "CAR", newBest: "NEW BEST", again: "PRESS ENTER OR (A) TO GO AGAIN", noRoute: "-" }, micro: { padConnected: "Controller connected. Ready when you are", padDisconnected: "Controller disconnected. Keyboard still works", wrongDevice: "Coastline Rush is built for a desktop browser. Use a keyboard or controller." }, newInBuild: { easyModeOn: "EASY MODE ON", easyModeOff: "EASY MODE OFF", easyModeWhat: "Holds the throttle for you and helps the car find the road.", stageFailedTitle: "THAT ROAD IS CLOSED", stageFailedBody: "One of the roads could not be loaded. Press Enter to pick a car and try another route.", downloadLog: "Save error log" } }, TRACK_CREDITS = [{ id: 0, title: "PURE RACEWAY", credit: "Synth racing \xB7 MintoDog \xB7 CC0" }, { id: 1, title: "BLACK DIAMOND", credit: "Drum & bass \xB7 Joth \xB7 CC0" }, { id: 2, title: "HOT ROADWAY", credit: "Techno \xB7 MintoDog \xB7 CC0" }];
function destinationSign(nextRegion, fromRegion, nextName) {
  const place = nextRegion !== fromRegion ? COPY.signage.regions[nextRegion] : nextName;
  return place ? `${place} ${COPY.signage.nextExit}` : COPY.signage.finish;
}
function allStrings() {
  const out = [], walk = (v) => {
    typeof v == "string" ? out.push(v) : Array.isArray(v) ? v.forEach(walk) : v && typeof v == "object" && Object.values(v).forEach(walk);
  };
  walk(COPY), TRACK_CREDITS.forEach((t) => {
    out.push(t.title), out.push(t.credit);
  });
  for (const region of Object.keys(COPY.signage.regions)) out.push(destinationSign(region, "(elsewhere)", ""));
  return out;
}
const DENYLIST = ["seamless", "cutting-edge", "next-level", "robust", "leverage", "unlock", "empower", "elevate", "failed", "game over", "you lose", "try again", "wrong", "slip angle", "drift chain", "checkpoint bonus", "boost multiplier", "frame rate", "quality level"];
function auditCopy() {
  return auditStrings(allStrings());
}
function auditStrings(strings) {
  const problems = [];
  for (const s of strings) {
    s.includes("\u2014") && problems.push(`em dash in a rendered string: "${s}"`), /\s–\s/.test(s) && problems.push(`en dash used as a dash in a rendered string: "${s}"`);
    const lower = s.toLowerCase();
    for (const word of DENYLIST) lower.includes(word) && problems.push(`denylisted word "${word}" in a rendered string: "${s}"`);
  }
  return problems;
}
export {
  COPY,
  DENYLIST,
  TRACK_CREDITS,
  allStrings,
  auditCopy,
  auditStrings,
  destinationSign
};
