// Persistent connection chip (plan 8.7): gray "Not connected", pulsing
// while connecting, green with live battery voltage when connected.
// Clicking opens the connect wizard (first time), one-click connects
// (returning users), or a small status panel (once connected) that the
// full diagnostics panel replaces in a later session.

import { useEffect, useRef, useState } from 'react'
import { ConnectWizard } from './ConnectWizard'
import { useRobot } from './RobotProvider'
import { RobotConnectError, type ConnectErrorKind } from './types'

function hasConnectedBefore(): boolean {
  try {
    return localStorage.getItem('learnxrp.hasConnected') === '1'
  } catch {
    return false
  }
}

export function ConnectionChip() {
  const { driver, state, voltage, boardType, robotName, bleSupported } = useRobot()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardError, setWizardError] = useState<ConnectErrorKind | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const prevState = useRef(state)

  // Auto-reconnect exhausted its retries: surface the wizard (plan 8.7).
  useEffect(() => {
    if (prevState.current === 'reconnecting' && state === 'idle') {
      setWizardError('timeout')
      setWizardOpen(true)
    }
    if (state !== 'connected') setPanelOpen(false)
    prevState.current = state
  }, [state])

  // Pre-flight capability check (plan 8.7): no Web Bluetooth, no connect
  // button — the capability gate page handles the messaging.
  if (!bleSupported || !driver) return null

  async function handleClick() {
    if (state === 'connected') {
      setPanelOpen((open) => !open)
      return
    }
    if (state === 'connecting' || state === 'reconnecting') return
    if (hasConnectedBefore()) {
      // Returning users get one-click connect instead of the wizard.
      try {
        await driver!.connect()
      } catch (error) {
        setWizardError(error instanceof RobotConnectError ? error.kind : 'unknown')
        setWizardOpen(true)
      }
      return
    }
    setWizardError(null)
    setWizardOpen(true)
  }

  const busy = state === 'connecting' || state === 'reconnecting'
  const label =
    state === 'connected'
      ? voltage !== null
        ? `${voltage.toFixed(1)} V`
        : 'Connected'
      : state === 'connecting'
        ? 'Connecting…'
        : state === 'reconnecting'
          ? 'Reconnecting…'
          : 'Not connected'

  const chipClass =
    state === 'connected'
      ? 'bg-green-100 text-green-800 hover:bg-green-200'
      : busy
        ? 'bg-amber-100 text-amber-800 motion-safe:animate-pulse'
        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        aria-label={`Robot: ${label}`}
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${chipClass}`}
      >
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${
            state === 'connected' ? 'bg-green-500' : busy ? 'bg-amber-500' : 'bg-slate-400'
          }`}
        />
        {label}
      </button>

      {panelOpen && state === 'connected' && (
        <div className="absolute end-0 top-full z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <p className="font-semibold">{robotName ?? 'Robot'}</p>
          <dl className="mt-2 space-y-1 text-sm text-slate-600">
            <div className="flex justify-between">
              <dt>Battery</dt>
              <dd>{voltage !== null ? `${voltage.toFixed(1)} V` : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Board</dt>
              <dd>{boardType ?? '—'}</dd>
            </div>
          </dl>
          <button
            onClick={() => {
              setPanelOpen(false)
              void driver.disconnect()
            }}
            className="mt-3 w-full rounded-full bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300"
          >
            Disconnect
          </button>
        </div>
      )}

      <ConnectWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initialError={wizardError}
      />
    </div>
  )
}
