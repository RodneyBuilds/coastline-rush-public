import "./playerSettings.css";
import { DEFAULT_PREFERENCES, getPreferences, setPreferences, onPreferencesChange } from "../core/playerPreferences.js";
import { onAnnouncement } from "../audio/announcer.js";
import { clearKeys } from "../core/input.js";
function installPlayerSettings() {
  if (document.getElementById("player-settings-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "player-settings-dialog", dialog.setAttribute("aria-labelledby", "player-settings-title"), dialog.innerHTML = `<form method="dialog">
    <header><div><small>MAKE IT YOUR DRIVE</small><h2 id="player-settings-title">Sound & controls</h2></div><button class="settings-close" aria-label="Close settings">Close</button></header>
    <fieldset><legend>Audio balance</legend><p>Levels adjust the current mix. Your choices save on this browser.</p>
      ${[["music", "Music"], ["engine", "Engine"], ["effects", "Tyres & effects"], ["announcer", "Announcer"]].map(([key, label]) => `<label class="settings-range">${label}<output data-value="${key}"></output><input aria-label="${label} volume" name="${key}" type="range" min="0" max="100" step="5"></label>`).join("")}
      <label class="settings-toggle"><input type="checkbox" name="muted">Mute all sound</label>
      <label class="settings-toggle"><input type="checkbox" name="captions">Show announcer captions</label>
    </fieldset>
    <fieldset><legend>Controller steering</legend><p>Keyboard and D-pad handling stay the same.</p>
      <label class="settings-range">Sensitivity<output data-value="sensitivity"></output><input aria-label="Controller sensitivity" name="sensitivity" type="range" min="50" max="150" step="5"></label>
      <p class="settings-help">Lower feels gentler. Higher responds sooner. Full stick still gives full steering.</p>
      <label class="settings-range">Stick dead zone<output data-value="deadzone"></output><input aria-label="Controller dead zone" name="deadzone" type="range" min="5" max="30" step="1"></label>
      <p class="settings-help">Increase if the car steers when the stick is at rest.</p>
    </fieldset>
    <footer><button type="button" id="settings-reset">Restore defaults</button><button class="settings-done">Done</button></footer>
  </form>`, document.body.append(dialog);
  const refresh = () => {
    const prefs = getPreferences();
    for (const control of dialog.querySelectorAll("input")) control.type === "checkbox" ? control.checked = prefs[control.name] : (control.value = Math.round(prefs[control.name] * 100), dialog.querySelector(`[data-value="${control.name}"]`).value = control.name === "sensitivity" ? `${prefs[control.name].toFixed(2)}\xD7` : `${control.value}%`);
  };
  dialog.addEventListener("input", (event) => {
    const control = event.target;
    control.tagName === "INPUT" && setPreferences({ [control.name]: control.type === "checkbox" ? control.checked : Number(control.value) / 100 });
  }), dialog.querySelector("#settings-reset").onclick = () => setPreferences(DEFAULT_PREFERENCES), dialog.addEventListener("keydown", (event) => event.stopPropagation()), dialog.addEventListener("close", clearKeys);
  for (const parent of [document.querySelector("#select .easy-row"), document.querySelector("#pause-panel>div")]) {
    if (!parent) continue;
    const button = document.createElement("button");
    button.className = "player-settings-button", button.type = "button", button.textContent = "Sound & controls", button.onclick = () => {
      clearKeys(), refresh(), dialog.showModal();
    }, parent.append(button);
  }
  const caption = document.createElement("div");
  caption.id = "announcer-caption", caption.setAttribute("role", "status"), caption.setAttribute("aria-live", "polite"), caption.hidden = true, document.body.append(caption);
  let timer;
  onAnnouncement(({ text, seconds }) => {
    clearTimeout(timer), getPreferences().captions && (caption.textContent = text, caption.hidden = false, timer = setTimeout(() => {
      caption.hidden = true, caption.textContent = "";
    }, seconds * 1e3));
  }), onPreferencesChange(() => {
    refresh(), getPreferences().captions || (caption.hidden = true, caption.textContent = "");
  }), refresh();
}
export {
  installPlayerSettings
};
