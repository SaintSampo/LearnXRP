import { useState } from 'react'
import type { QuizBlock } from './schema'
import { renderInline } from './inline'

// Interactive quiz. Answers are local state for now; recording results into
// profile progress arrives with the profiles session (roadmap Phase 2).
export function QuizBlockView({ block }: { block: QuizBlock }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const allAnswered = block.questions.every((q) => answers[q.id])
  const score = block.questions.filter((q) => answers[q.id] === q.correctChoiceId).length

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
      <h3 className="mb-4 text-lg font-semibold text-violet-900">Quiz</h3>
      <div className="space-y-5">
        {block.questions.map((question, qIndex) => {
          const chosen = answers[question.id]
          const isCorrect = chosen === question.correctChoiceId
          return (
            <fieldset key={question.id}>
              <legend className="mb-2 font-medium">
                {qIndex + 1}. {renderInline(question.prompt)}
              </legend>
              <div className="space-y-2">
                {question.choices.map((choice) => {
                  const selected = chosen === choice.id
                  const showCorrect = submitted && choice.id === question.correctChoiceId
                  const showWrong = submitted && selected && !isCorrect
                  return (
                    <label
                      key={choice.id}
                      className={`flex items-center gap-3 rounded-lg border bg-white p-3 ${
                        showCorrect
                          ? 'border-green-500 bg-green-50'
                          : showWrong
                            ? 'border-red-400 bg-red-50'
                            : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${block.id}-${question.id}`}
                        checked={selected}
                        disabled={submitted}
                        onChange={() =>
                          setAnswers((a) => ({ ...a, [question.id]: choice.id }))
                        }
                        className="size-4 accent-violet-600"
                      />
                      <span>{renderInline(choice.text)}</span>
                    </label>
                  )
                })}
              </div>
              {submitted && (
                <p
                  className={`mt-2 text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}
                >
                  {isCorrect
                    ? (question.feedbackCorrect ?? 'Correct!')
                    : (question.feedbackIncorrect ?? 'Not quite — the right answer is highlighted.')}
                </p>
              )}
            </fieldset>
          )
        })}
      </div>
      <div className="mt-5 flex items-center gap-4">
        {submitted ? (
          <>
            <span className="font-semibold text-violet-900">
              You got {score} of {block.questions.length}
            </span>
            <button
              onClick={() => {
                setAnswers({})
                setSubmitted(false)
              }}
              className="rounded-full bg-violet-200 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-300"
            >
              Try again
            </button>
          </>
        ) : (
          <button
            onClick={() => setSubmitted(true)}
            disabled={!allAnswered}
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check answers
          </button>
        )}
      </div>
    </div>
  )
}
