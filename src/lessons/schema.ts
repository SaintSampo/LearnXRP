import { z } from 'zod'

// Lesson content schema (plan, Section 8.2). Lessons are structured JSON:
// metadata plus an ordered list of typed content blocks, grouped into pages
// the user clicks through. Every block has a stable id — translation
// segments are addressed by block id, so ids must never change once
// published.
//
// Text fields accept a deliberately tiny inline markup set — **bold**,
// *italic*, `code` — rendered by src/lessons/inline.tsx. Nothing else.

const idSchema = z.string().min(1)

export const textBlockSchema = z.object({
  id: idSchema,
  type: z.literal('text'),
  style: z.enum(['body', 'heading', 'callout']).default('body'),
  text: z.string(),
})

export const imageBlockSchema = z.object({
  id: idSchema,
  type: z.literal('image'),
  // null = an empty photo slot, rendered as a placeholder (the Build guide
  // reserves a photo slot before every step).
  src: z.string().nullable(),
  alt: z.string(),
  caption: z.string().optional(),
})

export const checklistBlockSchema = z.object({
  id: idSchema,
  type: z.literal('checklist'),
  title: z.string().optional(),
  items: z.array(z.object({ id: idSchema, text: z.string() })).min(1),
})

export const quizQuestionSchema = z
  .object({
    id: idSchema,
    prompt: z.string(),
    choices: z.array(z.object({ id: idSchema, text: z.string() })).min(2),
    correctChoiceId: idSchema,
    feedbackCorrect: z.string().optional(),
    feedbackIncorrect: z.string().optional(),
  })
  .superRefine((q, ctx) => {
    if (!q.choices.some((c) => c.id === q.correctChoiceId)) {
      ctx.addIssue({
        code: 'custom',
        message: `correctChoiceId "${q.correctChoiceId}" is not one of the choice ids`,
      })
    }
  })

export const quizBlockSchema = z.object({
  id: idSchema,
  type: z.literal('quiz'),
  questions: z.array(quizQuestionSchema).min(1),
})

// Embedded Code Lab activity. The editor itself arrives in a later session;
// the schema is defined now so lesson content is stable (plan 6.2 / 8.2).
export const deEmbedBlockSchema = z.object({
  id: idSchema,
  type: z.literal('de-embed'),
  driver: z.enum(['sim', 'real']),
  blockWhitelist: z.array(z.string()).optional(),
  blockBlacklist: z.array(z.string()).optional(),
  // Serialized Blockly workspace placed as ghost-block hints.
  ghostBlocks: z.string().optional(),
  hints: z.array(z.object({ id: idSchema, text: z.string() })).optional(),
})

// Embedded simulator activity (plan 6.3). World config will grow with the
// simulator session; these are the load-bearing basics.
export const simEmbedBlockSchema = z.object({
  id: idSchema,
  type: z.literal('sim-embed'),
  world: z.object({
    // Field dimensions in cm.
    width: z.number().positive(),
    height: z.number().positive(),
    robot: z.object({ x: z.number(), y: z.number(), heading: z.number() }),
    obstacles: z
      .array(
        z.object({
          x: z.number(),
          y: z.number(),
          w: z.number().positive(),
          h: z.number().positive(),
        }),
      )
      .default([]),
    lines: z
      .array(z.object({ points: z.array(z.tuple([z.number(), z.number()])).min(2) }))
      .default([]),
    view: z.enum(['top-down', 'robot']).default('top-down'),
  }),
})

export const teacherNoteBlockSchema = z.object({
  id: idSchema,
  type: z.literal('teacher-note'),
  text: z.string(),
})

export const blockSchema = z.discriminatedUnion('type', [
  textBlockSchema,
  imageBlockSchema,
  checklistBlockSchema,
  quizBlockSchema,
  deEmbedBlockSchema,
  simEmbedBlockSchema,
  teacherNoteBlockSchema,
])

export const pageSchema = z.object({
  id: idSchema,
  title: z.string().optional(),
  blocks: z.array(blockSchema).min(1),
})

export const lessonSchema = z
  .object({
    id: idSchema,
    title: z.string(),
    unit: idSchema,
    version: z.number().int().positive(),
    pages: z.array(pageSchema).min(1),
  })
  .superRefine((lesson, ctx) => {
    const seen = new Set<string>()
    for (const page of lesson.pages) {
      for (const block of page.blocks) {
        if (seen.has(block.id)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate block id "${block.id}" — block ids anchor translations and must be unique within a lesson`,
          })
        }
        seen.add(block.id)
      }
    }
  })

export type Lesson = z.output<typeof lessonSchema>
export type Page = z.output<typeof pageSchema>
export type Block = z.output<typeof blockSchema>
export type TextBlock = z.output<typeof textBlockSchema>
export type ImageBlock = z.output<typeof imageBlockSchema>
export type ChecklistBlock = z.output<typeof checklistBlockSchema>
export type QuizBlock = z.output<typeof quizBlockSchema>
export type QuizQuestion = z.output<typeof quizQuestionSchema>
export type DeEmbedBlock = z.output<typeof deEmbedBlockSchema>
export type SimEmbedBlock = z.output<typeof simEmbedBlockSchema>
export type TeacherNoteBlock = z.output<typeof teacherNoteBlockSchema>
