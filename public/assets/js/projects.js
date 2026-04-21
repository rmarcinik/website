const mainPanel = document.getElementById("main-panel")
const breadcrumbTail = document.getElementById("breadcrumb-tail")

function projectFromPath() {
  const parts = location.pathname.replace(/^\//, "").split("/")
  return parts[1] ? decodeURIComponent(parts[1]) : null
}

async function init() {
  const categories = await fetchJson("/api/projects")
  let cursor = 0

  const getItems = () => Array.from(mainPanel.querySelectorAll("li[data-nav-item]"))
  const renderCursor = () => getItems().forEach((li, i) => li.classList.toggle("nav-cursor", i === cursor))

  function showList() {
    setBreadcrumb(null)
    mainPanel.dataset.back = "/"
    mainPanel.innerHTML = ""

    for (const category of categories) {
      if (category.name) {
        const label = document.createElement("p")
        label.className = "category-label"
        label.textContent = category.name
        mainPanel.appendChild(label)
      }

      const ul = document.createElement("ul")
      ul.className = "nav-list"

      for (const project of category.projects) {
        const li = document.createElement("li")
        li.dataset.navItem = ""
        const a = document.createElement("a")
        a.href = `/projects/${encodeURIComponent(project.name)}`
        a.dataset.project = project.name
        a.className = "nav-link"
        a.textContent = project.name
        li.appendChild(a)
        ul.appendChild(li)
      }

      mainPanel.appendChild(ul)
    }

    renderCursor()
  }

  function navigate(name) {
    history.pushState(null, "", `/projects/${encodeURIComponent(name)}`)
    cursor = 0
    loadProject(name)
  }

  async function loadProject(name) {
    if (!name) { showList(); return }
    const project = await fetchJson(`/api/projects/${encodeURIComponent(name)}`).catch(() => null)
    if (!project) { showList(); return }
    await showProject(project)
  }

  async function showProject(project) {
    setBreadcrumb(project.name)
    mainPanel.dataset.back = "/projects"
    mainPanel.innerHTML = ""

    if (project.type === "sim") {
      const canvas = document.createElement("canvas")
      canvas.className = "sim-canvas"
      canvas.dataset.sim = project.name
      mainPanel.appendChild(canvas)
      const script = document.createElement("script")
      script.type = "module"
      script.src = `/assets/js/${project.name}.js`
      document.head.appendChild(script)
      return
    }

    const inner = document.createElement("div")
    inner.className = "content-inner"

    if (project.type === "art") {
      renderArt(inner, project)
    } else if (project.type === "github") {
      renderGithubHeader(inner, project)
      const stats = await fetchJson(`/api/github/${project.repo}`)
      renderGithubStats(inner, stats)
    }

    mainPanel.appendChild(inner)
  }

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return
    const items = getItems()

    if (e.key === "ArrowUp" && items.length) {
      e.preventDefault()
      cursor = (cursor - 1 + items.length) % items.length
      renderCursor()
    }
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault()
      cursor = (cursor + 1) % items.length
      renderCursor()
    }
    if (e.key === "ArrowRight" && items.length) {
      const a = items[cursor]?.querySelector("a[data-project]")
      if (a) navigate(a.dataset.project)
    }
    if (e.key === "ArrowLeft") {
      const back = mainPanel.dataset.back
      if (back === "/") {
        location.href = "/"
      } else if (back) {
        history.pushState(null, "", back)
        cursor = 0
        showList()
      }
    }
  })

  window.addEventListener("popstate", async () => {
    cursor = 0
    const name = projectFromPath()
    if (name) { await loadProject(name) }
    else { showList() }
  })

  const name = projectFromPath()
  if (name) { await loadProject(name) }
  else { showList() }
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function setBreadcrumb(projectName) {
  if (projectName) {
    breadcrumbTail.innerHTML =
      `<a href="/projects" class="breadcrumb-link">projects</a>` +
      `<span class="breadcrumb-sep"> > </span>` +
      `<span class="breadcrumb-current">${escapeHtml(projectName)}</span>`
  } else {
    breadcrumbTail.innerHTML = `<span class="breadcrumb-current">projects</span>`
  }
}

// ── Renderers ─────────────────────────────────────────────────────────────────

function renderArt(container, project) {
  const img = document.createElement("img")
  img.src = project.image
  img.alt = project.name
  img.className = "project-image project-image--rotatable"
  img.addEventListener("click", () => img.classList.toggle("rotated"))
  container.innerHTML = `<p class="project-name">${project.name}</p>`
  container.appendChild(img)
  container.insertAdjacentHTML("beforeend", `<p class="project-rotate-hint">click to rotate</p>`)
}

function renderGithubHeader(container, project) {
  container.innerHTML = `
    <div class="project-header">
      <a href="https://github.com/${project.repo}" target="_blank" rel="noopener noreferrer" class="project-name">${project.name}</a>
    </div>`
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
    </div>`)
}

function langsHtml(languages) {
  if (!languages?.length) return ""
  return `<div class="lang-list">${languages.map(l =>
    `<div class="lang-row">
      <span class="lang-name">${l.name}</span>
      <div class="lang-bar-track"><div class="lang-bar-fill" style="width:${l.pct}%"></div></div>
      <span class="lang-pct">${l.pct}%</span>
    </div>`).join("")}</div>`
}

function commitGridHtml(grid) {
  if (!grid?.length) return ""
  const cells = grid.flatMap(week => week.map(level =>
    `<div class="commit-cell" style="--level:${level}"></div>`)).join("")
  return `<div class="commit-grid">${cells}</div>`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

function formatAge(iso) {
  if (!iso) return "unknown"
  const days = Math.floor((Date.now() - new Date(iso)) / 86_400_000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

init().catch(console.error)
