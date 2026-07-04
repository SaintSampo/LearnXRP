// Placeholder main page: the mode grid (plan, Section 5).
// Modes are wired up in later sessions; tiles are disabled until then.
const MODES = [
  { name: 'Build', description: 'Assemble your robot' },
  { name: 'Learn', description: 'Guided lessons' },
  { name: 'Code Lab', description: 'Program with blocks' },
  { name: 'Drive', description: 'Control your robot live' },
  { name: 'Arcade', description: 'Simulator challenges' },
]

export default function App() {
  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-violet-700">LearnXRP</h1>
        <div className="rounded-full bg-slate-200 px-4 py-2 text-sm text-slate-600">
          Profile
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((mode) => (
          <button
            key={mode.name}
            disabled
            className="cursor-not-allowed rounded-2xl border border-slate-200 bg-white p-6 text-start opacity-75 shadow-sm"
          >
            <div className="text-xl font-semibold">{mode.name}</div>
            <p className="mt-1 text-sm text-slate-500">{mode.description}</p>
          </button>
        ))}
      </div>
    </main>
  )
}
