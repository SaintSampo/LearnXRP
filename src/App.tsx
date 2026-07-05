import { useEffect, useState } from 'react'
import type { Lesson } from './lessons/schema'
import { loadLesson } from './lessons/loadLesson'
import { LessonView } from './lessons/LessonView'
import { CapabilityGate } from './robot/CapabilityGate'
import { ConnectionChip } from './robot/ConnectionChip'
import { RobotProvider, useRobot } from './robot/RobotProvider'

// Mode grid (plan, Section 5). Modes light up as their sessions land;
// Build is live, the rest are disabled placeholders.
const MODES: { name: string; description: string; lessonId?: string }[] = [
  { name: 'Build', description: 'Assemble your robot', lessonId: 'nanoxrp-build' },
  { name: 'Learn', description: 'Guided lessons' },
  { name: 'Code Lab', description: 'Program with blocks' },
  { name: 'Drive', description: 'Control your robot live' },
  { name: 'Arcade', description: 'Simulator challenges' },
]

export default function App() {
  return (
    <RobotProvider>
      <AppContent />
    </RobotProvider>
  )
}

function AppContent() {
  const { bleSupported } = useRobot()
  const [openLessonId, setOpenLessonId] = useState<string | null>(null)

  // Governing rule (plan Section 4): no Web Bluetooth means no mode grid —
  // a dedicated page explains why and where to go instead.
  if (!bleSupported) {
    return <CapabilityGate />
  }

  if (openLessonId) {
    return <LessonScreen lessonId={openLessonId} onExit={() => setOpenLessonId(null)} />
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-violet-700">LearnXRP</h1>
        <div className="flex items-center gap-3">
          <ConnectionChip />
          <div className="rounded-full bg-slate-200 px-4 py-2 text-sm text-slate-600">
            Profile
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((mode) => (
          <button
            key={mode.name}
            disabled={!mode.lessonId}
            onClick={() => mode.lessonId && setOpenLessonId(mode.lessonId)}
            className={`rounded-2xl border border-slate-200 bg-white p-6 text-start shadow-sm ${
              mode.lessonId
                ? 'transition hover:border-violet-300 hover:shadow-md'
                : 'cursor-not-allowed opacity-60'
            }`}
          >
            <div className="text-xl font-semibold">{mode.name}</div>
            <p className="mt-1 text-sm text-slate-500">{mode.description}</p>
          </button>
        ))}
      </div>
    </main>
  )
}

function LessonScreen({ lessonId, onExit }: { lessonId: string; onExit: () => void }) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; lesson: Lesson }
  >({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    loadLesson(lessonId).then(
      (lesson) => {
        if (!cancelled) setState({ status: 'ready', lesson })
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [lessonId])

  if (state.status === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-500">
        Loading lesson…
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-8">
        <div className="max-w-lg text-center">
          <p className="mb-2 font-semibold text-red-700">Couldn't open this lesson.</p>
          <pre className="mb-4 text-start text-xs whitespace-pre-wrap text-slate-500">
            {state.message}
          </pre>
          <button
            onClick={onExit}
            className="rounded-full bg-slate-200 px-5 py-2 font-medium hover:bg-slate-300"
          >
            Back to modes
          </button>
        </div>
      </main>
    )
  }

  return <LessonView lesson={state.lesson} onExit={onExit} />
}
