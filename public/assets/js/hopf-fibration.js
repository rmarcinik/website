// Hopf Fibration — 20k particle simulation
// Loaded as an ES module when [data-sim="hopf-fibration"] canvas is found.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.175.0/build/three.module.js"

const canvas = document.querySelector("[data-sim='hopf-fibration']")
if (!canvas) throw new Error("hopf canvas not found")

const panel = canvas.parentElement
panel.style.position = "relative"
panel.style.overflow = "hidden"

// ── Renderer ────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)

const W = () => panel.clientWidth
const H = () => panel.clientHeight

const camera = new THREE.PerspectiveCamera(60, W() / H(), 0.01, 1000)
camera.position.set(0, 0, 45)

// ── Particles ────────────────────────────────────────────────────────────────

const COUNT = 20000
const positions = new Float32Array(COUNT * 3)
const colors    = new Float32Array(COUNT * 3)

const geo = new THREE.BufferGeometry()
geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3))

const mat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true })
const pts = new THREE.Points(geo, mat)
scene.add(pts)

// ── HUD ──────────────────────────────────────────────────────────────────────

const hud = document.createElement("div")
hud.className = "sim-hud"

const hudTitle    = document.createElement("p");  hudTitle.className = "sim-hud-title"
const hudDesc     = document.createElement("p");  hudDesc.className  = "sim-hud-desc"
const hudControls = document.createElement("div"); hudControls.className = "sim-hud-controls"

hud.append(hudTitle, hudDesc, hudControls)
panel.appendChild(hud)

// ── Controls ─────────────────────────────────────────────────────────────────

const ctrlValues = {}

function addControl(id, label, min, max, init) {
  if (!(id in ctrlValues)) {
    ctrlValues[id] = init

    const row = document.createElement("div")
    row.className = "sim-ctrl"

    const lbl = document.createElement("label")
    lbl.className = "sim-ctrl-label"
    lbl.textContent = label

    const inp = document.createElement("input")
    inp.type = "range"
    inp.className = "sim-ctrl-input"
    inp.min = min; inp.max = max
    inp.step = (max - min) / 400
    inp.value = init

    const num = document.createElement("span")
    num.className = "sim-ctrl-value"
    num.textContent = Number(init).toFixed(1)

    inp.addEventListener("input", () => {
      ctrlValues[id] = parseFloat(inp.value)
      num.textContent = ctrlValues[id].toFixed(1)
    })

    row.append(lbl, inp, num)
    hudControls.appendChild(row)
  }
  return ctrlValues[id]
}

function setInfo(title, desc) {
  hudTitle.textContent = title
  hudDesc.textContent  = desc
}

// ── Mouse drag orbit ─────────────────────────────────────────────────────────

let dragging = false, px = 0, py = 0, rotX = 0, rotY = 0

canvas.addEventListener("mousedown", e => { dragging = true; px = e.clientX; py = e.clientY })
window.addEventListener("mousemove", e => {
  if (!dragging) return
  rotY += (e.clientX - px) * 0.004
  rotX += (e.clientY - py) * 0.004
  px = e.clientX; py = e.clientY
})
window.addEventListener("mouseup", () => { dragging = false })

// ── Resize ───────────────────────────────────────────────────────────────────

function resize() {
  renderer.setSize(W(), H(), false)
  camera.aspect = W() / H()
  camera.updateProjectionMatrix()
}
resize()
window.addEventListener("resize", resize)

// ── Animation ────────────────────────────────────────────────────────────────

const TAU = 6.28318530
const GOLDEN_ANG = 2.39996323

const target = new THREE.Vector3()
const color  = new THREE.Color()
const clock  = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const time = clock.getElapsedTime()

  // Read controls once per frame (creates sliders on first call)
  const scale   = addControl("scale",   "Scale",      3,  40, 14)
  const speed   = addControl("speed",   "Speed",      0,   2, 0.25)
  const nFibers = addControl("fibers",  "Fibers",    20, 300, 100)
  const bright  = addControl("bright",  "Brightness", 0.1, 0.8, 0.5)

  const t  = time * speed
  const fc = Math.round(nFibers)

  // 4D rotation coefficients — constant across particles
  const ra   = t * 0.08
  const cosR = Math.cos(ra)
  const sinR = Math.sin(ra)

  for (let i = 0; i < COUNT; i++) {
    const frac = i / COUNT
    const fi   = Math.floor(frac * fc)
    const fp   = frac * fc - fi

    // Fibonacci sphere: base point on S2
    const fiFrac = (fi + 0.5) / fc
    const polar  = Math.acos(1.0 - 2.0 * fiFrac)
    const azim   = GOLDEN_ANG * fi

    // Hopf fiber param
    const psi  = fp * TAU + t
    const hP   = polar * 0.5
    const cosH = Math.cos(hP)
    const sinH = Math.sin(hP)

    // Unit quaternion on S3
    const qa = cosH * Math.cos((psi + azim) * 0.5)
    const qb = cosH * Math.sin((psi + azim) * 0.5)
    const qc = sinH * Math.cos((psi - azim) * 0.5)
    const qd = sinH * Math.sin((psi - azim) * 0.5)

    // 4D rotation in (c,d) plane
    const qcr = qc * cosR - qd * sinR
    const qdr = qc * sinR + qd * cosR

    // Stereographic projection S3 -> R3 (pole at w = 1)
    const den = 1.0 - qdr + 1e-5
    target.set(qa / den * scale, qb / den * scale, qcr / den * scale)

    // Hue per fiber, lightness pulses along each ring
    const hue = (fi / fc + t * 0.03) % 1.0
    const lit = bright * (0.5 + 0.5 * Math.sin(psi + t * 0.4))
    color.setHSL(hue, 1.0, lit)

    if (i === 0) {
      setInfo(
        "Hopf Fibration",
        "Every ring is a great circle on S\u00b3 \u2014 a Hopf fiber. " +
        "Together they tile 3-space as nested, interlocked tori."
      )
    }

    positions[i * 3]     = target.x
    positions[i * 3 + 1] = target.y
    positions[i * 3 + 2] = target.z
    colors[i * 3]        = color.r
    colors[i * 3 + 1]    = color.g
    colors[i * 3 + 2]    = color.b
  }

  geo.attributes.position.needsUpdate = true
  geo.attributes.color.needsUpdate    = true

  pts.rotation.y = rotY + time * 0.05
  pts.rotation.x = rotX

  renderer.render(scene, camera)
}

animate()
