import { ERROR_LOG_KEY as KEY, readJSON, writeJSON, removeKey } from "./storage.js";
const MAX_ENTRIES = 200, MAX_CHARS = 1024 * 1024, FLUSH_MS = 1e3;
let installed = false, seeded = false, flushTimer = 0;
const recent = [];
let lastKey = "", lastCount = 0, lastStamp = "";
function formatLine(stamp, severity, where, message, stackHead, count = 1) {
  const parts = [stamp, severity.toUpperCase(), where, message];
  stackHead && parts.push(stackHead);
  const line = parts.join(" | ");
  return count > 1 ? `${line} (x${count})` : line;
}
function seed() {
  if (seeded) return;
  seeded = true;
  const stored = readJSON(KEY, []);
  if (Array.isArray(stored)) for (const l of stored) typeof l == "string" && recent.push(l);
  trim();
}
function trim() {
  recent.length > MAX_ENTRIES && recent.splice(0, recent.length - MAX_ENTRIES);
  let chars = 0;
  for (const l of recent) chars += l.length + 3;
  for (; chars > MAX_CHARS && recent.length > 1; ) chars -= recent.shift().length + 3;
}
function flushLog() {
  flushTimer && (clearTimeout(flushTimer), flushTimer = 0), seeded && writeJSON(KEY, recent);
}
function scheduleFlush() {
  flushTimer || (flushTimer = setTimeout(() => {
    flushTimer = 0, flushLog();
  }, FLUSH_MS));
}
function logError(severity, where, message, cause) {
  seed();
  let stackHead;
  if (cause instanceof Error && typeof cause.stack == "string") {
    const second = cause.stack.split(`
`)[1];
    stackHead = second ? second.trim() : void 0;
  } else typeof cause == "string" && (stackHead = cause.split(`
`)[0]);
  const key = `${severity}|${where}|${message}|${stackHead || ""}`;
  if (key === lastKey && recent.length ? (lastCount++, recent[recent.length - 1] = formatLine(lastStamp, severity, where, message, stackHead, lastCount)) : (lastKey = key, lastCount = 1, lastStamp = ( new Date()).toISOString(), recent.push(formatLine(lastStamp, severity, where, message, stackHead)), trim()), scheduleFlush(), errorListener && String(severity).toLowerCase() === "error") try {
    errorListener();
  } catch {
  }
}
function installErrorLog() {
  if (installed) return () => {
  };
  installed = true, seed();
  const onError = (e) => {
    const where = e.filename ? `${e.filename}:${e.lineno || 0}` : "window";
    logError("error", where, e.message || String(e.error || "unknown error"), e.error);
  }, onRejection = (e) => {
    const reason = e.reason, message = reason instanceof Error ? reason.message : String(reason);
    logError("error", "promise", `unhandled rejection: ${message}`, reason);
  }, onGoing = () => {
    document.visibilityState === "hidden" && flushLog();
  }, onHide = () => flushLog();
  return addEventListener("error", onError), addEventListener("unhandledrejection", onRejection), document.addEventListener("visibilitychange", onGoing), addEventListener("pagehide", onHide), () => {
    removeEventListener("error", onError), removeEventListener("unhandledrejection", onRejection), document.removeEventListener("visibilitychange", onGoing), removeEventListener("pagehide", onHide), flushLog(), installed = false;
  };
}
function readLog() {
  return seed(), recent.slice();
}
function entryCount() {
  return seed(), recent.length;
}
function errorCount() {
  seed();
  let n = 0;
  for (const line of recent) line.split(" | ")[1] === "ERROR" && n++;
  return n;
}
let errorListener = null;
function setErrorListener(fn) {
  errorListener = fn;
}
function downloadLog() {
  const text = readLog().join(`
`) + `
`, blob = new Blob([text], { type: "text/plain" }), url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url, a.download = "errors.log", document.body.appendChild(a), a.click(), a.remove(), setTimeout(() => URL.revokeObjectURL(url), 0);
}
function clearLog() {
  seeded = true, recent.length = 0, lastKey = "", lastCount = 0, flushTimer && (clearTimeout(flushTimer), flushTimer = 0), removeKey(KEY);
}
export {
  clearLog,
  downloadLog,
  entryCount,
  errorCount,
  flushLog,
  installErrorLog,
  logError,
  readLog,
  setErrorListener
};
