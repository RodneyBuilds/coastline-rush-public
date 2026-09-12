import { clearKeys } from "../core/input.js";
function installCredits() {
  const button = document.createElement("button");
  button.type = "button", button.id = "game-credits", button.className = "player-settings-button", button.textContent = "Credits", document.querySelector("#select .easy-row").append(button);
  const dialog = document.createElement("dialog");
  dialog.id = "game-credits-dialog", dialog.setAttribute("aria-labelledby", "credits-title"), dialog.innerHTML = `<h2 id="credits-title">Made for the drive</h2>
 <p>Original driving game, scenery and generic vehicle geometry.</p>
 <h3>Music</h3><p>Pure Raceway and Hot Roadway by MintoDog. Black Diamond by Joth. Recordings re-encoded and normalized; CC0.</p>
 <p><a href="assets/audio/DRIVING-MUSIC.md" target="_blank" rel="noopener">Track sources and licenses</a></p>
 <h3>Textures</h3><p>Modified grass, ground, bark and leaf maps from ambientCG, CC0. Additional procedural surface textures.</p>
 <p><a href="assets/textures/CREDITS.md" target="_blank" rel="noopener">Texture sources and processing</a></p>
 <h3>Announcer</h3><p>Local recordings generated with Kokoro-82M, af_heart voice. No speech service is used during play.</p>
 <p><a href="assets/audio/ANNOUNCER.md" target="_blank" rel="noopener">Voice source and processing</a></p>
 <h3>Rendering</h3><p>Three.js, MIT license.</p>
 <p>Original generic player and traffic vehicles. No downloaded vehicle models included.</p>
 <form method="dialog"><button>Back to garage</button></form>`, document.body.append(dialog), button.onclick = () => {
    clearKeys(), dialog.showModal();
  }, dialog.addEventListener("close", () => {
    clearKeys(), button.focus();
  }), dialog.addEventListener("keydown", (e) => e.stopPropagation());
}
export {
  installCredits
};
