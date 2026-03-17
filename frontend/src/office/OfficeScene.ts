import Phaser from 'phaser'
import { speak, stopSpeech } from './voice'
import airportData from './airportData.json'

const W = 820
const H = 540

// ─── Layout constants ──────────────────────────────────────────────────────────
const EXT_BOT = 108    // bottom of exterior strip (top of terminal wall)
const FLOOR_Y  = 160   // terminal floor starts here
const HUD_Y    = H - 45

// ─── Palette ───────────────────────────────────────────────────────────────────
const C = {
  // ── Exterior sky ──
  skyDeep:      0x071540,
  skyMid:       0x1556b8,
  skyHorizon:   0x3a9fd8,
  sunGlow:      0xfde68a,

  // ── Tarmac / field ──
  tarmac:       0x272b33,
  tarmacLine:   0xeef0c0,
  runway:       0x1c1f25,
  runwayCenter: 0xfef9c3,
  fieldDark:    0x163b16,
  fieldMid:     0x1f5220,
  fieldLight:   0x2a7030,
  fieldHighlight:0x34953e,

  // ── Terminal interior ──
  wallTop:      0x0c1220,
  wallMid:      0x111827,
  ceiling:      0x070d1a,
  ceilingLight: 0xfef3c7,
  floor:        0x131d33,
  floorTile:    0x182340,
  floorLine:    0x1c2b4a,
  floorShine:   0x1e3060,
  skirting:     0x080f1a,

  // ── FIDS board ──
  fidsBack:     0x030810,
  fidsBorder:   0xfbbf24,
  fidsAmber:    0xfbbf24,
  fidsGreen:    0x22c55e,
  fidsRed:      0xef4444,
  fidsOrange:   0xf97316,
  fidsBlue:     0x60a5fa,
  fidsWhite:    0xf1f5f9,

  // ── Counters ──
  counterSurf:  0x1e3a5f,
  counterEdge:  0x2563eb,
  counterFront: 0x172b4d,

  // ── Gate / signs ──
  gateSign:     0x1e40af,
  gateText:     0x93c5fd,
  emergencyRed: 0xef4444,
  exitGreen:    0x16a34a,

  // ── Plane ──
  planeBody:    0xf1f5f9,
  planeWing:    0xdde3ea,
  planeStripe:  0x3b82f6,
  planeTail:    0xef4444,
  planeWindow:  0xbae6fd,
  engineNacelle:0xc8cdd4,

  // ── Ambient ──
  runwayLight:  0xfde68a,
  seating:      0x1e3a5f,
  seatingPad:   0x2563eb,
  kiosk:        0x1a2d42,
  plant1:       0x14532d,
  plant2:       0x166534,
}

// ─── Mock flight data ──────────────────────────────────────────────────────────
interface Flight {
  num: string; dest: string; time: string; gate: string
  status: 'ON TIME' | 'BOARDING' | 'DELAYED' | 'GATE CHANGE' | 'DEPARTED'
}

function _flightStatus(f: Flight): number {
  if (f.status === 'ON TIME')     return C.fidsGreen
  if (f.status === 'BOARDING')    return C.fidsAmber
  if (f.status === 'DELAYED')     return C.fidsRed
  if (f.status === 'GATE CHANGE') return C.fidsOrange
  return C.fidsBlue
}

// ─── Data loaded from airportData.json ────────────────────────────────────────
const FLIGHTS: Flight[] = airportData.flights.map(f => ({
  num:    f.flight_num,
  dest:   f.destination,
  time:   f.scheduled_departure,
  gate:   f.gate,
  status: f.status as Flight['status'],
}))

const PA_SCRIPTS = airportData.pa_scripts
  .filter(p => p.flight !== null)
  .map(p => ({ flight: p.flight as string, gate: p.gate as string, text: p.text }))

// ─── Agent definitions ─────────────────────────────────────────────────────────
const AGENTS_DEF = [
  { id: 'gate',    name: airportData.agents[0].name, role: airportData.agents[0].role, color: 0x3b82f6, desk: { x: 160, y: 270 }, skin: 0xfde68a, hair: 0x1c1917 },
  { id: 'ops',     name: airportData.agents[1].name, role: airportData.agents[1].role, color: 0xf59e0b, desk: { x: 400, y: 270 }, skin: 0xf5cba7, hair: 0x44403c },
  { id: 'service', name: airportData.agents[2].name, role: airportData.agents[2].role, color: 0xa855f7, desk: { x: 640, y: 270 }, skin: 0xd4a574, hair: 0xb45309 },
]

const IDLE_STATUS = `✈️  ${airportData.terminal.name} — ${airportData.weather.condition} · Wind ${airportData.weather.wind_dir}° ${airportData.weather.wind_kt}kt · ATIS ${airportData.weather.atis_code}`

const BRIEF_SEATS = [
  { x: 290, y: 385 }, { x: 400, y: 370 }, { x: 510, y: 385 },
]

const SPOTS = [
  { x: 90,  y: 415, name: airportData.services.lounges[0].name },
  { x: 740, y: 410, name: 'gate door'                          },
  { x: 310, y: 140, name: 'FIDS board'                         },
  { x: 550, y: 420, name: 'seating'                            },
  { x: 400, y: 445, name: airportData.terminal.terminal        },
  { x: 215, y: 415, name: 'check-in kiosk'                     },
]

const CHAT: Record<string, { work: string[]; idle: string[]; meet: string[] }> = {
  gate:    { work: airportData.agents[0].chat.work, idle: airportData.agents[0].chat.idle, meet: airportData.agents[0].chat.brief },
  ops:     { work: airportData.agents[1].chat.work, idle: airportData.agents[1].chat.idle, meet: airportData.agents[1].chat.brief },
  service: { work: airportData.agents[2].chat.work, idle: airportData.agents[2].chat.idle, meet: airportData.agents[2].chat.brief },
}

// ─── Humanoid Character ────────────────────────────────────────────────────────
class Character {
  scene: Phaser.Scene
  def: typeof AGENTS_DEF[0]

  root:     Phaser.GameObjects.Container
  shadow:   Phaser.GameObjects.Ellipse
  nameTag:  Phaser.GameObjects.Text

  legL!:   Phaser.GameObjects.Rectangle
  legR!:   Phaser.GameObjects.Rectangle
  shoe!:   Phaser.GameObjects.Rectangle
  shoeR!:  Phaser.GameObjects.Rectangle
  body!:   Phaser.GameObjects.Rectangle
  collar!: Phaser.GameObjects.Triangle
  armL!:   Phaser.GameObjects.Rectangle
  armR!:   Phaser.GameObjects.Rectangle
  handL!:  Phaser.GameObjects.Arc
  handR!:  Phaser.GameObjects.Arc
  neck!:   Phaser.GameObjects.Rectangle
  head!:   Phaser.GameObjects.Arc
  hairTop!:Phaser.GameObjects.Rectangle
  eyeL!:   Phaser.GameObjects.Arc
  eyeR!:   Phaser.GameObjects.Arc
  mouth!:  Phaser.GameObjects.Arc
  blush!:  Phaser.GameObjects.Arc

  bubble:    Phaser.GameObjects.Container
  bubbleBg:  Phaser.GameObjects.Rectangle
  bubbleTxt: Phaser.GameObjects.Text
  bubbleTail:Phaser.GameObjects.Triangle

  pos = { x: 0, y: 0 }
  walkPhase = Math.random() * Math.PI * 2
  moving = false
  state: 'sit' | 'stand' | 'walk' | 'meeting' = 'sit'
  dir: 'left' | 'right' = 'right'
  private _walkTween?: Phaser.Tweens.Tween
  private _bubTimer?: Phaser.Time.TimerEvent

