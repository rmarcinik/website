import "phoenix_html"

// Handle flash close
document.querySelectorAll("[role=alert][data-flash]").forEach((el) => {
  el.addEventListener("click", () => {
    el.setAttribute("hidden", "")
  })
})

// Joy Division-style commit activity visualisation
// Quadratic bezier curves + destination-out compositing for organic depth illusion
const initCommitMesh = () => {
  const canvas = document.querySelector("canvas.commit-mesh")
  if (!canvas) return

  const grid = JSON.parse(canvas.dataset.grid) // grid[week][day] = level 0–4
  const weeks = grid.length
  const days = grid[0]?.length ?? 7
  const xStep = 14
  const lineSpacing = 20
  const topMargin = 10
  const minPeak = 5
  const maxPeak = 45
  const noise = 1

  const w = weeks * xStep
  const h = topMargin + maxPeak + (days - 1) * lineSpacing + 10

  const dpr = window.devicePixelRatio || 1
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + "px"
  canvas.style.height = h + "px"

  const ctx = canvas.getContext("2d")
  ctx.scale(dpr, dpr)

  // One point per week per day line
  const lines = Array.from({ length: days }, (_, d) => {
    const baselineY = topMargin + maxPeak + d * lineSpacing
    const peakScale = minPeak + d * (maxPeak - minPeak) / Math.max(days - 1, 1)
    return Array.from({ length: weeks }, (_, wk) => {
      const level = grid[wk]?.[d] ?? 0
      const displacement = (level / 4) * peakScale
      return {
        x: wk * xStep + xStep / 2,
        y: baselineY - displacement + (Math.random() * 2 - 1) * noise,
      }
    })
  })

  // Append quadratic bezier curves through midpoints to the current path
  const buildCurve = (line) => {
    for (let j = 0; j < line.length - 2; j++) {
      const xc = (line[j].x + line[j + 1].x) / 2
      const yc = (line[j].y + line[j + 1].y) / 2
      ctx.quadraticCurveTo(line[j].x, line[j].y, xc, yc)
    }
    const n = line.length - 1
    ctx.quadraticCurveTo(line[n - 1].x, line[n - 1].y, line[n].x, line[n].y)
  }

  for (let d = 0; d < days; d++) {
    const line = lines[d]
    const by = topMargin + maxPeak + d * lineSpacing

    // Fill silhouette with destination-out to erase lines drawn behind this one
    ctx.beginPath()
    ctx.moveTo(-1, by)
    ctx.lineTo(line[0].x, line[0].y)
    buildCurve(line)
    ctx.lineTo(w + 1, by)
    ctx.lineTo(w + 1, h + 1)
    ctx.lineTo(-1, h + 1)
    ctx.closePath()
    ctx.save()
    ctx.globalCompositeOperation = "destination-out"
    ctx.fill()
    ctx.restore()

    // Stroke the waveform
    ctx.beginPath()
    ctx.moveTo(line[0].x, line[0].y)
    buildCurve(line)
    ctx.strokeStyle = "rgba(255,255,255,0.65)"
    ctx.lineWidth = 1.5
    ctx.lineJoin = "round"
    ctx.stroke()
  }
}

initCommitMesh()

// Site search (runs on any page with #site-search)
const initSearch = () => {
  const input = document.getElementById("site-search")
  const results = document.getElementById("search-results")
  if (!input || !results) return

  const pages = [
    { label: "index", href: "/" },
    { label: "projects/", href: "/projects" },
  ]

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase()
    results.innerHTML = ""
    if (!q) { results.classList.add("hidden"); return }

    const matches = pages.filter(p => p.label.includes(q))
    if (matches.length === 0) { results.classList.add("hidden"); return }

    matches.forEach(p => {
      const li = document.createElement("li")
      const a = document.createElement("a")
      a.href = p.href
      a.textContent = p.label
      a.className = "text-base-content/60 hover:text-base-content transition-colors"
      li.appendChild(a)
      results.appendChild(li)
    })
    results.classList.remove("hidden")
  })
}

initSearch()

// Keyboard navigation (yazi/nnn-style arrow key nav through the left nav panel)
const initKeyNav = () => {
  const nav = document.querySelector("nav")
  if (!nav) return

  const items = Array.from(nav.querySelectorAll("li[data-nav-item]"))
  if (items.length === 0) return

  let cursor = items.findIndex(li => li.querySelector("[data-current]"))
  if (cursor === -1) cursor = 0

  const render = () => {
    items.forEach((li, i) => li.classList.toggle("nav-cursor", i === cursor))
  }
  render()

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return

    if (e.key === "ArrowUp") {
      e.preventDefault()
      cursor = (cursor - 1 + items.length) % items.length
      render()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      cursor = (cursor + 1) % items.length
      render()
    } else if (e.key === "ArrowRight") {
      const a = items[cursor]?.querySelector("a")
      if (a) window.location.href = a.href
    } else if (e.key === "ArrowLeft") {
      const back = nav.dataset.back
      if (back) window.location.href = back
    }
  })
}

initKeyNav()

// Rotatable images (e.g. ambigram)
document.querySelectorAll("[data-rotatable]").forEach((img) => {
  img.addEventListener("click", () => img.classList.toggle("rotated"))
})

// Particle simulations — load sim script as ES module (imports THREE internally)
const simCanvas = document.querySelector("[data-sim]")
if (simCanvas) {
  const sim = document.createElement("script")
  sim.type = "module"
  sim.src = "/assets/js/" + simCanvas.dataset.sim + ".js"
  document.head.appendChild(sim)
}
