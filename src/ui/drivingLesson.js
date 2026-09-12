import "./drivingLesson.css";
import { clearKeys } from "../core/input.js";
const LESSON_STEPS = [["Find your pace", "Hold Up or W to accelerate. Use Left / Right or A / D to steer. On a controller, use the left stick and right trigger."], ["Brake before the bend", "Use Down, S or Space to brake, or the left trigger on a controller. Slow down before a tight corner."], ["Start a drift", "Build speed, steer into a bend and briefly tap the brake. Keep steering to hold the slide."], ["Straighten gently", "Ease the steering towards the centre. A short grace period lets you adjust before the car recovers. Leave room for the recovery boost."], ["Earn your points", "Longer controlled slides build a multiplier. Your points are secured when the car straightens. Traffic contact slows you down: leave space."]];
function installDrivingLesson(game) {
  const steps = LESSON_STEPS.map(step => [...step]);
  const host = document.querySelector("#select .easy-row") || document.getElementById("select"), label = document.createElement("label");
  label.className = "drive-mode", label.innerHTML = 'Drive mode <select id="drive-mode"><option value="race">Arcade race</option><option value="free">Free Drive \xB7 no timer</option></select>', host.append(label);
  const select = label.querySelector("select");
  try {
    select.value = localStorage.getItem("coastline.drive-mode") === "free" ? "free" : "race";
  } catch {
  }
  game.freeDrive = select.value === "free", select.onchange = () => {
    game.freeDrive = select.value === "free";
    try {
      localStorage.setItem("coastline.drive-mode", select.value);
    } catch {
    }
  };
  const button = document.createElement("button");
  button.id = "learn-driving", button.textContent = "Learn to drift", button.type = "button", host.append(button);
  const dialog = document.createElement("dialog");
  dialog.id = "driving-lesson", dialog.setAttribute("aria-labelledby", "lesson-title"), dialog.innerHTML = '<div class="lesson-kicker">DRIVING SCHOOL <span id="lesson-progress"></span></div><h2 id="lesson-title"></h2><p id="lesson-body"></p><div class="lesson-actions"><button id="lesson-close">Close</button><button id="lesson-next">Next</button><button id="lesson-practice" hidden>Practice in Free Drive</button></div>', document.body.append(dialog);
  let step = 0, returnFocus = button;
  const render = () => {
    dialog.querySelector("#lesson-title").textContent = steps[step][0], dialog.querySelector("#lesson-body").textContent = steps[step][1], dialog.querySelector("#lesson-progress").textContent = `${step + 1} / ${steps.length}`, dialog.querySelector("#lesson-next").hidden = step === steps.length - 1, dialog.querySelector("#lesson-practice").hidden = step !== steps.length - 1;
  };
  button.onclick = () => {
    step = 0, returnFocus = button, render(), clearKeys(), dialog.showModal();
  }, dialog.querySelector("#lesson-next").onclick = () => {
    step++, render();
  }, dialog.querySelector("#lesson-close").onclick = () => dialog.close(), dialog.querySelector("#lesson-practice").onclick = () => {
    select.value = "free", select.onchange(), returnFocus = document.getElementById("btn-go"), dialog.close();
  }, dialog.addEventListener("keydown", (e) => e.stopPropagation()), dialog.addEventListener("close", () => {
    clearKeys(), returnFocus.focus();
  });
}
export {
  LESSON_STEPS,
  installDrivingLesson
};