  constructor(scene: Phaser.Scene, def: typeof AGENTS_DEF[0]) {
    this.scene = scene
    this.def = def

    this.shadow = scene.add.ellipse(def.desk.x, def.desk.y + 22, 28, 7, 0x000000, 0.4)
    this.root = scene.add.container(def.desk.x, def.desk.y)
    this._buildBody()

    const hex = '#' + def.color.toString(16).padStart(6, '0')
    this.nameTag = scene.add.text(def.desk.x, def.desk.y + 34, def.name, {
      fontSize: '11px', color: hex, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 1, color: '#000', blur: 4, fill: true },
    }).setOrigin(0.5)

    this.bubbleBg  = scene.add.rectangle(0, -64, 124, 28, 0x070e1e, 0.97).setStrokeStyle(1.5, def.color, 0.95)
    this.bubbleTxt = scene.add.text(0, -64, '', { fontSize: '9px', color: '#f1f5f9', align: 'center' }).setOrigin(0.5)
    this.bubbleTail = scene.add.triangle(0, -49, -5, 0, 5, 0, 0, 8, def.color, 0.95)
    this.bubble = scene.add.container(def.desk.x, def.desk.y, [this.bubbleBg, this.bubbleTxt, this.bubbleTail])
    this.bubble.setVisible(false)

    this.pos = { x: def.desk.x, y: def.desk.y }
    this._syncExtras()
  }

  private _buildBody() {
    const c = this.def.color
    const d = this._darken(c, 35)
    const s = this.def.skin
    const h = this.def.hair

    this.shoe  = this.scene.add.rectangle(-5, 24, 8, 5, 0x1c1917).setDepth(1)
    this.shoeR = this.scene.add.rectangle( 5, 24, 8, 5, 0x1c1917).setDepth(1)
    this.legL  = this.scene.add.rectangle(-5, 14, 7, 18, d)
    this.legR  = this.scene.add.rectangle( 5, 14, 7, 18, d)
    this.body  = this.scene.add.rectangle(0, -2, 22, 22, c)
    this.collar = this.scene.add.triangle(0, -11, -5, 0, 5, 0, 0, 8, s)
    this.armL  = this.scene.add.rectangle(-14, 0, 6, 16, d)
    this.armR  = this.scene.add.rectangle( 14, 0, 6, 16, d)
    this.handL = this.scene.add.circle(-14, 9, 3.5, s)
    this.handR = this.scene.add.circle( 14, 9, 3.5, s)
    this.neck  = this.scene.add.rectangle(0, -14, 6, 6, s)
    this.head  = this.scene.add.circle(0, -24, 12, s)
    this.hairTop = this.scene.add.rectangle(0, -32, 24, 8, h)
    this.eyeL  = this.scene.add.circle(-4, -25, 2.5, 0x111827)
    this.eyeR  = this.scene.add.circle( 4, -25, 2.5, 0x111827)
    this.mouth = this.scene.add.arc(0, -19, 3.5, 15, 165, false, 0x7c3aed, 0.7)
    this.blush = this.scene.add.circle(-9, -21, 3, 0xfda4af, 0.25)

    const parts: Phaser.GameObjects.GameObject[] = [
      this.shoe, this.shoeR, this.legL, this.legR,
      this.body, this.collar, this.armL, this.armR,
      this.handL, this.handR, this.neck, this.head,
      this.hairTop, this.eyeL, this.eyeR, this.mouth, this.blush,
    ]

    // Agent-specific accessories
    if (this.def.id === 'gate') {
      // Uniform cap
      const capBrim = this.scene.add.rectangle(0, -34, 28, 4, d)
      const capTop  = this.scene.add.rectangle(0, -37, 22, 5, c)
      const capBadge = this.scene.add.circle(0, -35, 3, 0xfde68a)
      // Radio on belt
      const radio = this.scene.add.rectangle(-18, 4, 6, 10, 0x374151).setStrokeStyle(1, 0x4b5563)
      parts.push(capBrim, capTop, capBadge, radio)
    }
    if (this.def.id === 'ops') {
      // Clipboard
      const clip  = this.scene.add.rectangle(18, 2, 10, 13, 0xf8fafc, 0.9).setStrokeStyle(1, 0xcbd5e1)
      const line1 = this.scene.add.rectangle(18, -1, 7, 1.5, 0x94a3b8, 0.6)
      const line2 = this.scene.add.rectangle(18,  2, 7, 1.5, 0x94a3b8, 0.6)
      const line3 = this.scene.add.rectangle(18,  5, 5, 1.5, 0x94a3b8, 0.6)
      // Headset
      const band  = this.scene.add.rectangle(0, -30, 20, 3, 0x374151)
      const earL  = this.scene.add.circle(-11, -28, 4, 0x374151)
      const earR  = this.scene.add.circle( 11, -28, 4, 0x374151)
      const mic   = this.scene.add.rectangle(-14, -22, 2, 8, 0x4b5563)
      parts.push(clip, line1, line2, line3, band, earL, earR, mic)
    }
    if (this.def.id === 'service') {
      // ID lanyard
      const lanyard = this.scene.add.rectangle(0, -5, 2, 8, 0xa855f7, 0.6)
      const badge   = this.scene.add.rectangle(0,  1, 8, 6, 0xf1f5f9).setStrokeStyle(1, 0x94a3b8)
      // Scarf
      const scarf   = this.scene.add.rectangle(0, -10, 12, 4, 0xa855f7, 0.8)
      parts.push(lanyard, badge, scarf)
    }

    this.root.add(parts)
  }

  private _darken(color: number, amount: number): number {
    const c = Phaser.Display.Color.IntegerToColor(color)
    c.darken(amount)
    return c.color
  }

  private _syncExtras() {
    this.shadow.setPosition(this.pos.x, this.pos.y + 22)
    this.nameTag.setPosition(this.pos.x, this.pos.y + 34)
    this.bubble.setPosition(this.pos.x, this.pos.y)
  }

  update(time: number, delta: number) {
    if (this.moving) {
      this.walkPhase += delta / 160
      const p = this.walkPhase * Math.PI * 2
      this.legL.y  = 14 + Math.sin(p) * 4
      this.legR.y  = 14 + Math.sin(p + Math.PI) * 4
      this.shoe.y  = 24 + Math.sin(p) * 4
      this.shoeR.y = 24 + Math.sin(p + Math.PI) * 4
      this.armL.x  = -14 + Math.sin(p + Math.PI) * 2
      this.armR.x  =  14 + Math.sin(p) * 2
      this.handL.x = -14 + Math.sin(p + Math.PI) * 2
      this.handR.x =  14 + Math.sin(p) * 2
      this.root.y  = this.pos.y + Math.abs(Math.sin(p * 2)) * -1.5
    } else if (this.state === 'sit') {
      const t = time / 300
      this.armL.y = 2 + Math.sin(t * 3) * 1.5
      this.armR.y = 2 + Math.sin(t * 3 + 0.7) * 1.5
      this.handL.y = 9 + Math.sin(t * 3) * 1.5
      this.handR.y = 9 + Math.sin(t * 3 + 0.7) * 1.5
      this.root.y = this.pos.y + Math.sin(time / 1800) * 0.8
    } else {
      this.root.y = this.pos.y + Math.sin(time / 1400) * 1.0
    }
    this._syncExtras()
  }

  walkTo(dest: { x: number; y: number }, onDone?: () => void) {
    this.state = 'walk'
    this.moving = true
    this.dir = dest.x < this.pos.x ? 'left' : 'right'
    this.root.setScale(this.dir === 'left' ? -1 : 1, 1)

    this._walkTween?.stop()
    const dist = Phaser.Math.Distance.Between(this.pos.x, this.pos.y, dest.x, dest.y)
    const dur  = Math.max((dist / 95) * 1000, 250)

    this._walkTween = this.scene.tweens.add({
      targets: this.pos,
      x: dest.x, y: dest.y,
      duration: dur, ease: 'Linear',
      onUpdate: () => {
        this.root.x = this.pos.x
        this.shadow.x = this.pos.x
      },
      onComplete: () => {
        this.pos.x = dest.x
        this.pos.y = dest.y
        this.root.setPosition(dest.x, dest.y)
        this.root.setScale(1, 1)
        this.moving = false
        this._resetLimbs()
        onDone?.()
      },
    })
  }

  private _resetLimbs() {
    this.legL.y = 14; this.legR.y = 14
    this.shoe.y = 24; this.shoeR.y = 24
    this.armL.x = -14; this.armR.x = 14
    this.armL.y = 0;  this.armR.y = 0
    this.handL.x = -14; this.handR.x = 14
    this.handL.y = 9;  this.handR.y = 9
  }

  say(text: string, duration = 2800) {
    this.bubbleTxt.setText(text)
    this.bubble.setVisible(true).setAlpha(1)
    this._bubTimer?.remove()
    this._bubTimer = this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: this.bubble, alpha: 0, duration: 400,
        onComplete: () => { this.bubble.setVisible(false); this.bubble.setAlpha(1) },
      })
    })
  }

  mute() {
    this.bubble.setVisible(false)
    this._bubTimer?.remove()
  }
}

