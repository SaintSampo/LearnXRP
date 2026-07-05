// Browser smoke-drive of the built app, used by the /verify workflow.
// Usage: node scripts/verify-smoke.mjs [screenshot-dir]
// Assumes `npm run build` has produced dist/ and `npm run preview` is
// serving it on http://localhost:4173/LearnXRP/.
//
// BLE coverage runs against a scripted fake navigator.bluetooth: a fake
// robot that echoes PROGRAM_START and streams voltage/board telemetry
// (split across notifications to exercise the stream parser). Three
// contexts: happy path, NotFoundError path, and the no-Bluetooth
// capability gate.
import { chromium } from 'playwright'

const shotDir = process.argv[2] ?? '.'
const BASE = 'http://localhost:4173/LearnXRP/'
let failures = 0

function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

// Injected before page scripts. mode: 'ok' | 'notfound' | 'none'.
function installFakeBluetooth({ mode }) {
  if (mode === 'none') {
    Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: undefined })
    return
  }

  const writes = []
  window.__bleWrites = writes

  class FakeCharacteristic extends EventTarget {
    constructor(uuid) {
      super()
      this.uuid = uuid
      this.value = null
      this.properties = { write: true, writeWithoutResponse: true, notify: true }
    }
    async startNotifications() {
      return this
    }
    async stopNotifications() {
      return this
    }
    async writeValueWithResponse(v) {
      recordWrite('with', v)
    }
    async writeValueWithoutResponse(v) {
      recordWrite('without', v)
    }
  }

  const rx = new FakeCharacteristic('92ae6088-f24d-4360-b1b1-a432a8ed36fe')
  const tx = new FakeCharacteristic('92ae6088-f24d-4360-b1b1-a432a8ed36ff')

  function notify(bytes) {
    rx.value = new DataView(new Uint8Array(bytes).buffer)
    rx.dispatchEvent(new Event('characteristicvaluechanged'))
  }

  function varUpdateFrame(id, type, littleEndianValueBytes) {
    const payload = [1, id, type, ...littleEndianValueBytes]
    return [0xaa, 0x55, 0x02, payload.length, ...payload, 0x55, 0xaa]
  }

  function floatBytes(value) {
    const buf = new ArrayBuffer(4)
    new DataView(buf).setFloat32(0, value, true)
    return [...new Uint8Array(buf)]
  }

  function recordWrite(modeUsed, v) {
    const bytes = v instanceof Uint8Array ? Array.from(v) : Array.from(new Uint8Array(v))
    writes.push({ mode: modeUsed, bytes })
    // Robot behavior: browser's PROGRAM_START gets an echo plus telemetry.
    if (bytes[2] === 0x05) {
      const stream = [
        ...[0xaa, 0x55, 0x05, 0x00, 0x55, 0xaa], // PROGRAM_START echo
        ...varUpdateFrame(37, 2, floatBytes(7.4)), // $voltage
        ...varUpdateFrame(50, 1, [2, 0, 0, 0]), // $puppet.board_type = NanoXRP
      ]
      // Split mid-packet to prove the stream parser buffers across notifies.
      setTimeout(() => notify(stream.slice(0, 10)), 20)
      setTimeout(() => notify(stream.slice(10)), 40)
    }
  }

  const service = {
    getCharacteristic: async (uuid) => (uuid.endsWith('36ff') ? tx : rx),
  }

  class FakeDevice extends EventTarget {
    name = 'XRP-Smoke'
  }
  const device = new FakeDevice()
  const server = {
    connected: false,
    connect: async () => {
      server.connected = true
      return server
    },
    disconnect: () => {
      server.connected = false
      device.dispatchEvent(new Event('gattserverdisconnected'))
    },
    getPrimaryService: async () => service,
  }
  device.gatt = server

  Object.defineProperty(navigator, 'bluetooth', {
    configurable: true,
    value: {
      requestDevice: async () => {
        if (mode === 'notfound') throw new DOMException('No devices found', 'NotFoundError')
        return device
      },
    },
  })
}

const browser = await chromium.launch()

// ---------------------------------------------------------------
// Context 1: fake robot happy path + the lesson checks
// ---------------------------------------------------------------
const ctx1 = await browser.newContext({ viewport: { width: 1100, height: 800 } })
await ctx1.addInitScript(installFakeBluetooth, { mode: 'ok' })
const page = await ctx1.newPage()
page.on('pageerror', (err) => check('no page errors', false, String(err)))

await page.goto(BASE)
await page.waitForSelector('text=LearnXRP')

// --- BLE: chip + wizard + fake robot ---
const chip = (label) => page.getByRole('button', { name: `Robot: ${label}` })
check('chip shows Not connected', await chip('Not connected').isVisible())

