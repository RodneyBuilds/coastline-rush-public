import { touchDevice } from "../core/device.js";
function installGraphicsSettings(quality) {
  let value = touchDevice ? "1" : "auto";
  try {
    value = localStorage.getItem(touchDevice ? "coastline.mobileGraphics.v2" : "coastline.graphics") || value;
  } catch {
  }
  ["auto", "0", "1", "2"].includes(value) || (value = "auto");
  const controls = [], apply = () => {
    value === "auto" ? (quality.pinned = null, quality.enabled = true, quality.reset()) : quality.pin(Number(value));
    for (const control of controls) control.value = value;
    try {
      localStorage.setItem(touchDevice ? "coastline.mobileGraphics.v2" : "coastline.graphics", value);
    } catch {
    }
  };
  for (const parent of [document.querySelector("#select .easy-row"), document.querySelector("#pause-panel>div")]) {
    if (!parent) continue;
    const label = document.createElement("label");
    label.className = "graphics-setting", label.textContent = "Graphics ";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Graphics quality"), select.innerHTML = '<option value="auto">Auto</option><option value="0">High</option><option value="1">Medium</option><option value="2">Low</option>', touchDevice && (select.options[1].textContent = 'High detail', select.options[2].textContent = 'Balanced', select.options[3].textContent = 'Battery saver'), label.append(select), parent.append(label), controls.push(select), select.onchange = () => {
      value = select.value, apply();
    };
  }
  apply();
}
export {
  installGraphicsSettings
};