// ─── Main Scene ────────────────────────────────────────────────────────────────
export class OfficeScene extends Phaser.Scene {
  private agents: Character[] = []
  private runCallback?: () => void
  private _voiceEnabled = true

  // Exterior animated objects
  private clouds:       Phaser.GameObjects.Rectangle[]  = []
  private runwayLights: Phaser.GameObjects.Arc[]        = []
  private plane!:       Phaser.GameObjects.Container
  private bagCart!:     Phaser.GameObjects.Container
  private planeFlying   = false

  // Interior animated objects
  private serverLEDs:   Phaser.GameObjects.Arc[]        = []
  private fidsTexts:    Phaser.GameObjects.Text[]       = []
  private monScreens:   Phaser.GameObjects.Rectangle[]  = []
  private ceilingLights:Phaser.GameObjects.Rectangle[]  = []

  // Clock
  private clockHand!:    Phaser.GameObjects.Line
  private clockMinHand!: Phaser.GameObjects.Line

  // HUD
  private statusBar!:   Phaser.GameObjects.Text
  private timeText!:    Phaser.GameObjects.Text
  private paPanel!:     Phaser.GameObjects.Container
  private paPanelTxt!:  Phaser.GameObjects.Text
  private agentTags:    Record<string, Phaser.GameObjects.Text> = {}

  private isRunning = false
  private fidsOffset = 0

  constructor() { super({ key: 'OfficeScene' }) }
  setRunCallback(cb: () => void)   { this.runCallback = cb }
  setVoiceEnabled(on: boolean)     { this._voiceEnabled = on; if (!on) stopSpeech() }
  triggerStandup()                 { this._runDeparture() }
  private async _say(text: string, agent: 'gate' | 'ops' | 'service' | 'narrator' | 'jason' = 'narrator') {
    if (this._voiceEnabled) await speak(text, agent)
  }

  // ── create ──────────────────────────────────────────────────────────────────
  create() {
    this._drawExterior()
    this._drawTerminalInterior()
    this._drawFIDS()
    this._drawCounters()
    this._drawAirportFurniture()
    this._buildPlane()
    this._buildBagCart()
    this._buildAgents()
    this._buildHUD()
    this._buildAmbient()
    this._startIdleLoop()
    this._scheduleLanding()
    this._schedulePAnnouncement()
  }

