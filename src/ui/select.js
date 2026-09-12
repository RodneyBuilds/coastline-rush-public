import { CARS } from "../physics/cars.js";
import { COPY, TRACK_CREDITS } from "./copy.js";
import { readSpectrum } from "../audio/music.js";
const CAR_SVG = { toy: '<svg class="car-svg" viewBox="0 0 170 74"><rect x="18" y="24" width="118" height="26" rx="10" fill="#ffb62e" stroke="#0d2a66" stroke-width="3"/><rect x="30" y="12" width="52" height="16" rx="6" fill="#ffb62e" stroke="#0d2a66" stroke-width="3"/><path d="M96 26 L96 8 M96 8 L120 8 M120 8 L120 26" stroke="#e8ecef" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="46" cy="54" r="14" fill="#1e1f24"/><circle cx="46" cy="54" r="6" fill="#e8ecef"/><circle cx="116" cy="54" r="14" fill="#1e1f24"/><circle cx="116" cy="54" r="6" fill="#e8ecef"/><rect x="52" y="30" width="26" height="12" rx="3" fill="#29b7e8" stroke="#0d2a66" stroke-width="2"/><circle cx="137" cy="34" r="5" fill="#fff3c4" stroke="#0d2a66" stroke-width="2"/></svg>', crv: '<svg class="car-svg" viewBox="0 0 170 74"><path d="M14 50 Q14 34 30 32 L46 18 Q52 12 66 12 L104 12 Q116 12 126 22 L142 30 Q156 32 156 46 L156 50 Z" fill="#1e5a7d" stroke="#0d2a66" stroke-width="3"/><path d="M52 18 L100 18 Q108 18 114 24 L122 30 L56 30 Q50 30 50 24 Z" fill="#9fc5d8" stroke="#0d2a66" stroke-width="2"/><circle cx="48" cy="54" r="13" fill="#1e1f24"/><circle cx="48" cy="54" r="5" fill="#dfe4ea"/><circle cx="124" cy="54" r="13" fill="#1e1f24"/><circle cx="124" cy="54" r="5" fill="#dfe4ea"/><rect x="146" y="38" width="9" height="6" rx="2" fill="#fff3c4" stroke="#0d2a66" stroke-width="2"/></svg>', gt: '<svg class="car-svg" viewBox="0 0 170 74"><path d="M12 50 Q12 38 26 36 L52 24 Q62 18 78 18 L102 22 Q120 26 132 32 Q152 34 152 46 L152 50 Z" fill="#dd1512" stroke="#0d2a66" stroke-width="3"/><path d="M58 24 L92 22 L100 30 L62 32 Z" fill="#9fc5d8" stroke="#0d2a66" stroke-width="2"/><circle cx="44" cy="54" r="13" fill="#1e1f24"/><circle cx="44" cy="54" r="5" fill="#dfe4ea"/><circle cx="122" cy="54" r="13" fill="#1e1f24"/><circle cx="122" cy="54" r="5" fill="#dfe4ea"/></svg>' };
class SelectScreen {
  constructor({ onCar, onMusic, onEasy, onGo }) {
    this.onCar = onCar, this.onMusic = onMusic, this.onEasy = onEasy, this.onGo = onGo, this.carIndex = 1, this.musicIndex = 1, this.easyMode = false, this.cardsHost = document.getElementById("car-cards"), this.musicName = document.getElementById("music-name"), this.musicCredits = document.getElementById("music-credits"), this.easyButton = document.getElementById("easy-mode"), this.goButton = document.getElementById("btn-go"), this._buildCards(), this._bind();
    const canvas = document.getElementById("music-spectrum"), ctx = canvas.getContext("2d"), levels = new Uint8Array(64), draw = () => {
      if (requestAnimationFrame(draw), !!document.getElementById("select").classList.contains("show")) {
        readSpectrum(levels), ctx.clearRect(0, 0, 640, 64);
        for (let i = 0; i < 48; i++) {
          const height = Math.max(2, levels[i] / 255 * 62);
          ctx.fillStyle = i < 24 ? "#49e3cf" : "#e1ff6c", ctx.fillRect(i * 13.33, 64 - height, 8, height);
        }
      }
    };
    requestAnimationFrame(draw);
  }
  _buildCards() {
    this.cardsHost.innerHTML = CARS.map((car, i) => `
      <div class="car-card${i === this.carIndex ? " focused" : ""}" data-car="${car.id}" data-index="${i}" tabindex="0">
        <div class="car-art">
          ${CAR_SVG[car.id] || ""}
          <img class="car-card-img" src="assets/cards/generic-${car.id}.png" alt="" width="170" height="74">
        </div>
        <div class="car-name">${car.name}</div>
        <div class="car-desc">${car.desc}</div>
        <div class="car-flavor">${car.flavor}</div>
      </div>
    `).join(""), this.cards = [...this.cardsHost.querySelectorAll(".car-card")];
    for (const img of this.cardsHost.querySelectorAll(".car-card-img")) img.addEventListener("error", () => {
      const art = img.parentElement;
      img.remove(), art && art.classList.add("no-photo");
    });
  }
  _bind() {
    this.cards.forEach((card, i) => {
      card.addEventListener("click", () => this.setCar(i)), card.addEventListener("focus", () => this.setCar(i));
    }), this.easyButton.addEventListener("click", () => this.setEasy(!this.easyMode)), this.goButton.addEventListener("click", () => this.onGo()), document.getElementById("music-prev").addEventListener("click", () => this.setMusic(this.musicIndex - 1)), document.getElementById("music-next").addEventListener("click", () => this.setMusic(this.musicIndex + 1)), document.getElementById("music-retry").addEventListener("click", () => this.onMusic(this.musicIndex));
  }
  restore({ carIndex, musicIndex, easyMode }) {
    this.carIndex = carIndex, this.musicIndex = musicIndex, this.easyMode = easyMode, this.render();
  }
  setCar(i, notify = true) {
    const next = Math.max(0, Math.min(CARS.length - 1, i));
    next !== this.carIndex && (this.carIndex = next, this.render(), notify && this.onCar(next));
  }
  setMusic(i, notify = true) {
    const n = TRACK_CREDITS.length, next = (i % n + n) % n;
    next !== this.musicIndex && (this.musicIndex = next, this.render(), notify && this.onMusic(next));
  }
  setEasy(on, notify = true) {
    this.easyMode = !!on, this.render(), notify && this.onEasy(this.easyMode);
  }
  render() {
    this.cards.forEach((c, i) => c.classList.toggle("focused", i === this.carIndex));
    const track = TRACK_CREDITS[this.musicIndex];
    this.musicName.textContent = `${String(this.musicIndex + 1).padStart(2, "0")} \xB7 ${track.title}`, this.musicCredits.textContent = track.credit, this.easyButton.textContent = this.easyMode ? COPY.newInBuild.easyModeOn : COPY.newInBuild.easyModeOff, this.easyButton.classList.toggle("on", this.easyMode);
  }
  handleInput(input) {
    input.leftEdge && this.setCar(this.carIndex - 1), input.rightEdge && this.setCar(this.carIndex + 1), input.upEdge && this.setMusic(this.musicIndex - 1), input.downEdge && this.setMusic(this.musicIndex + 1), input.easyEdge && this.setEasy(!this.easyMode);
    const card = this.cards[this.carIndex], screen = document.getElementById("select"), active = document.activeElement, navigateCars = input.leftEdge || input.rightEdge, enteringMenu = !screen.contains(active);
    card && card.getClientRects().length > 0 && active !== card && screen.classList.contains("show") && !document.querySelector("dialog[open]") && (navigateCars || enteringMenu) && card.focus({ preventScroll: true });
  }
}
export {
  SelectScreen
};
