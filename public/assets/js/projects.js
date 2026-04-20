const nav = document.querySelector("nav.index-panel");
const contentPanel = document.querySelector(".content-panel");

function projectFromPath() {
  const parts = location.pathname.replace(/^\//, "").split("/");
  return parts[1] ? decodeURIComponent(parts[1]) : null;
}

async function init() {
  const categories = await fetchJson("/api/projects");
  renderNav(categories);
  await loadProject(projectFromPath());

  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-project]");
    if (!a) return;
    e.preventDefault();
    navigate(a.dataset.project);
  });

  window.addEventListener("popstate", () => loadProject(projectFromPath()));
}

function navigate(name) {
  history.pushState(null, "", `/projects/${encodeURIComponent(name)}`);
  updateNavActive(name);
  loadProject(name);
}

// ── Nav ──────────────────────────────────────────────────────────────────────

function renderNav(categories) {
  const ul = document.createElement("ul");
  ul.className = "category-list";

  for (const category of categories) {
    const li = document.createElement("li");
    li.innerHTML = `<p class="category-label">${category.name}</p>`;

    const navList = document.createElement("ul");
    navList.className = "nav-list";

    for (const project of category.projects) {
      const item = document.createElement("li");
      item.dataset.navItem = "";

      const a = document.createElement("a");
      a.href = `/projects/${encodeURIComponent(project.name)}`;
      a.dataset.project = project.name;
      a.className = "nav-link";
      a.textContent = project.name;
      item.appendChild(a);
      navList.appendChild(item);
    }

    li.appendChild(navList);
    ul.appendChild(li);
  }

  nav.appendChild(ul);
  updateNavActive(projectFromPath());
  initKeyNav();
}

function updateNavActive(name) {
  for (const a of nav.querySelectorAll("a[data-project]")) {
    const active = a.dataset.project === name;
    a.className = active ? "nav-link-active" : "nav-link";
    a.closest("li[data-nav-item]").toggleAttribute("data-current", active);
  }
}

function initKeyNav() {
  const items = () => Array.from(nav.querySelectorAll("li[data-nav-item]"));
  let cursor = Math.max(items().findIndex(li => li.hasAttribute("data-current")), 0);

  const render = () => items().forEach((li, i) => li.classList.toggle("nav-cursor", i === cursor));
  render();

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    const all = items();
    if (e.key === "ArrowUp")   { e.preventDefault(); cursor = (cursor - 1 + all.length) % all.length; render(); }
    if (e.key === "ArrowDown") { e.preventDefault(); cursor = (cursor + 1) % all.length; render(); }
    if (e.key === "ArrowRight") {
      const a = all[cursor]?.querySelector("a[data-project]");
      if (a) navigate(a.dataset.project);
    }
    if (e.key === "ArrowLeft") {
      const back = nav.dataset.back;
      if (back) location.href = back;
    }
  });
}

// ── Content ──────────────────────────────────────────────────────────────────

async function loadProject(name) {
  if (!name) { renderEmpty(); return; }
  const project = await fetchJson(`/api/projects/${encodeURIComponent(name)}`).catch(() => null);
  if (!project) { renderEmpty(); return; }
  await renderProject(project);
}

function renderEmpty() {
  contentPanel.innerHTML = `<div class="empty-state"><p class="empty-state-text">select a project</p></div>`;
}

async function renderProject(project) {
  if (project.type === "sim") { renderSim(project); return; }

  const inner = document.createElement("div");
  inner.className = "content-inner";

  if (project.type === "art") {
    renderArt(inner, project);
  } else if (project.type === "github") {
    renderGithubHeader(inner, project);
    const stats = await fetchJson(`/api/github/${project.repo}`);
    renderGithubStats(inner, stats);
  }

  contentPanel.innerHTML = "";
  contentPanel.appendChild(inner);
}

function renderSim(project) {
  contentPanel.innerHTML = `<canvas class="sim-canvas" data-sim="${project.name}"></canvas>`;
  const script = document.createElement("script");
  script.type = "module";
  script.src = `/assets/js/${project.name}.js`;
  document.head.appendChild(script);
}

function renderArt(container, project) {
  const img = document.createElement("img");
  img.src = project.image;
  img.alt = project.name;
  img.className = "project-image project-image--rotatable";
  img.addEventListener("click", () => img.classList.toggle("rotated"));
  container.innerHTML = `<p class="project-name">${project.name}</p>`;
  container.appendChild(img);
  container.insertAdjacentHTML("beforeend", `<p class="project-rotate-hint">click to rotate</p>`);
}

