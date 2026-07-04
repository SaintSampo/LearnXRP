import type { ReactNode } from 'react'

// Renders the schema's tiny inline markup set: **bold**, *italic*, `code`.
// This is the complete style set on purpose (plan 8.2) — keeping it small
// is what lets Rosetta translate strings without breaking markup.
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g

export function renderInline(text: string): ReactNode[] {
  return text
    .split(TOKEN)
    .filter((part) => part !== '')
    .map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code key={i} className="rounded bg-slate-100 px-1 font-mono text-[0.9em]">
            {part.slice(1, -1)}
          </code>
        )
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <em key={i}>{part.slice(1, -1)}</em>
      }
      return part
    })
}
