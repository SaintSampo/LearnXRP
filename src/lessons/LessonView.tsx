import { useState } from 'react'
import type { Block, Lesson } from './schema'
import { lessonAssetUrl } from './loadLesson'
import { renderInline } from './inline'
import { QuizBlockView } from './QuizBlock'

export function LessonView({ lesson, onExit }: { lesson: Lesson; onExit: () => void }) {
  const [pageIndex, setPageIndex] = useState(0)
  const page = lesson.pages[pageIndex]
  const isLastPage = pageIndex === lesson.pages.length - 1

  return (
    <main className="mx-auto min-h-screen max-w-2xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={onExit}
          aria-label="Back to modes"
          className="rounded-full bg-slate-200 px-3 py-1.5 text-sm hover:bg-slate-300"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">{lesson.title}</h1>
        <span className="ms-auto text-sm text-slate-500">
          Page {pageIndex + 1} of {lesson.pages.length}
        </span>
      </header>

      {page.title && <h2 className="mb-4 text-2xl font-bold">{page.title}</h2>}

      <div className="space-y-4">
        {page.blocks.map((block) => (
          <BlockView key={block.id} block={block} lessonId={lesson.id} />
        ))}
      </div>

      <nav className="mt-8 flex items-center justify-between" aria-label="Lesson pages">
        <button
          onClick={() => setPageIndex((i) => i - 1)}
          disabled={pageIndex === 0}
          className="rounded-full bg-slate-200 px-5 py-2 font-medium hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <div className="flex gap-1.5">
          {lesson.pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPageIndex(i)}
              aria-label={`Go to page ${i + 1}`}
              aria-current={i === pageIndex ? 'page' : undefined}
              className={`size-2.5 rounded-full ${
                i === pageIndex ? 'bg-violet-600' : 'bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
        {isLastPage ? (
          <button
            onClick={onExit}
            className="rounded-full bg-violet-600 px-5 py-2 font-medium text-white hover:bg-violet-700"
          >
            Done
          </button>
        ) : (
          <button
            onClick={() => setPageIndex((i) => i + 1)}
            className="rounded-full bg-violet-600 px-5 py-2 font-medium text-white hover:bg-violet-700"
          >
            Next
          </button>
        )}
      </nav>
    </main>
  )
}

function BlockView({ block, lessonId }: { block: Block; lessonId: string }) {
  switch (block.type) {
    case 'text':
      if (block.style === 'heading') {
        return <h3 className="text-xl font-semibold">{renderInline(block.text)}</h3>
      }
      if (block.style === 'callout') {
        return (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            {renderInline(block.text)}
          </div>
        )
      }
      return <p className="leading-relaxed">{renderInline(block.text)}</p>

    case 'image':
      if (block.src === null) {
        // Empty photo slot (plan Section 7: a photo slot before every step).
        return (
          <figure className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
            <span aria-hidden="true" className="text-3xl">
              📷
            </span>
            <figcaption className="text-sm text-slate-500">{block.alt}</figcaption>
          </figure>
        )
      }
      return (
        <figure>
          <img
            src={lessonAssetUrl(lessonId, block.src)}
            alt={block.alt}
            loading="lazy"
            className="max-w-full rounded-2xl"
          />
          {block.caption && (
            <figcaption className="mt-2 text-sm text-slate-500">{block.caption}</figcaption>
          )}
        </figure>
      )

    case 'checklist':
      return (
        <div>
          {block.title && <h3 className="mb-2 text-lg font-semibold">{block.title}</h3>}
          <ul className="space-y-2">
            {block.items.map((item) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 has-[:checked]:bg-slate-50 has-[:checked]:text-slate-400 has-[:checked]:line-through">
                  <input type="checkbox" className="mt-1 size-4 accent-violet-600" />
                  <span>{renderInline(item.text)}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )

    case 'quiz':
      return <QuizBlockView block={block} />

    case 'de-embed':
      return <PlaceholderEmbed label="Code Lab activity" />

    case 'sim-embed':
      return <PlaceholderEmbed label="Simulator activity" />

    case 'teacher-note':
      // Rendered only for Teacher users — user types arrive with profiles.
      return null
  }
}

function PlaceholderEmbed({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50 p-6 text-center text-violet-700">
      {label} — coming in a later build
    </div>
  )
}