function renderGithubHeader(container, project) {
  container.innerHTML = `
    <div class="project-header">
      <span class="project-name">${project.name}</span>
      <a href="https://github.com/${project.repo}" target="_blank" rel="noopener noreferrer" class="repo-link">${project.repo}</a>
    </div>`;
}

function renderGithubStats(container, stats) {
  container.insertAdjacentHTML("beforeend", `
    <div class="github-stats">
      <div class="stats-grid">
        <div class="stats-row"><span class="stats-label">stars</span><span class="stats-value">${stats.stars}</span></div>
        <div class="stats-row"><span class="stats-label">forks</span><span class="stats-value">${stats.forks}</span></div>
        <div class="stats-row"><span class="stats-label">issues</span><span class="stats-value">${stats.issues}</span></div>
        <div class="stats-row"><span class="stats-label">pushed</span><span class="stats-value">${formatAge(stats.pushed_at)}</span></div>
      </div>
      ${langsHtml(stats.languages)}
      ${commitGridHtml(stats.commit_grid)}
      ${stats.readme ? `<pre class="readme-content">${escapeHtml(stats.readme)}</pre>` : ""}
    </div>`);

  initCommitMesh(container.querySelector("canvas.commit-mesh"));
}

function langsHtml(languages) {
  if (!languages?.length) return "";
  return `<div class="lang-list">${languages.map(l =>
    `<div class="lang-row">
      <span class="lang-name">${l.name}</span>
      <div class="lang-bar-track"><div class="lang-bar-fill" style="width:${l.pct}%"></div></div>
      <span class="lang-pct">${l.pct}%</span>
    </div>`).join("")}</div>`;
}

function commitGridHtml(grid) {
  if (!grid?.length) return "";
  const cells = grid.flatMap(week => week.map(level =>
    `<div class="commit-cell" style="--level:${level}"></div>`)).join("");
  return `<div class="commit-grid">${cells}</div><canvas class="commit-mesh" data-grid='${JSON.stringify(grid)}'></canvas>`;
}

// ── Commit mesh (Joy Division canvas) ────────────────────────────────────────

function initCommitMesh(canvas) {
  if (!canvas) return;
  const grid = JSON.parse(canvas.dataset.grid);
  const weeks = grid.length;
  const days = grid[0]?.length ?? 7;
  const xStep = 14, lineSpacing = 20, topMargin = 10, minPeak = 5, maxPeak = 45, noise = 1;
  const w = weeks * xStep;
  const h = topMargin + maxPeak + (days - 1) * lineSpacing + 10;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + "px"; canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const lines = Array.from({ length: days }, (_, d) => {
    const baselineY = topMargin + maxPeak + d * lineSpacing;
    const peakScale = minPeak + d * (maxPeak - minPeak) / Math.max(days - 1, 1);
    return Array.from({ length: weeks }, (_, wk) => ({
      x: wk * xStep + xStep / 2,
      y: baselineY - (grid[wk]?.[d] ?? 0) / 4 * peakScale + (Math.random() * 2 - 1) * noise,
    }));
  });

  const buildCurve = (line) => {
    for (let j = 0; j < line.length - 2; j++) {
      const xc = (line[j].x + line[j + 1].x) / 2;
      const yc = (line[j].y + line[j + 1].y) / 2;
      ctx.quadraticCurveTo(line[j].x, line[j].y, xc, yc);
    }
    const n = line.length - 1;
    ctx.quadraticCurveTo(line[n - 1].x, line[n - 1].y, line[n].x, line[n].y);
  };

  for (let d = 0; d < days; d++) {
    const line = lines[d];
    const by = topMargin + maxPeak + d * lineSpacing;
    ctx.beginPath();
    ctx.moveTo(-1, by); ctx.lineTo(line[0].x, line[0].y);
    buildCurve(line);
    ctx.lineTo(w + 1, by); ctx.lineTo(w + 1, h + 1); ctx.lineTo(-1, h + 1);
    ctx.closePath();
    ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fill(); ctx.restore();
    ctx.beginPath();
    ctx.moveTo(line[0].x, line[0].y);
    buildCurve(line);
    ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function formatAge(iso) {
  if (!iso) return "unknown";
  const days = Math.floor((Date.now() - new Date(iso)) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

init().catch(console.error);
