// First-run connect wizard (plan 8.7): turn-on guidance, device-chooser
// prep, connecting indicator, success with battery level, and specific
// advice for every failure kind.

import { useEffect, useRef, useState } from 'react'
import { useRobot } from './RobotProvider'
import { RobotConnectError, type ConnectErrorKind } from './types'

// Provisional low-battery threshold (plan 8.7 "below a threshold").
// Assumes the NanoXRP's 1S LiPo; revisit for the 4xAA XRP (~6 V nominal).
export const LOW_BATTERY_V = 3.4

type Step = 'power' | 'connect' | 'connecting' | 'success' | 'error'

const ERROR_ADVICE: Record<ConnectErrorKind, { title: string; tips: string[] }> = {
  cancelled: {
    title: 'No robot found',
    tips: [
      'Is the robot switched on?',
      'Is its battery charged?',
      'Is it within a few feet of this computer?',
      'Is it already connected to another tab or device?',
    ],
  },
  timeout: {
    title: 'The connection timed out',
    tips: ['Power-cycle the robot — switch it off, then on — and try again.'],
  },
  security: {
    title: 'Bluetooth was blocked',
    tips: [
      'LearnXRP needs a secure (https) page to use Bluetooth.',
      'Check the address bar for a blocked-permission icon and allow Bluetooth.',
    ],
  },
  unsupported: {
    title: 'This browser has no Web Bluetooth',
    tips: ['Switch to Chrome, Edge, or Opera on a desktop or laptop.'],
  },
  unknown: {
    title: 'Something went wrong',
    tips: ['Power-cycle the robot and try again.'],
  },
}

export function ConnectWizard({
  open,
  onClose,
  initialError = null,
}: {
  open: boolean
  onClose: () => void
  initialError?: ConnectErrorKind | null
}) {
  const { driver, voltage, robotName } = useRobot()
  const [step, setStep] = useState<Step>('power')
  const [errorKind, setErrorKind] = useState<ConnectErrorKind>('unknown')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    if (initialError) {
      setErrorKind(initialError)
      setStep('error')
    } else {
      setStep('power')
    }
    dialogRef.current?.focus()
  }, [open, initialError])

  if (!open) return null

  async function startConnect() {
    if (!driver) return
    setStep('connecting')
    try {
      await driver.connect()
      localStorage.setItem('learnxrp.hasConnected', '1')
      setStep('success')
    } catch (error) {
      setErrorKind(error instanceof RobotConnectError ? error.kind : 'unknown')
      setStep('error')
    }
  }

  const advice = ERROR_ADVICE[errorKind]

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-wizard-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl outline-none"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
        }}
      >
        {step === 'power' && (
          <>
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-violet-100 text-3xl" aria-hidden="true">
              🤖
            </div>
            <h2 id="connect-wizard-title" className="text-xl font-bold">
              Step 1 · Turn on your robot
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Flip the power switch on your robot. When it's ready to connect, the
              LED next to the switch blinks slowly.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-full px-5 py-2 font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('connect')}
                className="rounded-full bg-violet-600 px-5 py-2 font-medium text-white hover:bg-violet-700"
              >
                It's on
              </button>
            </div>
          </>
        )}

        {step === 'connect' && (
          <>
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-violet-100 text-3xl" aria-hidden="true">
              📡
            </div>
            <h2 id="connect-wizard-title" className="text-xl font-bold">
              Step 2 · Press Connect
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              A list of nearby robots will pop up. Pick the name on your robot's
              sticker — it starts with <strong>XRP</strong>.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-full px-5 py-2 font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={startConnect}
                className="rounded-full bg-violet-600 px-5 py-2 font-medium text-white hover:bg-violet-700"
              >
                Connect
              </button>
            </div>
          </>
        )}

        {step === 'connecting' && (
          <>
            <div
              className="mb-4 h-16 w-16 rounded-full border-4 border-violet-200 border-t-violet-600 motion-safe:animate-spin"
              aria-hidden="true"
            />
            <h2 id="connect-wizard-title" className="text-xl font-bold">
              Connecting…
            </h2>
            <p className="mt-2 text-sm text-slate-600" role="status">
              Talking to your robot. This takes a few seconds.
            </p>
          </>
        )}

        {step === 'success' && (
          <>
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl" aria-hidden="true">
              ✅
            </div>
            <h2 id="connect-wizard-title" className="text-xl font-bold">
              Connected!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {robotName ?? 'Your robot'} is ready
              {voltage !== null ? ` — battery ${voltage.toFixed(1)} V` : ''}.
            </p>
            {voltage !== null && voltage < LOW_BATTERY_V && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <strong>Low battery.</strong> Your robot may behave erratically —
                charge it soon.
              </p>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="rounded-full bg-violet-600 px-5 py-2 font-medium text-white hover:bg-violet-700"
              >
                Done
              </button>
            </div>
          </>
        )}

        {step === 'error' && (
          <>
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-100 text-3xl" aria-hidden="true">
              ⚠️
            </div>
            <h2 id="connect-wizard-title" className="text-xl font-bold">
              {advice.title}
            </h2>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-600">
              {advice.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-full px-5 py-2 font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={startConnect}
                className="rounded-full bg-violet-600 px-5 py-2 font-medium text-white hover:bg-violet-700"
              >
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
