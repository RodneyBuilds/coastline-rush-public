import { COPY } from "./copy.js";
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "-";
  const tenths = Math.round(seconds * 10);
  return `${Math.floor(tenths / 600)}:${(Math.floor(tenths / 10) % 60).toString().padStart(2, "0")}.${tenths % 10}`;
}
class ResultsScreen {
  render({ finished, distance, time, best, isNewBest, routeName, carName, score = 0, bestSlide = 0, easyMode = false, freeDrive = false }) {
    const set = (id, text) => {
      document.getElementById(id).textContent = text;
    }, number = (n) => Math.max(0, Math.round(Number.isFinite(n) ? n : 0)).toLocaleString();
    set("result-title", finished ? "Coast conquered." : "A run to build on."), set("result-subtitle", finished ? "You made it to New York. Take in the finish." : "Time is up. Your next great drive starts in the garage."), set("new-best", isNewBest ? "NEW ROUTE RECORD" : ""), set("r-score", number(score)), set("r-slide", number(bestSlide) + " pts"), set("r-dist", number(distance) + " m"), set("r-time", formatTime(time)), set("best-time", freeDrive ? "Untimed drive" : best == null ? "No finish yet" : formatTime(best)), set("r-route", routeName || COPY.results.noRoute), set("r-car", carName || COPY.results.noRoute), set("r-mode", `${freeDrive ? "Free Drive" : "Arcade race"} \xB7 ${easyMode ? "Easy" : "Standard"}`), document.getElementById("best-cell").classList.toggle("is-new", !!isNewBest);
  }
}
export {
  ResultsScreen,
  formatTime
};
