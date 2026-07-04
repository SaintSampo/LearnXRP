// Validates every public/lessons/*/lesson.json against the schema.
// Run with: npm run lessons:check  (Node 22.6+ runs TS directly)
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { lessonSchema } from '../src/lessons/schema.ts'

const lessonsDir = join(import.meta.dirname, '..', 'public', 'lessons')
let failures = 0

for (const entry of readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const file = join(lessonsDir, entry.name, 'lesson.json')
  if (!existsSync(file)) {
    console.error(`FAIL ${entry.name}: missing lesson.json`)
    failures++
    continue
  }
  const parsed = lessonSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')))
  if (!parsed.success) {
    console.error(`FAIL ${entry.name}:`)
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    }
    failures++
  } else if (parsed.data.id !== entry.name) {
    console.error(`FAIL ${entry.name}: lesson id "${parsed.data.id}" must match its folder name`)
    failures++
  } else {
    console.log(`ok   ${entry.name} (v${parsed.data.version}, ${parsed.data.pages.length} pages)`)
  }
}

if (failures > 0) {
  console.error(`\n${failures} lesson(s) failed validation`)
  process.exit(1)
}
