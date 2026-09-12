function installDriveControls({ game, go, loop, audio, renderer, composer, toast, saveReport }) {
  const controls = document.createElement("div");
  controls.id = "drive-controls", controls.innerHTML = '<button type="button" id="pause-drive" aria-label="Pause driving (P)">Pause \xB7 P</button><button type="button" id="save-screenshot" aria-label="Save screenshot (F8)">Photo \xB7 F8</button>', document.body.append(controls);
  const panel = document.createElement("div");
  panel.id = "pause-panel", panel.hidden = true, panel.innerHTML = '<div><p>TAKE A BREATHER</p><h2>Drive paused</h2><p>Your timer and car are stopped.</p><button type="button" id="resume-drive">Resume drive</button><p>Press P or Escape to continue. F8 saves this view.</p></div>', document.body.append(panel);
  let manual = false;
  const toggle = () => {
    !manual && game.state !== "drive" || (manual = !manual, game.paused = manual, go(manual ? "paused" : "drive"), panel.hidden = !manual, dispatchEvent(new Event("driving-pause-change")), controls.querySelector("#pause-drive").textContent = (manual ? "Resume \xB7 P" : "Pause \xB7 P"), manual ? audio.suspend() : (loop.reseed(), audio.resume()));
  }, photo = () => {
    composer.render(), renderer.domElement.toBlob((blob) => {
      if (!blob) {
        toast("Photo could not be saved. Please try again.");
        return;
      }
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url, link.download = `coastline-rush-${( new Date()).toISOString().replace(/[:.]/g, "-")}.png`, link.click(), setTimeout(() => URL.revokeObjectURL(url), 3e4), toast("Photo saved to Downloads");
    }, "image/png");
  };
  return controls.querySelector("#pause-drive").onclick = toggle, controls.querySelector("#save-screenshot").onclick = photo, panel.querySelector("#resume-drive").onclick = toggle, addEventListener("keydown", (e) => {
    e.repeat || /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName) || (e.code === "F8" && (e.preventDefault(), photo()), (e.code === "KeyP" || e.code === "Escape" && (manual || game.state === "drive")) && (e.preventDefault(), toggle()));
  }), { get manualPaused() {
    return manual;
  }, pause() { if (!manual && game.state === "drive") toggle(); } };
}
export {
  installDriveControls
};
