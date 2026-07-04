import { lessonSchema, type Lesson } from './schema'

// Lessons live as static JSON under public/lessons/<id>/lesson.json so they
// are separately cacheable and, later, writable by the local developer
// server (plan 8.9) without an app rebuild.
export async function loadLesson(lessonId: string): Promise<Lesson> {
  const url = `${import.meta.env.BASE_URL}lessons/${lessonId}/lesson.json`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not load lesson "${lessonId}" (HTTP ${response.status})`)
  }
  const json: unknown = await response.json()
  const parsed = lessonSchema.safeParse(json)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(`Lesson "${lessonId}" failed validation:\n${details}`)
  }
  return parsed.data
}

// Image src values are relative to the lesson's own folder.
export function lessonAssetUrl(lessonId: string, src: string): string {
  return `${import.meta.env.BASE_URL}lessons/${lessonId}/${src}`
}
