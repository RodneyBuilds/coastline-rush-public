function installFrameRateSettings(loop) {
  let value = "60";
  try {
    value = localStorage.getItem("coastline.frameLimit") || value;
  } catch {
  }
  ["30", "60", "120", "0"].includes(value) || (value = "60");
  const controls = [], apply = () => {
    loop.setFrameLimit(Number(value));
    for (const control of controls) control.value = value;
    try {
      localStorage.setItem("coastline.frameLimit", value);
    } catch {
    }
  };
  for (const parent of [document.querySelector("#select .easy-row"), document.querySelector("#pause-panel>div")]) {
    if (!parent) continue;
    const label = document.createElement("label");
    label.className = "graphics-setting", label.textContent = "Frame rate ";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Frame rate limit"), select.innerHTML = '<option value="30">30 FPS (battery saver)</option><option value="60">60 FPS</option><option value="120">120 FPS</option><option value="0">Unlimited</option>', label.append(select), parent.append(label), controls.push(select), select.onchange = () => {
      value = select.value, apply();
    };
  }
  apply();
}
export {
  installFrameRateSettings
};
