import "phoenix_html"

// Handle flash close
document.querySelectorAll("[role=alert][data-flash]").forEach((el) => {
  el.addEventListener("click", () => {
    el.setAttribute("hidden", "")
  })
})

// Fill astronomy background with evenly spaced symbols (~1 inch apart)
const fillAstroBackground = () => {
  const svg = document.getElementById("astro-bg")
  if (!svg) return

  const symbols = svg.dataset.symbols.split(",")
  const spacing = 96  // 96px ≈ 1 inch at standard DPI
  const w = window.innerWidth
  const h = window.innerHeight

  svg.setAttribute("width", w)
  svg.setAttribute("height", h)
  svg.innerHTML = ""

  const ns = "http://www.w3.org/2000/svg"
  let i = 0

  for (let col = 0; col * spacing < w + spacing; col++) {
    for (let row = 0; row * spacing < h + spacing; row++) {
      const x = Math.round(col * spacing + spacing / 2)
      const y = Math.round(row * spacing + spacing / 2)
      const el = document.createElementNS(ns, "text")
      el.setAttribute("x", x)
      el.setAttribute("y", y)
      el.setAttribute("font-family", "monospace")
      el.setAttribute("font-size", "14")
      el.setAttribute("fill", "currentColor")
      el.setAttribute("text-anchor", "middle")
      el.setAttribute("dominant-baseline", "middle")
      el.textContent = symbols[i % symbols.length]
      svg.appendChild(el)
      i++
    }
  }
}

fillAstroBackground()
window.addEventListener("resize", fillAstroBackground)

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
