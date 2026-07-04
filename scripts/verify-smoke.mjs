// Browser smoke-drive of the built app, used by the /verify workflow.
// Usage: node scripts/verify-smoke.mjs [screenshot-dir]
// Assumes `npm run build` has produced dist/ and `npm run preview` is
// serving it on http://localhost:4173/LearnXRP/.
import { chromium } from 'playwright'

const shotDir = process.argv[2] ?? '.'
const BASE = 'http://localhost:4173/LearnXRP/'
let failures = 0

function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
page.on('pageerror', (err) => check('no page errors', false, String(err)))

// Home: mode grid
await page.goto(BASE)
await page.waitForSelector('text=LearnXRP')
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

await browser.close()
console.log(failures === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)
