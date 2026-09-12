import { touchDevice } from "../core/device.js";

function installMobileGarage() {
  if (!touchDevice) return;
  const garage = document.getElementById("select");
  const header = garage.querySelector(".garage-header");
  header.querySelector(".trip-tag").textContent = "EXPERIMENTAL MOBILE · DESKTOP RECOMMENDED";
  const tabs = document.createElement("div");
  tabs.className = "mobile-garage-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Garage sections");
  const content = document.createElement("div");
  content.className = "mobile-garage-content";
  const sections = [
    ["ride", "Your ride", [garage.querySelector("#car-cards")]],
    ["music", "Music & route", [garage.querySelector(".select-lower")]],
    ["settings", "Settings", [garage.querySelector(".easy-row")]]
  ];
  const choose = name => {
    for (const button of tabs.children) {
      const selected = button.dataset.section === name;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const panel of content.children) panel.hidden = panel.dataset.section !== name;
  };
  for (const [name, title, nodes] of sections) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = `garage-tab-${name}`;
    button.dataset.section = name;
    button.textContent = title;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", `garage-panel-${name}`);
    button.onclick = () => choose(name);
    button.onkeydown = event => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const index = sections.findIndex(section => section[0] === name);
      const next = (index + (event.key === "ArrowRight" ? 1 : -1) + sections.length) % sections.length;
      choose(sections[next][0]);
      tabs.children[next].focus();
    };
    const panel = document.createElement("div");
    panel.id = `garage-panel-${name}`;
    panel.dataset.section = name;
    panel.className = "mobile-garage-panel";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", button.id);
    panel.append(...nodes);
    tabs.append(button);
    content.append(panel);
  }
  const footer = document.createElement("div");
  footer.className = "mobile-garage-footer";
  footer.append(garage.querySelector("#btn-demo"), garage.querySelector(".go-row"));
  garage.querySelector(".panel-title").hidden = true;
  garage.replaceChildren(header, tabs, content, footer);
  choose("ride");
}
export { installMobileGarage };
