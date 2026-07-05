// Shares one RobotDriver instance app-wide (plan 8.1). Every mode that
// talks to a robot goes through this context — never a transport directly.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { WebBluetoothDriver, isWebBluetoothSupported } from './WebBluetoothDriver'
import { BOARD_TYPE_NAMES } from './xpp/registry'
import type { ConnectionState, RobotDriver } from './types'

interface RobotContextValue {
  driver: RobotDriver | null
  state: ConnectionState
  /** Latest $voltage reading, or null before the first one arrives. */
  voltage: number | null
  /** 'XRP Beta' / 'XRP' / 'NanoXRP' once the robot reports it. */
  boardType: string | null
  robotName: string | null
  bleSupported: boolean
}

const RobotContext = createContext<RobotContextValue | null>(null)

export function RobotProvider({ children }: { children: ReactNode }) {
  const [driver] = useState<RobotDriver | null>(() =>
    isWebBluetoothSupported() ? new WebBluetoothDriver() : null,
  )
  const [state, setState] = useState<ConnectionState>('idle')
  const [voltage, setVoltage] = useState<number | null>(null)
  const [boardType, setBoardType] = useState<string | null>(null)
  const [robotName, setRobotName] = useState<string | null>(null)

  useEffect(() => {
    if (!driver) return
    const offState = driver.onConnectionState((next) => {
      setState(next)
      setRobotName(driver.robotName)
      if (next === 'idle') setVoltage(null)
    })
    const offTelemetry = driver.onTelemetry(({ name, value }) => {
      if (name === '$voltage' && typeof value === 'number') setVoltage(value)
      if (name === '$puppet.board_type' && typeof value === 'number') {
        setBoardType(BOARD_TYPE_NAMES[value] ?? 'Unknown')
      }
    })
    return () => {
      offState()
      offTelemetry()
    }
  }, [driver])

  const value = useMemo(
    () => ({ driver, state, voltage, boardType, robotName, bleSupported: driver !== null }),
    [driver, state, voltage, boardType, robotName],
  )

  return <RobotContext.Provider value={value}>{children}</RobotContext.Provider>
}

export function useRobot(): RobotContextValue {
  const ctx = useContext(RobotContext)
  if (!ctx) throw new Error('useRobot must be used inside <RobotProvider>')
  return ctx
}
