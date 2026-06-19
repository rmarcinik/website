// Kanji Room — a first-person room woven from kanji glyphs.
// Loaded as an ES module when [data-sim="room"] canvas is found.
// Walk closer (WASD + mouse look) and the glyphs resolve into focus.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.175.0/build/three.module.js"

const canvas = document.querySelector("[data-sim='room']")
if (!canvas) throw new Error("room canvas not found")

const panel = canvas.parentElement
panel.style.position = "relative"
panel.style.overflow = "hidden"

const W = () => panel.clientWidth
const H = () => panel.clientHeight

// ── Renderer / scene ──────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x05060a)
scene.fog = new THREE.FogExp2(0x05060a, 0.045)

const camera = new THREE.PerspectiveCamera(70, W() / H(), 0.1, 100)
camera.position.set(0, 1.6, 4)

scene.add(new THREE.AmbientLight(0xffffff, 1))

// ── Kanji → texture cache. Each glyph becomes a glowing sprite. ────────────────

const textureCache = new Map()

function kanjiTexture(char, color) {
  const key = char + color
  if (textureCache.has(key)) return textureCache.get(key)

  const size = 128
  const c = document.createElement("canvas")
  c.width = c.height = size
  const ctx = c.getContext("2d")
  ctx.font = `700 ${size * 0.2}px "Yu Gothic", "Meiryo", "MS Gothic", serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.shadowColor = color
  ctx.shadowBlur = 18
  ctx.fillStyle = color
  ctx.fillText(char, size / 2, size / 2 + 4)
  ctx.shadowBlur = 0
  ctx.fillText(char, size / 2, size / 2 + 4)

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  textureCache.set(key, tex)
  return tex
}

// A particle = one kanji sprite that sharpens with proximity.
const glyphs = [] // { sprite, baseScale }

function addGlyph(char, color, pos, scale = 0.5) {
  const mat = new THREE.SpriteMaterial({
    map: kanjiTexture(char, color),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.15,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.position.copy(pos)
  sprite.scale.setScalar(scale)
  scene.add(sprite)
  glyphs.push({ sprite, baseScale: scale })
}

// ── Build the room out of glyph particles ─────────────────────────────────────

const ROOM = 7 // half-extent of room
const HGT = 4 // wall height
const palette = {
  floor: "#3a6ea5",
  wall:  "#8a7fb5",
  door:  "#d9a441",
  chair: "#5fb39a",
}

const rand = (a) => (Math.random() - 0.5) * a

// Floor — dense grid of 床, packed tight enough to read as a surface
for (let x = -ROOM; x <= ROOM; x += 0.7)
  for (let z = -ROOM; z <= ROOM; z += 0.7)
    addGlyph("床", palette.floor, new THREE.Vector3(x + rand(0.12), 0.02, z + rand(0.12)), 0.7)

// The far wall (z = -ROOM) has a doorway cut out of it for the 扉 glyphs
const inDoorway = (x, y) => x > -1.1 && x < 1.1 && y < 2.9

// Walls — 壁, four sides, tiled to a solid skin
for (let y = 0.4; y <= HGT; y += 0.6) {
  for (let x = -ROOM; x <= ROOM; x += 0.7) {
    if (!inDoorway(x, y))
      addGlyph("壁", palette.wall, new THREE.Vector3(x + rand(0.1), y, -ROOM), 0.7)
    addGlyph("壁", palette.wall, new THREE.Vector3(x + rand(0.1), y,  ROOM), 0.7)
  }
  for (let z = -ROOM; z <= ROOM; z += 0.7) {
    addGlyph("壁", palette.wall, new THREE.Vector3(-ROOM, y, z + rand(0.1)), 0.7)
    addGlyph("壁", palette.wall, new THREE.Vector3( ROOM, y, z + rand(0.1)), 0.7)
  }
}

// Door — 扉 tiled to fill the tall rectangle cut into the far wall
for (let y = 0.3; y <= 2.7; y += 0.35)
  for (let x = -0.9; x <= 0.9; x += 0.35)
    addGlyph("扉", palette.door, new THREE.Vector3(x + rand(0.06), y, -ROOM + 0.05), 0.7)

// Chair — 椅 built from a seat + backrest + legs
function chairAt(cx, cz) {
  const seatY = 0.9
  for (let x = -0.4; x <= 0.4; x += 0.4)
    for (let z = -0.4; z <= 0.4; z += 0.4)
      addGlyph("椅", palette.chair, new THREE.Vector3(cx + x, seatY, cz + z), 0.55)
  for (let x = -0.4; x <= 0.4; x += 0.4)
    for (let y = seatY + 0.45; y <= seatY + 1.2; y += 0.4)
      addGlyph("子", palette.chair, new THREE.Vector3(cx + x, y, cz - 0.4), 0.5)
  for (const sx of [-0.4, 0.4])
    for (const sz of [-0.4, 0.4])
      for (let y = 0.15; y < seatY; y += 0.4)
        addGlyph("椅", palette.chair, new THREE.Vector3(cx + sx, y, cz + sz), 0.4)
}
chairAt(1.6, 1.2)

// ── HUD ────────────────────────────────────────────────────────────────────────

const hud = document.createElement("div")
hud.className = "sim-hud"
const hudTitle = document.createElement("p"); hudTitle.className = "sim-hud-title"
const hudDesc  = document.createElement("p"); hudDesc.className  = "sim-hud-desc"
hudTitle.textContent = "Kanji Room"
hudDesc.textContent  = "A room woven from characters. Click to look around · WASD to move · ESC to release. Walk closer and the glyphs resolve."
hud.append(hudTitle, hudDesc)
panel.appendChild(hud)

// ── Pointer-lock mouse look + WASD ─────────────────────────────────────────────

const euler = new THREE.Euler(0, 0, 0, "YXZ")
const HALF_PI = Math.PI / 2

canvas.addEventListener("click", () => canvas.requestPointerLock())

document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== canvas) return
  euler.setFromQuaternion(camera.quaternion)
  euler.y -= e.movementX * 0.002
  euler.x -= e.movementY * 0.002
  euler.x = THREE.MathUtils.clamp(euler.x, -HALF_PI, HALF_PI)
  camera.quaternion.setFromEuler(euler)
})

const keys = {}
addEventListener("keydown", (e) => { keys[e.code] = true })
addEventListener("keyup",   (e) => { keys[e.code] = false })

const SPEED = 2.5
const BOUND = ROOM - 0.6
const up = new THREE.Vector3(0, 1, 0)
const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const move = new THREE.Vector3()

function moveCamera(dt) {
  if (document.pointerLockElement !== canvas) return

  camera.getWorldDirection(forward)
  forward.y = 0
  forward.normalize()
  right.crossVectors(forward, up).normalize()

  move.set(0, 0, 0)
  if (keys.KeyW) move.add(forward)
  if (keys.KeyS) move.sub(forward)
  if (keys.KeyD) move.add(right)
  if (keys.KeyA) move.sub(right)

  if (move.lengthSq() > 0) {
    move.normalize()
    camera.position.addScaledVector(move, SPEED * dt)
  }

  const p = camera.position
  p.x = THREE.MathUtils.clamp(p.x, -BOUND, BOUND)
  p.z = THREE.MathUtils.clamp(p.z, -BOUND, BOUND)
  p.y = 1.6
}

// ── Proximity clarity: glyphs near the camera grow sharper & brighter ──────────

const NEAR = 1.5
const FAR = 9
const tmp = new THREE.Vector3()

function updateClarity() {
  for (const g of glyphs) {
    const d = tmp.copy(g.sprite.position).sub(camera.position).length()
    const t = THREE.MathUtils.clamp((FAR - d) / (FAR - NEAR), 0, 1)
    const clarity = t * t // ease-in so it snaps into focus up close
    g.sprite.material.opacity = 0.1 + clarity * 0.9
    g.sprite.scale.setScalar(g.baseScale * (0.7 + clarity * 0.5))
  }
}

// ── Resize ───────────────────────────────────────────────────────────────────

function resize() {
  renderer.setSize(W(), H(), false)
  camera.aspect = W() / H()
  camera.updateProjectionMatrix()
}
resize()
window.addEventListener("resize", resize)

// ── Loop ───────────────────────────────────────────────────────────────────────

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  moveCamera(dt)
  updateClarity()
  renderer.render(scene, camera)
}

animate()