await chip('Not connected').click()
check('wizard step 1 (power on)', await page.locator('text=Turn on your robot').isVisible())
await page.screenshot({ path: `${shotDir}/06-ble-wizard.png` })
await page.getByRole('button', { name: "It's on" }).click()
check('wizard step 2 (chooser prep)', await page.locator('text=Press Connect').isVisible())
check('sticker-name guidance', await page.locator('text=sticker').isVisible())
await page.getByRole('button', { name: 'Connect', exact: true }).click()

await page.waitForSelector('text=Connected!')
await page.waitForSelector('text=battery 7.4 V')
check('wizard success shows battery', true)
await page.getByRole('button', { name: 'Done' }).click()
await chip('7.4 V').waitFor()
check('chip green with live voltage', true)
await page.screenshot({ path: `${shotDir}/07-ble-connected.png` })

// Wire-level assertions against the fake TX characteristic
await page.waitForFunction(
  () => window.__bleWrites.filter((w) => w.bytes[2] === 2).length >= 24,
)
const writes = await page.evaluate(() => window.__bleWrites)
check(
  'PROGRAM_START written with response',
  writes.some((w) => w.mode === 'with' && w.bytes[2] === 5),
)
check(
  'initial values sent on connect AND robot echo (24 var writes)',
  writes.filter((w) => w.bytes[2] === 2).length === 24,
  `count=${writes.filter((w) => w.bytes[2] === 2).length}`,
)
check(
  'servo init is 90.0 float LE (id 42)',
  writes.some(
    (w) =>
      w.bytes[2] === 2 &&
      w.bytes[5] === 42 &&
      w.bytes[6] === 2 &&
      w.bytes[7] === 0 &&
      w.bytes[8] === 0 &&
      w.bytes[9] === 180 &&
      w.bytes[10] === 66,
  ),
)
check(
  'drivetrain.stop uses write-with-response (critical)',
  writes.some((w) => w.mode === 'with' && w.bytes[2] === 2 && w.bytes[5] === 46 && w.bytes[6] === 3),
)
check(
  'routine motor write goes without response',
  writes.some((w) => w.mode === 'without' && w.bytes[2] === 2 && w.bytes[5] === 38),
)

// Tab blur sends an emergency drivetrain stop (stop = true)
await page.evaluate(() => window.dispatchEvent(new Event('blur')))
await page.waitForFunction(() =>
  window.__bleWrites.some(
    (w) => w.bytes[2] === 2 && w.bytes[5] === 46 && w.bytes[6] === 3 && w.bytes[7] === 1,
  ),
)
check('blur sends emergency stop (stop=true, with response)', true)

// Connected panel: name, board type, disconnect
await chip('7.4 V').click()
check('panel shows robot name', await page.locator('text=XRP-Smoke').isVisible())
check('panel shows board type NanoXRP', await page.locator('text=NanoXRP').first().isVisible())
await page.getByRole('button', { name: 'Disconnect' }).click()
await chip('Not connected').waitFor()
const endWrites = await page.evaluate(() => window.__bleWrites)
check(
  'PROGRAM_END written with response on disconnect',
  endWrites.some((w) => w.mode === 'with' && w.bytes[2] === 6),
)

// Returning user: one-click connect, no wizard
await chip('Not connected').click()
await chip('7.4 V').waitFor()
check(
  'returning user gets one-click connect (no wizard)',
  !(await page.locator('text=Turn on your robot').isVisible()),
)
await page.getByRole('button', { name: 'Robot: 7.4 V' }).click() // close panel state consistent
await page.getByRole('button', { name: 'Disconnect' }).click()
await chip('Not connected').waitFor()

// --- Home: mode grid (pre-existing checks) ---
const tiles = page.locator('main button', { hasText: /Build|Learn|Code Lab|Drive|Arcade/ })
check('5 mode tiles render', (await tiles.count()) === 5, `count=${await tiles.count()}`)
const buildTile = page.locator('button', { hasText: 'Build' })
check('Build tile enabled', await buildTile.isEnabled())
check('Learn tile disabled', await page.locator('button', { hasText: 'Learn' }).isDisabled())
await page.screenshot({ path: `${shotDir}/01-home.png` })

// Open the Build guide
await buildTile.click()
await page.waitForSelector('text=NanoXRP Build Guide')
check('lesson opens', true)
check('page indicator', await page.locator('text=Page 1 of 8').isVisible())
check(
  'parts checklists render',
  (await page.locator('input[type=checkbox]').count()) === 10,
  `checkboxes=${await page.locator('input[type=checkbox]').count()}`,
)

