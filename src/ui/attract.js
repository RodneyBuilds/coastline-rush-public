import { COPY } from "./copy.js";
function settleLogotype() {
  document.body.classList.remove("fresh-load");
}
function renderRouteMap(host, routes, stages, current = null) {
  if (!host) return;
  const rowOf =  new Map();
  for (const route of routes) route.forEach((id, i) => {
    (!rowOf.has(id) || rowOf.get(id) > i) && rowOf.set(id, i);
  });
  const rows = [];
  for (const [id, r] of rowOf) (rows[r] || (rows[r] = [])).push(id);
  const W = 360, H = 118, colX = (r) => 26 + r / Math.max(1, rows.length - 1) * (W - 96), nodeY = (row, i) => {
    const n = row.length;
    return n === 1 ? H / 2 - 10 : 22 + i / (n - 1) * (H - 62);
  }, pos =  new Map(), parentsOf =  new Map();
  for (const route of routes) for (let i = 1; i < route.length; i++) parentsOf.has(route[i]) || parentsOf.set(route[i],  new Set()), parentsOf.get(route[i]).add(route[i - 1]);
  const orderInRow =  new Map();
  rows.forEach((row, r) => {
    if (r === 0) row.sort();
    else {
      const bary = (id) => {
        const ps = [...parentsOf.get(id) || []].map((p) => orderInRow.get(p)).filter((v) => v !== void 0);
        return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : Number.MAX_SAFE_INTEGER;
      };
      row.sort((a, b) => bary(a) - bary(b) || a.localeCompare(b));
    }
    row.forEach((id, i) => {
      orderInRow.set(id, i), pos.set(id, { x: colX(r), y: nodeY(row, i) });
    });
  });
  const edges =  new Set();
  for (const route of routes) for (let i = 0; i + 1 < route.length; i++) edges.add(`${route[i]}|${route[i + 1]}`);
  const paths = [...edges].map((e) => {
    const [a, b] = e.split("|"), p = pos.get(a), q = pos.get(b);
    if (!p || !q) return "";
    const mx = (p.x + q.x) / 2;
    return `M${p.x} ${p.y} Q${mx} ${p.y} ${q.x} ${q.y}`;
  }).filter(Boolean).join(" "), dots = [...pos.entries()].map(([id, p]) => {
    const isCurrent = id === current, r = isCurrent ? 6.5 : 5, fill = isCurrent ? "#a63d2c" : "#7a5c33";
    return `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}"/>`;
  }).join(""), labels = [...pos.entries()].map(([id, p]) => {
    const name = stages[id] && stages[id].name || id.toUpperCase(), anchor = p.x < W * 0.25 ? "start" : p.x > W * 0.7 ? "end" : "middle", dx = anchor === "start" ? -18 : anchor === "end" ? 22 : 0, dy = p.y < H / 2 ? -10 : 18;
    return `<text x="${p.x + dx}" y="${p.y + dy}" font-size="9" font-weight="800" text-anchor="${anchor}" fill="#4a3323" stroke="#f8efd8" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke">${escapeText(name)}</text>`;
  }).join("");
  host.innerHTML = `
    <h4>${escapeText(COPY.attract.routeMapTitle)}</h4>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeText(COPY.attract.routeMapTitle)}">
      <path d="${paths}" fill="none" stroke="#a63d2c" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round"/>
      ${dots}
      ${labels}
    </svg>
    <div class="cap">${escapeText(COPY.attract.routeMapCaption)}</div>
  `;
}
function escapeText(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export {
  renderRouteMap,
  settleLogotype
};