  // ── Exterior: sky, tarmac, runway, field ────────────────────────────────────
  private _drawExterior() {
    const g = this.add.graphics()

    // Sky gradient bands
    const skyBands = [
      [0, 0,    W, 20, 0x071540],
      [0, 20,   W, 20, 0x0d2560],
      [0, 40,   W, 18, 0x1556b8],
      [0, 58,   W, 16, 0x2b80d4],
      [0, 74,   W, 12, 0x3a9fd8],
    ]
    skyBands.forEach(([x, y, w, h, col]) => {
      g.fillStyle(col as number)
      g.fillRect(x as number, y as number, w as number, h as number)
    })

    // Sun glow (horizon right side)
    g.fillStyle(0xfde68a, 0.12)
    g.fillCircle(700, 72, 90)
    g.fillStyle(0xfde68a, 0.06)
    g.fillCircle(700, 72, 140)
    g.fillStyle(0xffd700, 0.25)
    g.fillCircle(700, 72, 32)
    g.fillStyle(0xffffff, 0.8)
    g.fillCircle(700, 72, 14)

    // Green field strip (where the plane lands)
    g.fillStyle(C.fieldDark)
    g.fillRect(0, 76, W, 14)
    g.fillStyle(C.fieldMid)
    g.fillRect(0, 79, W, 8)
    g.fillStyle(C.fieldLight)
    g.fillRect(0, 82, W, 5)
    g.fillStyle(C.fieldHighlight)
    g.fillRect(0, 84, W, 2)

    // Grass texture (subtle lines)
    g.lineStyle(1, C.fieldDark, 0.4)
    for (let x = 0; x < W; x += 18) {
      g.lineBetween(x, 76, x + 8, 86)
    }

    // Tarmac apron (behind field)
    g.fillStyle(C.tarmac)
    g.fillRect(0, 86, W, 22)

    // Tarmac surface texture
    g.lineStyle(1, 0x1e2228, 0.4)
    for (let x = 0; x < W; x += 55) {
      g.lineBetween(x, 86, x, 108)
    }
    g.lineBetween(0, 97, W, 97)

    // Runway (center strip on tarmac)
    g.fillStyle(C.runway)
    g.fillRect(100, 86, 500, 18)

    // Runway center dashes
    g.lineStyle(3, C.runwayCenter, 0.85)
    for (let x = 110; x < 590; x += 28) {
      g.lineBetween(x, 95, x + 16, 95)
    }

    // Runway edge stripes (yellow)
    g.lineStyle(2, C.tarmacLine, 0.7)
    g.lineBetween(100, 87, 600, 87)
    g.lineBetween(100, 103, 600, 103)

    // Threshold markings (bold whites)
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0xf5f0d8, 0.7)
      g.fillRect(105 + i * 8, 88, 4, 14)
      g.fillRect(570 - i * 8, 88, 4, 14)
    }

    // Runway edge lights
    for (let x = 100; x <= 600; x += 40) {
      const led = this.add.circle(x, 86, 2, C.runwayLight, 0.8)
      this.runwayLights.push(led)
      const led2 = this.add.circle(x, 104, 2, C.runwayLight, 0.8)
      this.runwayLights.push(led2)
    }

    // Parked aircraft silhouette (far right, stationary)
    this._drawParkedPlane(g, 690, 87)

    // Moving clouds
    const cloudData = [
      { x: 80,  y: 28, w: 55, h: 10 },
      { x: 260, y: 18, w: 70, h: 12 },
      { x: 460, y: 32, w: 45, h: 8  },
      { x: 620, y: 22, w: 60, h: 11 },
    ]
    cloudData.forEach(cd => {
      const cloud = this.add.rectangle(cd.x, cd.y, cd.w, cd.h, 0x2060b0, 0.35)
      this.clouds.push(cloud)
    })
    // Second layer brighter clouds
    const cloudData2 = [
      { x: 150, y: 40, w: 40, h: 7 },
      { x: 350, y: 45, w: 50, h: 8 },
      { x: 540, y: 38, w: 35, h: 6 },
    ]
    cloudData2.forEach(cd => {
      const cloud = this.add.rectangle(cd.x, cd.y, cd.w, cd.h, 0x4090cc, 0.25)
      this.clouds.push(cloud)
    })
  }

  private _drawParkedPlane(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    // Simple silhouette of parked wide-body, facing right
    g.fillStyle(0xdde3ea, 0.55)
    g.fillRoundedRect(x - 55, y - 5, 110, 9, 3)       // fuselage
    g.fillStyle(0xccd2d8, 0.45)
    g.fillTriangle(x + 55, y, x + 55, y - 4, x + 70, y - 1)  // nose
    // wings
    g.fillTriangle(x - 10, y - 4, x + 15, y - 4, x - 20, y - 18)
    g.fillTriangle(x - 10, y + 5, x + 15, y + 5, x - 20, y + 17)
    // tail
    g.fillTriangle(x - 50, y - 4, x - 40, y - 4, x - 50, y - 13)
    // engine
    g.fillStyle(0xb0b8c0, 0.4)
    g.fillEllipse(x - 5, y - 15, 14, 6)
  }

  // ── Terminal interior ────────────────────────────────────────────────────────
  private _drawTerminalInterior() {
    const g = this.add.graphics()

    // Terminal wall (below windows)
    g.fillStyle(C.wallMid)
    g.fillRect(0, EXT_BOT, W, 55)

    // Window frames across the wall top
    this._drawWindowFrames(g)

    // Wall accent stripe
    g.lineStyle(3, 0x1e3a5f, 0.6)
    g.lineBetween(0, EXT_BOT + 54, W, EXT_BOT + 54)

    // Ceiling
    g.fillStyle(C.ceiling)
    g.fillRect(0, FLOOR_Y, W, 22)

    // Ceiling recessed lights
    const lightPositions = [80, 200, 320, 440, 560, 680, 770]
    lightPositions.forEach(lx => {
      g.fillStyle(0x0a1628)
      g.fillRect(lx - 12, FLOOR_Y + 1, 24, 12)
      // warm glow
      const light = this.add.rectangle(lx, FLOOR_Y + 7, 20, 9, C.ceilingLight, 0.6)
      this.ceilingLights.push(light)
      // light beam cone
      g.fillStyle(C.ceilingLight, 0.03)
      g.fillTriangle(lx - 10, FLOOR_Y + 13, lx + 10, FLOOR_Y + 13, lx, FLOOR_Y + 70)
    })

    // Terminal floor tiles
    g.fillStyle(C.floor)
    g.fillRect(0, FLOOR_Y + 22, W, HUD_Y - FLOOR_Y - 22)

    // Floor tile grid
    g.lineStyle(1, C.floorLine, 0.35)
    for (let x = 0; x <= W; x += 50) g.lineBetween(x, FLOOR_Y + 22, x, HUD_Y)
    for (let y = FLOOR_Y + 22; y <= HUD_Y; y += 50) g.lineBetween(0, y, W, y)

    // Floor shine strips (diagonal reflections)
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0xffffff, 0.02)
      g.fillRect(50 + i * 160, FLOOR_Y + 22, 12, HUD_Y - FLOOR_Y - 22)
    }

    // Floor carpet runner (center concourse)
    g.fillStyle(0x1a2d50, 0.6)
    g.fillRect(100, 370, 600, 60)
    g.lineStyle(2, 0x2563eb, 0.25)
    g.strokeRect(100, 370, 600, 60)

    // Skirting board
    g.fillStyle(C.skirting)
    g.fillRect(0, HUD_Y, W, H - HUD_Y)
    g.lineStyle(1, 0x1e3a5f, 0.4)
    g.lineBetween(0, HUD_Y, W, HUD_Y)

    // Gate signs (hanging from ceiling)
    this._drawGateSigns(g)

    // Wall clock
    this._drawClock(g, W - 80, EXT_BOT + 28)
  }

  private _drawWindowFrames(g: Phaser.GameObjects.Graphics) {
    // Large panoramic windows looking out to tarmac
    const winPositions = [40, 165, 290, 415, 540, 680]
    winPositions.forEach(x => {
      const ww = 110, wh = 50
      const wy = EXT_BOT + 2
      // Outer frame
      g.fillStyle(0x0a1220)
      g.fillRoundedRect(x - 2, wy - 2, ww + 4, wh + 4, 3)
      // Glass pane (semi-transparent tint)
      g.fillStyle(0x0ea5e9, 0.04)
      g.fillRect(x, wy, ww, wh)
      // Frame divider
      g.lineStyle(2, 0x0a1628, 0.9)
      g.lineBetween(x + ww / 2, wy, x + ww / 2, wy + wh)
      g.lineBetween(x, wy + wh / 2, x + ww, wy + wh / 2)
      // Window ledge
      g.fillStyle(0x0a1628)
      g.fillRect(x - 3, wy + wh, ww + 6, 5)
      // Reflection glint
      g.fillStyle(0xffffff, 0.06)
      g.fillRoundedRect(x + 2, wy + 2, 18, wh - 4, 2)
    })
  }

  private _drawGateSigns(g: Phaser.GameObjects.Graphics) {
    const signs = [
      { x: 155, label: 'B7 →', sub: 'GATE' },
      { x: 400, label: 'A12', sub: 'OPS CENTER' },
      { x: 645, label: '← C3', sub: 'GATE' },
    ]
    signs.forEach(s => {
      g.fillStyle(C.gateSign)
      g.fillRoundedRect(s.x - 42, FLOOR_Y - 5, 84, 22, 4)
      g.lineStyle(1.5, 0x3b82f6, 0.5)
      g.strokeRoundedRect(s.x - 42, FLOOR_Y - 5, 84, 22, 4)
      this.add.text(s.x, FLOOR_Y + 6, s.label, {
        fontSize: '10px', fontStyle: 'bold', color: '#93c5fd',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5)
    })
  }

  private _drawClock(g: Phaser.GameObjects.Graphics, cx: number, cy: number) {
    g.fillStyle(0x0a1628)
    g.fillCircle(cx, cy, 22)
    g.lineStyle(2, 0x2563eb)
    g.strokeCircle(cx, cy, 22)
    g.lineStyle(1, 0x1e3a5f, 0.5)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2
      g.lineBetween(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17, cx + Math.cos(a) * 21, cy + Math.sin(a) * 21)
    }
    this.clockHand    = this.add.line(cx, cy, 0, 0, 0, -14, 0xe2e8f0).setLineWidth(2).setOrigin(0, 0)
    this.clockMinHand = this.add.line(cx, cy, 0, 0, 0, -10, 0x93c5fd).setLineWidth(1.5).setOrigin(0, 0)
    // Center dot
    this.add.circle(cx, cy, 3, 0xfbbf24)
  }

  // ── FIDS Departure Board ─────────────────────────────────────────────────────
  private _drawFIDS() {
    const g = this.add.graphics()
    const bx = 30, by = EXT_BOT + 2, bw = 560, bh = 52

    // Board background
    g.fillStyle(C.fidsBack)
    g.fillRoundedRect(bx, by, bw, bh, 4)
    g.lineStyle(2, C.fidsBorder, 0.8)
    g.strokeRoundedRect(bx, by, bw, bh, 4)

    // Title bar
    g.fillStyle(0xfbbf24, 0.12)
    g.fillRect(bx + 2, by + 2, bw - 4, 14)

    // Header texts
    this.add.text(bx + 10, by + 9, 'DEPARTURES', {
      fontSize: '9px', fontStyle: 'bold', color: '#fbbf24',
    }).setOrigin(0, 0.5)

    const cols = ['FLIGHT', 'DESTINATION', 'TIME ', 'GATE', 'STATUS']
    const colX = [bx + 10, bx + 88, bx + 310, bx + 380, bx + 430]
    cols.forEach((col, i) => {
      this.add.text(colX[i], by + 9, col, {
        fontSize: '7px', color: '#94a3b8',
      }).setOrigin(0, 0.5)
    })

    // Divider line
    g.lineStyle(1, 0x1e3a5f, 0.6)
    g.lineBetween(bx + 4, by + 17, bx + bw - 4, by + 17)

    // Flight rows (3 rows visible at once, scrolling)
    for (let row = 0; row < 3; row++) {
      const ry = by + 20 + row * 11
      const rowTxts: Phaser.GameObjects.Text[] = []

      const f = FLIGHTS[row]
      const statusCol = '#' + _flightStatus(f).toString(16).padStart(6, '0')

      rowTxts.push(this.add.text(colX[0], ry, f.num,   { fontSize: '8px', color: '#f1f5f9', fontStyle: 'bold' }).setOrigin(0, 0.5))
      rowTxts.push(this.add.text(colX[1], ry, f.dest,  { fontSize: '8px', color: '#cbd5e1' }).setOrigin(0, 0.5))
      rowTxts.push(this.add.text(colX[2], ry, f.time,  { fontSize: '8px', color: '#f1f5f9', fontStyle: 'bold' }).setOrigin(0, 0.5))
      rowTxts.push(this.add.text(colX[3], ry, f.gate,  { fontSize: '8px', color: '#93c5fd' }).setOrigin(0, 0.5))
      rowTxts.push(this.add.text(colX[4], ry, f.status, { fontSize: '8px', color: statusCol, fontStyle: 'bold' }).setOrigin(0, 0.5))
      rowTxts.forEach(t => this.fidsTexts.push(t))
    }

    // FIDS blinking dot (top-right of board)
    const blink = this.add.circle(bx + bw - 10, by + 9, 3, 0x22c55e)
    this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => blink.setAlpha(blink.alpha > 0.5 ? 0.2 : 1),
    })
  }

  // ── Agent counters ───────────────────────────────────────────────────────────
  private _drawCounters() {
    AGENTS_DEF.forEach(a => this._drawCounter(a.desk.x, a.desk.y, a.color, a.role))
  }

  private _drawCounter(x: number, y: number, color: number, role: string) {
    const g = this.add.graphics()
    // Counter shadow
    g.fillStyle(0x000000, 0.35)
    g.fillRoundedRect(x - 67, y + 14, 134, 60, 5)
    // Counter surface
    g.fillStyle(C.counterSurf)
    g.fillRoundedRect(x - 68, y - 10, 136, 58, 6)
    // Counter top edge
    g.fillStyle(C.counterEdge)
    g.fillRoundedRect(x - 68, y - 10, 136, 5, { tl: 6, tr: 6, bl: 0, br: 0 })
    // Counter front panel
    g.fillStyle(C.counterFront)
    g.fillRoundedRect(x - 68, y + 42, 136, 18, { tl: 0, tr: 0, bl: 4, br: 4 })
    // Airline logo bar
    g.fillStyle(color, 0.25)
    g.fillRect(x - 64, y + 42, 128, 18)
    g.lineStyle(1, color, 0.4)
    g.lineBetween(x - 64, y + 42, x + 64, y + 42)

    // Counter legs
    g.fillStyle(0x0f1e30)
    g.fillRect(x - 60, y + 57, 8, 25)
    g.fillRect(x + 52, y + 57, 8, 25)

    // Monitor on counter
    const monArm = g
    monArm.fillStyle(0x0a1628)
    monArm.fillRect(x - 2, y - 22, 3, 16)
    monArm.fillRect(x - 16, y - 24, 32, 3)
    g.fillStyle(0x070e1a)
    g.fillRoundedRect(x - 32, y - 65, 64, 44, 5)
    g.lineStyle(1.5, color, 0.5)
    g.strokeRoundedRect(x - 32, y - 65, 64, 44, 5)
    // Monitor screen (animated)
    const screen = this.add.rectangle(x, y - 44, 55, 36, 0x071324)
    this.monScreens.push(screen)

    // Keyboard
    g.fillStyle(0x1a2d3d)
    g.fillRoundedRect(x - 30, y + 15, 60, 14, 3)
    g.fillStyle(0x243f5a, 0.7)
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 9; col++)
        g.fillRoundedRect(x - 28 + col * 7, y + 17 + row * 4, 5.5, 3, 1)

    // Scanner device
    g.fillStyle(0x0a1628)
    g.fillRoundedRect(x + 36, y + 8, 18, 22, 3)
    g.fillStyle(0xef4444, 0.6)
    g.fillRect(x + 39, y + 20, 12, 4)

    // Role label on counter front
    this.add.text(x, y + 51, role.toUpperCase(), {
      fontSize: '7px', color: '#' + color.toString(16).padStart(6, '0'),
      fontStyle: 'bold', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5)

    // Chair behind counter
    g.fillStyle(0x1e293b)
    g.fillRoundedRect(x - 18, y + 80, 36, 20, 3)
    g.fillStyle(0x2d3748)
    g.fillRoundedRect(x - 16, y + 82, 32, 16, 2)
    g.fillStyle(0x1e293b)
    g.fillRect(x - 2, y + 98, 4, 12)
    g.fillEllipse(x, y + 110, 32, 8)
    g.fillRect(x - 18, y + 60, 4, 24)
    g.fillRect(x + 14, y + 60, 4, 24)
  }

  // ── Airport furniture & atmosphere ──────────────────────────────────────────
  private _drawAirportFurniture() {
    // Departure lounge seating (left)
    this._drawSeatingBlock(90, 415, 4)
    // Seating block (center-right)
    this._drawSeatingBlock(560, 418, 3)
    // Self-check-in kiosk
    this._drawKiosk(215, 410)
    // Coffee cart
    this._drawCoffeeCafe(740, 400)
    // Security arch (far right, decorative)
    this._drawSecurityArch(780, 280)
    // Corner plants
    ;[28, 792].forEach(x => this._drawPlant(x, EXT_BOT + 24))
    ;[28, 792].forEach(x => this._drawPlant(x, HUD_Y - 50))
    // Server/networking rack (operations)
    this._drawNetworkRack(768, FLOOR_Y + 30)
    // Railing / safety line
    this._drawConcourseRailing()
  }

  private _drawSeatingBlock(cx: number, cy: number, seats: number) {
    const g = this.add.graphics()
    const sw = seats * 32
    // Base
    g.fillStyle(0x111e35)
    g.fillRoundedRect(cx - sw / 2 - 4, cy - 18, sw + 8, 36, 5)
    // Seats
    for (let i = 0; i < seats; i++) {
      const sx = cx - sw / 2 + i * 32 + 8
      g.fillStyle(C.seating)
      g.fillRoundedRect(sx, cy - 14, 24, 28, 4)
      g.fillStyle(C.seatingPad)
      g.fillRoundedRect(sx + 2, cy - 12, 20, 16, 3)
      // Armrests
      g.fillStyle(0x111e35)
      g.fillRect(sx - 1, cy - 15, 3, 20)
      if (i === seats - 1) g.fillRect(sx + 22, cy - 15, 3, 20)
    }
    // Support leg
    g.fillStyle(0x0a1628)
    g.fillRect(cx - 3, cy + 18, 6, 8)
    g.fillEllipse(cx, cy + 26, sw * 0.6, 6)
  }

  private _drawKiosk(x: number, y: number) {
    const g = this.add.graphics()
    g.fillStyle(C.kiosk)
    g.fillRoundedRect(x - 22, y - 50, 44, 62, 4)
    g.fillStyle(0x0ea5e9, 0.15)
    g.fillRect(x - 18, y - 46, 36, 38)
    g.lineStyle(2, 0x0ea5e9, 0.5)
    g.strokeRect(x - 18, y - 46, 36, 38)
    // Screen content (fake UI)
    g.lineStyle(1, 0x0ea5e9, 0.4)
    g.lineBetween(x - 14, y - 38, x + 14, y - 38)
    g.lineBetween(x - 14, y - 30, x + 14, y - 30)
    g.lineBetween(x - 14, y - 22, x + 14, y - 22)
    g.fillStyle(0x0ea5e9, 0.3)
    g.fillRect(x - 10, y - 14, 20, 8)
    this.add.text(x, y + 16, 'CHECK-IN', { fontSize: '7px', color: '#0ea5e9', fontStyle: 'bold' }).setOrigin(0.5)
  }

  private _drawCoffeeCafe(x: number, y: number) {
    const g = this.add.graphics()
    // Counter
    g.fillStyle(0x1a2d42)
    g.fillRoundedRect(x - 42, y - 25, 70, 50, 5)
    g.fillStyle(0x243b6e)
    g.fillRect(x - 42, y - 25, 70, 4)
    // Espresso machine
    g.fillStyle(0x0a1628)
    g.fillRoundedRect(x - 36, y - 44, 38, 28, 5)
    g.fillStyle(0xf59e0b, 0.2)
    g.fillRect(x - 32, y - 40, 28, 18)
    g.fillStyle(0xf59e0b)
    g.fillCircle(x - 18, y - 22, 5)
    // Cup
    g.fillStyle(0xfef3c7, 0.9)
    g.fillRect(x + 12, y - 18, 14, 18)
    g.fillStyle(0x78350f, 0.5)
    g.fillRect(x + 12, y - 18, 14, 4)
    this.add.text(x - 7, y + 32, '☕ Café Terminal', { fontSize: '7px', color: '#78350f' }).setOrigin(0.5)
  }

  private _drawSecurityArch(x: number, y: number) {
    const g = this.add.graphics()
    g.fillStyle(0x0a1628)
    g.fillRect(x - 30, y, 6, 90)
    g.fillRect(x + 24, y, 6, 90)
    g.fillRect(x - 30, y, 60, 7)
    g.fillStyle(0xef4444, 0.4)
    g.fillRect(x - 24, y + 8, 48, 4)
    g.fillStyle(0x22c55e)
    g.fillCircle(x + 28, y + 4, 3)
    this.add.text(x, y + 98, 'SECURITY', { fontSize: '7px', color: '#374151' }).setOrigin(0.5)
  }

  private _drawPlant(x: number, y: number) {
    const g = this.add.graphics()
    g.fillStyle(0x1a1512)
    g.fillRect(x - 10, y + 8, 20, 16)
    g.fillStyle(C.plant1)
    g.fillCircle(x, y, 14)
    g.fillStyle(C.plant2)
    g.fillCircle(x - 10, y - 8, 10)
    g.fillCircle(x + 10, y - 8, 10)
    g.fillStyle(0x15803d)
    g.fillCircle(x - 4, y - 16, 7)
    g.fillCircle(x + 4, y - 16, 7)
    g.fillStyle(0xbbf7d0, 0.3)
    g.fillCircle(x + 5, y - 5, 3)
  }

  private _drawNetworkRack(x: number, y: number) {
    const g = this.add.graphics()
    g.fillStyle(0x050e1a)
    g.fillRoundedRect(x - 22, y, 44, 130, 4)
    g.lineStyle(1.5, 0x1e3a5f, 0.6)
    g.strokeRoundedRect(x - 22, y, 44, 130, 4)
    for (let i = 0; i < 7; i++) {
      g.fillStyle(i % 3 === 0 ? 0x1e3a5f : 0x0a1628)
      g.fillRoundedRect(x - 19, y + 5 + i * 17, 38, 13, 2)
      const led = this.add.circle(x + 13, y + 11 + i * 17, 2.5, i % 2 === 0 ? 0x22c55e : 0x3b82f6)
      this.serverLEDs.push(led)
    }
  }

  private _drawConcourseRailing() {
    const g = this.add.graphics()
    // Low railing separating gate area from concourse
    g.lineStyle(2, 0x1e3a5f, 0.5)
    g.lineBetween(0, 360, W, 360)
    // Railing posts
    for (let x = 40; x < W; x += 80) {
      g.fillStyle(0x1e3a5f, 0.5)
      g.fillRect(x - 1, 355, 3, 12)
    }
  }

  // ── Plane (landing animation) ────────────────────────────────────────────────
  private _buildPlane() {
    const g = this.add.graphics()

    // Fuselage — main body (pointing RIGHT, nose at +x)
    g.fillStyle(C.planeBody)
    g.fillRoundedRect(-55, -5, 110, 10, 4)

    // Nose cone
    g.fillStyle(0xdde3ea)
    g.fillTriangle(55, -4, 55, 4, 70, 0)

    // Upper wing (swept back from ~x=-5 to tip at (-30, -24))
    g.fillStyle(C.planeWing)
    g.fillTriangle(-5, -5, 20, -5, -30, -24)
    g.fillTriangle(-5, -5, -30, -24, -35, -20)

    // Lower wing (mirror)
    g.fillTriangle(-5, 5, 20, 5, -30, 24)
    g.fillTriangle(-5, 5, -30, 24, -35, 20)

    // Winglets
    g.fillStyle(0xc8cdd4)
    g.fillRect(-36, -25, 3, 7)
    g.fillRect(-36, 19, 3, 7)

    // Horizontal stabiliser
    g.fillStyle(C.planeWing)
    g.fillTriangle(-42, -4, -28, -4, -44, -13)
    g.fillTriangle(-42,  4, -28,  4, -44,  13)

    // Vertical tail fin
    g.fillStyle(C.planeTail)
    g.fillTriangle(-50, -4, -38, -4, -48, -20)

    // Engine nacelles (under wings)
    g.fillStyle(C.engineNacelle)
    g.fillEllipse(-12, -17, 14, 6)
    g.fillEllipse(-12,  17, 14, 6)

    // Airline stripe along fuselage
    g.fillStyle(C.planeStripe, 0.85)
    g.fillRect(-50, -2, 100, 3)

    // Windows
    g.fillStyle(C.planeWindow, 0.9)
    for (let i = 0; i < 8; i++) g.fillRect(-38 + i * 11, -4, 6, 3)

    // Undercarriage (landing gear) — small wheels
    g.fillStyle(0x374151)
    g.fillRect(-5, 5, 3, 10)
    g.fillRect(-20, 5, 3, 10)
    g.fillRect(-5, 15, 7, 4)
    g.fillRect(-22, 15, 7, 4)

    // Container starts off-screen top-right, facing left (scaleX=-1)
    this.plane = this.add.container(900, 35, [g])
    this.plane.setScale(-0.35, 0.35)
    this.plane.setAlpha(0)
    this.plane.setDepth(10)
  }

  // ── Baggage cart ─────────────────────────────────────────────────────────────
  private _buildBagCart() {
    const g = this.add.graphics()
    // Tractor body
    g.fillStyle(0xf59e0b, 0.85)
    g.fillRoundedRect(-25, -8, 28, 14, 3)
    // Cab
    g.fillStyle(0x92400e)
    g.fillRoundedRect(-10, -14, 14, 10, 2)
    // Trailer
    g.fillStyle(0x374151)
    g.fillRect(3, -6, 30, 10)
    // Bags
    g.fillStyle(0x1e3a5f)
    g.fillRoundedRect(5, -10, 10, 8, 2)
    g.fillStyle(0xef4444, 0.7)
    g.fillRoundedRect(17, -10, 10, 8, 2)
    g.fillStyle(0x22c55e, 0.7)
    g.fillRoundedRect(5, -4, 10, 8, 2)
    // Wheels
    g.fillStyle(0x111827)
    g.fillCircle(-18, 6, 5)
    g.fillCircle(0, 6, 5)
    g.fillCircle(12, 6, 4)
    g.fillCircle(28, 6, 4)

    this.bagCart = this.add.container(200, 93, [g])
    this.bagCart.setScale(0.8)
    this.bagCart.setDepth(3)
    this.bagCart.setAlpha(0.9)
  }

  // ── Agents ───────────────────────────────────────────────────────────────────
  private _buildAgents() {
    AGENTS_DEF.forEach(def => this.agents.push(new Character(this, def)))
  }

  // ── HUD ──────────────────────────────────────────────────────────────────────
  private _buildHUD() {
    const g = this.add.graphics()
    g.fillStyle(0x040b18, 0.97)
    g.fillRect(0, HUD_Y, W, H - HUD_Y)
    g.lineStyle(1, 0x1e3a5f)
    g.lineBetween(0, HUD_Y, W, HUD_Y)

    this.statusBar = this.add.text(12, HUD_Y + 22, IDLE_STATUS, {
      fontSize: '11px', color: '#64748b',
    }).setOrigin(0, 0.5)

    this.timeText = this.add.text(W - 190, HUD_Y + 22, '', {
      fontSize: '11px', color: '#334155', fontStyle: 'bold',
    }).setOrigin(0, 0.5)

    // Agent status tags
    AGENTS_DEF.forEach(def => {
      const hex = '#' + def.color.toString(16).padStart(6, '0')
      const tag = this.add.text(def.desk.x, EXT_BOT + 28, `● ${def.name}`, {
        fontSize: '10px', color: hex, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
        shadow: { offsetX: 0, offsetY: 1, color: '#000', blur: 4, fill: true },
      }).setOrigin(0.5)
      this.agentTags[def.id] = tag
    })

    // PA announcement panel (hidden by default)
    const paBg = this.add.rectangle(0, 0, 520, 36, 0x030810, 0.97)
      .setStrokeStyle(1.5, 0xfbbf24, 0.9)
    this.paPanelTxt = this.add.text(0, 0, '', {
      fontSize: '9px', color: '#fef3c7', align: 'center', wordWrap: { width: 500 },
    }).setOrigin(0.5)
    this.paPanel = this.add.container(W / 2, HUD_Y + 22, [paBg, this.paPanelTxt])
    this.paPanel.setVisible(false)
    this.paPanel.setDepth(20)
  }

  private _setTag(id: string, status: string, active = false) {
    const def = AGENTS_DEF.find(d => d.id === id)!
    const t = this.agentTags[id]
    t.setText(`● ${def.name} — ${status}`)
    const hex = '#' + def.color.toString(16).padStart(6, '0')
    t.setColor(active ? hex : '#475569')
    t.setAlpha(active ? 1 : 0.6)
  }

  private _showPA(text: string) {
    this.paPanelTxt.setText('🔊  ' + text)
    this.paPanel.setVisible(true).setAlpha(1)
    this.time.delayedCall(8000, () => {
      this.tweens.add({
        targets: this.paPanel, alpha: 0, duration: 600,
        onComplete: () => this.paPanel.setVisible(false).setAlpha(1),
      })
    })
  }

  // ── Ambient animations ────────────────────────────────────────────────────────
  private _buildAmbient() {
    this.time.addEvent({ delay: 1000,  loop: true, callback: this._tickClock,      callbackScope: this })
    this.time.addEvent({ delay: 900,   loop: true, callback: this._blinkLEDs,      callbackScope: this })
    this.time.addEvent({ delay: 3500,  loop: true, callback: this._cycleScreens,   callbackScope: this })
    this.time.addEvent({ delay: 75,    loop: true, callback: this._driftClouds,    callbackScope: this })
    this.time.addEvent({ delay: 1000,  loop: true, callback: this._updateClock,    callbackScope: this })
    this.time.addEvent({ delay: 800,   loop: true, callback: this._pulseLights,    callbackScope: this })
    this.time.addEvent({ delay: 120,   loop: true, callback: this._moveBagCart,    callbackScope: this })
    this.time.addEvent({ delay: 9000,  loop: true, callback: this._scrollFIDS,     callbackScope: this })
  }

  private _tickClock() {
    const now = new Date()
    const min = now.getMinutes()
    const hr  = now.getHours() % 12
    const minAngle = (min / 60) * Math.PI * 2 - Math.PI / 2
    const hrAngle  = ((hr + min / 60) / 12) * Math.PI * 2 - Math.PI / 2
    this.clockHand.setTo(0, 0, Math.cos(hrAngle) * 14, Math.sin(hrAngle) * 14)
    this.clockMinHand.setTo(0, 0, Math.cos(minAngle) * 10, Math.sin(minAngle) * 10)
  }

  private _blinkLEDs() {
    this.serverLEDs.forEach((led, i) => {
      if (Math.random() > 0.65) {
        const on = Math.random() > 0.25
        led.setFillStyle(i % 2 === 0 ? (on ? 0x22c55e : 0x14532d) : (on ? 0x3b82f6 : 0x1d4ed8))
      }
    })
    this.runwayLights.forEach(led => {
      if (Math.random() > 0.92) led.setAlpha(led.alpha > 0.6 ? 0.3 : 0.9)
    })
  }

  private _cycleScreens() {
    const colors = [0x0d2137, 0x071a2e, 0x0a2744, 0x031020, 0x0f1e38]
    this.monScreens.forEach(s => {
      this.tweens.add({
        targets: s,
        fillColor: colors[Math.floor(Math.random() * colors.length)],
        duration: 600,
      })
    })
  }

  private _driftClouds() {
    this.clouds.forEach((cloud, i) => {
      const speed = i < 4 ? 0.10 : 0.06
      cloud.x += speed
      if (cloud.x > W + 60) cloud.x = -60
    })
  }

  private _updateClock() {
    const now = new Date()
    this.timeText.setText('✈ ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  }

  private _pulseLights() {
    this.ceilingLights.forEach((l, i) => {
      l.setAlpha(0.5 + Math.sin(Date.now() / 2000 + i * 0.8) * 0.15)
    })
  }

  private _moveBagCart() {
    this.bagCart.x += 0.55
    if (this.bagCart.x > W + 80) {
      this.bagCart.x = -80
    }
  }

  private _scrollFIDS() {
    this.fidsOffset = (this.fidsOffset + 1) % FLIGHTS.length
    for (let row = 0; row < 3; row++) {
      const f = FLIGHTS[(this.fidsOffset + row) % FLIGHTS.length]
      const statusCol = '#' + _flightStatus(f).toString(16).padStart(6, '0')
      const base = row * 5
      this.fidsTexts[base + 0].setText(f.num)
      this.fidsTexts[base + 1].setText(f.dest)
      this.fidsTexts[base + 2].setText(f.time)
      this.fidsTexts[base + 3].setText(f.gate)
      this.fidsTexts[base + 4].setText(f.status).setColor(statusCol)
    }
  }

  // ── Landing animation ─────────────────────────────────────────────────────────
  private _scheduleLanding() {
    // First landing after 4s
    this.time.delayedCall(4000, () => this._launchLanding())
    // Repeat every 28s
    this.time.addEvent({ delay: 28000, loop: true, callback: () => this._launchLanding() })
  }

  private _launchLanding() {
    if (this.planeFlying) return
    this.planeFlying = true

    this.plane.setPosition(920, 30)
    this.plane.setScale(-0.3, 0.3)
    this.plane.setAlpha(0)

    // Approach tween: descend from top-right across the sky
    this.tweens.add({
      targets: this.plane,
      x: 120, y: 83,
      scaleX: -0.75, scaleY: 0.75,
      alpha: 1,
      duration: 8500,
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        // Gradually tilt nose down (simulate descent angle)
        const progress = 1 - (this.plane.x - 120) / (920 - 120)
        this.plane.setAngle(-Phaser.Math.Interpolation.Linear([-8, 0], progress))
      },
      onComplete: () => {
        // Touchdown: plane levels out and decelerates along runway
        this.plane.setAngle(0)
        this.tweens.add({
          targets: this.plane,
          x: -120, y: 90,
          duration: 4500,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.plane.setAlpha(0)
            this.plane.setPosition(920, 30)
            this.plane.setScale(-0.3, 0.3)
            this.planeFlying = false
          },
        })
      },
    })

    // Status announcement on landing
    this.time.delayedCall(2000, () => {
      const f = FLIGHTS[Math.floor(Math.random() * FLIGHTS.length)]
      this.statusBar.setText(`🛬  ${f.num} from ${f.dest.split(' ')[0]} approaching runway 27L`)
    })
    this.time.delayedCall(8800, () => {
      this.statusBar.setText(IDLE_STATUS)
    })
  }

  // ── Jason PA announcements ────────────────────────────────────────────────────
  private _schedulePAnnouncement() {
    // First announcement 12s after load
    this.time.delayedCall(12000, () => this._makePA())
    // Repeat every 25s
    this.time.addEvent({ delay: 25000, loop: true, callback: () => this._makePA() })
  }

  private async _makePA() {
    if (this.isRunning) return
    const script = PA_SCRIPTS[Math.floor(Math.random() * PA_SCRIPTS.length)]
    const f = FLIGHTS.find(f => f.num === script.flight)!

    this._showPA(`Flight ${script.flight} → ${f.dest} | Gate ${script.gate} | ${f.status}`)
    this.statusBar.setText(`🔊  Jason: "${script.text.slice(0, 72)}..."`)

    // All agents react
    const reactionMsgs = ['🔊 PA announcement', '📢 Gate B7!', '✈ Flight update!']
    this.agents.forEach((a, i) => {
      this.time.delayedCall(i * 400, () => {
        a.say(reactionMsgs[i % reactionMsgs.length], 3000)
        this._setTag(a.def.id, 'PA alert', true)
      })
    })

    await this._say(script.text, 'jason')

    this.time.delayedCall(1000, () => {
      this.statusBar.setText(IDLE_STATUS)
      AGENTS_DEF.forEach(d => this._setTag(d.id, 'on duty', true))
    })
  }

  // ── Idle loop ──────────────────────────────────────────────────────────────────
  private _startIdleLoop() {
    // Chat bubbles at counters
    this.time.addEvent({
      delay: 3400, loop: true, callback: () => {
        if (this.isRunning) return
        this.agents.forEach(a => {
          if (!a.moving && a.state === 'sit' && Math.random() > 0.5) {
            const msgs = CHAT[a.def.id].work
            a.say(msgs[Math.floor(Math.random() * msgs.length)], 2600)
            this._setTag(a.def.id, 'on duty', true)
          }
        })
      },
    })

    // Agents wander the terminal
    this.time.addEvent({
      delay: 6000, loop: true, callback: () => {
        if (this.isRunning) return
        const agent = this.agents[Math.floor(Math.random() * this.agents.length)]
        if (agent.moving) return
        const spot = SPOTS[Math.floor(Math.random() * SPOTS.length)]
        const dest = { x: spot.x + (Math.random() - 0.5) * 20, y: spot.y }
        const idle = CHAT[agent.def.id].idle
        this._setTag(agent.def.id, spot.name, true)
        agent.state = 'stand'
        agent.mute()
        agent.walkTo(dest, () => {
          agent.state = 'stand'
          agent.say(idle[Math.floor(Math.random() * idle.length)], 2800)
          this.time.delayedCall(3200 + Math.random() * 1500, () => {
            if (this.isRunning) return
            this._setTag(agent.def.id, 'returning')
            agent.mute()
            agent.walkTo({ ...agent.def.desk }, () => {
              agent.state = 'sit'
              this._setTag(agent.def.id, 'on duty', true)
              agent.say(CHAT[agent.def.id].work[0], 1800)
            })
          })
        })
      },
    })

    // Agents chat across counters
    this.time.addEvent({
      delay: 20000, loop: true, callback: () => {
        if (this.isRunning) return
        const a = this.agents[0], b = this.agents[1]
        if (a.moving || b.moving) return
        a.walkTo({ x: b.def.desk.x - 50, y: b.def.desk.y + 20 }, () => {
          a.say('Gate B7 ready?', 2200)
          b.say('All clear! ✈', 2200)
          this.time.delayedCall(2800, () => {
            a.walkTo({ ...a.def.desk }, () => { a.state = 'sit' })
          })
        })
      },
    })
  }

  // ── Departure sequence (triggered by Run Now) ─────────────────────────────────
  private async _runDeparture() {
    if (this.isRunning) return
    this.isRunning = true
    this.statusBar.setText('🚀  Departure sequence starting...')

    await this._say('Attention all terminal staff. Initiating departure sequence for the next wave of flights.', 'jason')
    await this._walkToBrief()
    await this._brief()
    await this._walkToCounters()
    await this._say('Excellent. All agents are now processing departure data and generating flight reports. Stand by.', 'jason')
    await this._working()

    this.statusBar.setText('✅  Departure reports ready — check the Dashboard!')
    await this._say('All departure reports are now available. Please check your dashboard for the full briefing. Have a great shift.', 'jason')

    this.time.delayedCall(700, () => {
      this.isRunning = false
      this.statusBar.setText(IDLE_STATUS)
      AGENTS_DEF.forEach(d => this._setTag(d.id, 'on duty'))
    })
  }

  private _walkToBrief(): Promise<void> {
    this.statusBar.setText('📋  Staff briefing starting...')
    AGENTS_DEF.forEach(d => this._setTag(d.id, 'briefing', true))
    return new Promise(resolve => {
      let done = 0
      this.agents.forEach((agent, i) => {
        agent.mute()
        agent.state = 'stand'
        agent.walkTo(BRIEF_SEATS[i], () => {
          agent.state = 'meeting'
          if (++done === this.agents.length) this.time.delayedCall(300, resolve)
        })
      })
    })
  }

  private async _brief(): Promise<void> {
    this.statusBar.setText('📋  Shift briefing in progress...')
    const lines: { idx: number; bubble: string; spoken: string }[] = [
      { idx: 0, bubble: '✅ Gates B7, A5 clear',   spoken: 'Gate Bravo Seven and Alpha Five are clear and staffed. Ready for boarding.' },
      { idx: 1, bubble: '✈ AA1234 on approach',    spoken: 'American flight twelve thirty-four is on final approach. Ground crew, stand by.' },
      { idx: 2, bubble: '🎯 Delay SW321 45min',    spoken: 'Southwest three twenty-one is delayed 45 minutes. I will handle passenger rebooking.' },
      { idx: 0, bubble: 'Manifests confirmed ✓',   spoken: 'Manifests confirmed for all departing flights. No security flags.' },
      { idx: 1, bubble: 'Runway 27L open ✓',        spoken: 'Runway two seven left is open and operational. Winds are nominal.' },
      { idx: 2, bubble: '🚀 Ready to fly!',          spoken: 'Customer service is fully staffed and ready. Let\'s make this a smooth departure wave.' },
    ]
    const ids: Array<'gate' | 'ops' | 'service'> = ['gate', 'ops', 'service']
    for (const line of lines) {
      this.agents.forEach(a => a.mute())
      this.agents[line.idx].say(line.bubble, 3600)
      this.tweens.add({
        targets: this.agents[line.idx].root,
        y: BRIEF_SEATS[line.idx].y - 3,
        duration: 100, yoyo: true,
      })
      await this._say(line.spoken, ids[line.idx])
    }
    this.agents.forEach(a => a.mute())
    await this._delay(300)
  }

  private _walkToCounters(): Promise<void> {
    this.statusBar.setText('💻  Back to stations...')
    return new Promise(resolve => {
      let done = 0
      this.agents.forEach(agent => {
        agent.mute()
        agent.walkTo({ ...agent.def.desk }, () => {
          agent.state = 'sit'
          this._setTag(agent.def.id, 'processing data', true)
          agent.say('🤖 AI processing...', 9000)
          if (++done === this.agents.length) this.time.delayedCall(200, resolve)
        })
      })
    })
  }

  private _working(): Promise<void> {
    this.statusBar.setText('🤖  AI generating departure reports...')
    this.runCallback?.()
    return new Promise(resolve => {
      let tick = 0
      const ev = this.time.addEvent({
        delay: 1100, repeat: 9, callback: () => {
          this.agents.forEach(agent => {
            const msgs = CHAT[agent.def.id].work
            agent.say(msgs[tick % msgs.length], 900)
            this.monScreens.forEach(s => {
              this.tweens.add({ targets: s, fillColor: 0x1d4ed8, duration: 180, yoyo: true })
            })
          })
          if (++tick >= 10) {
            ev.remove()
            this.agents.forEach(a => {
              a.mute()
              a.say('📄 Report done!', 2000)
              this._setTag(a.def.id, 'done ✓', true)
            })
            this.time.delayedCall(2200, resolve)
          }
        },
      })
    })
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(r => this.time.delayedCall(ms, r))
  }

  // ── update ────────────────────────────────────────────────────────────────────
  update(time: number, delta: number) {
    this.agents.forEach(a => a.update(time, delta))
  }
}