// Checklist strikethrough via :has
const firstItem = page.locator('label', { hasText: 'Chassis' }).first()
await firstItem.locator('input').check()
const deco = await firstItem.evaluate((el) => getComputedStyle(el).textDecorationLine)
check('checked item gets strikethrough (:has)', deco.includes('line-through'), deco)
await page.screenshot({ path: `${shotDir}/02-parts.png` })

// Safety page: callout + inline bold
await page.locator('button', { hasText: 'Next' }).click()
await page.waitForSelector('text=Before You Build')
check('callout bold renders', await page.locator('strong', { hasText: 'Be gentle with electronics.' }).isVisible())

// Step page: photo slot placeholder
await page.locator('button', { hasText: 'Next' }).click()
await page.waitForSelector('text=Step 1')
check(
  'photo slot placeholder renders',
  await page.locator('text=Motor wires and battery connected to the board').isVisible(),
)
await page.screenshot({ path: `${shotDir}/03-step1.png` })

// Jump to the quiz page via the dots
await page.locator('button[aria-label="Go to page 8"]').click()
await page.waitForSelector('text=Build Check')

// Probe: Check answers disabled until all questions answered
const checkBtn = page.locator('button', { hasText: 'Check answers' })
check('check disabled until answered', await checkBtn.isDisabled())

// Probe: wrong answer path first
await page.locator('label', { hasText: "It doesn't matter" }).locator('input').check()
await page.locator('label', { hasText: 'The 4-pin Dupont connector' }).locator('input').check()
await checkBtn.click()
check('score 1 of 2 on wrong answer', await page.locator('text=You got 1 of 2').isVisible())
check(
  'incorrect feedback shown',
  await page.locator('text=Look back at Step 2').isVisible(),
)
await page.screenshot({ path: `${shotDir}/04-quiz-wrong.png` })

// Try again → correct answers
await page.locator('button', { hasText: 'Try again' }).click()
await page.locator('label', { hasText: 'Toward the motor' }).locator('input').check()
await page.locator('label', { hasText: 'The 4-pin Dupont connector' }).locator('input').check()
await page.locator('button', { hasText: 'Check answers' }).click()
check('score 2 of 2 on correct answers', await page.locator('text=You got 2 of 2').isVisible())
await page.screenshot({ path: `${shotDir}/05-quiz-correct.png` })

// Done returns to the mode grid
await page.locator('button', { hasText: 'Done' }).click()
await page.waitForSelector('text=Control your robot live')
check('Done returns to mode grid', true)

// Probe: Back disabled on page 1
await page.locator('button', { hasText: 'Build' }).first().click()
await page.waitForSelector('text=NanoXRP Build Guide')
check('Back disabled on page 1', await page.locator('button', { hasText: 'Back' }).isDisabled())

await ctx1.close()

// ---------------------------------------------------------------
// Context 2: connect failure maps to specific advice (plan 8.7)
// ---------------------------------------------------------------
const ctx2 = await browser.newContext({ viewport: { width: 1100, height: 800 } })
await ctx2.addInitScript(installFakeBluetooth, { mode: 'notfound' })
const page2 = await ctx2.newPage()
page2.on('pageerror', (err) => check('no page errors (error path)', false, String(err)))
await page2.goto(BASE)
await page2.getByRole('button', { name: 'Robot: Not connected' }).click()
await page2.getByRole('button', { name: "It's on" }).click()
await page2.getByRole('button', { name: 'Connect', exact: true }).click()
await page2.waitForSelector('text=No robot found')
check('NotFoundError maps to advice', await page2.locator('text=Is the robot switched on?').isVisible())
check('retry offered', await page2.getByRole('button', { name: 'Try again' }).isVisible())
await page2.screenshot({ path: `${shotDir}/08-ble-error.png` })
await ctx2.close()

// ---------------------------------------------------------------
// Context 3: no Web Bluetooth → capability gate, no mode grid
// ---------------------------------------------------------------
const ctx3 = await browser.newContext({ viewport: { width: 1100, height: 800 } })
await ctx3.addInitScript(installFakeBluetooth, { mode: 'none' })
const page3 = await ctx3.newPage()
page3.on('pageerror', (err) => check('no page errors (gate)', false, String(err)))
await page3.goto(BASE)
await page3.waitForSelector("text=can't reach robots")
check('capability gate page shown', true)
check(
  'gate suggests Chrome/Edge/Opera',
  await page3.locator('text=Chrome').first().isVisible(),
)
check(
  'mode grid hidden behind gate',
  (await page3.locator('button', { hasText: 'Build' }).count()) === 0,
)
await page3.screenshot({ path: `${shotDir}/09-gate.png` })
await ctx3.close()

await browser.close()
console.log(failures === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)
