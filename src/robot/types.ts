// RobotDriver (plan 8.1): the single interface all robot control goes
// through. Blockly blocks, Drive mode, live diagnostics, and lessons target
// ONLY this interface — they never know which transport is underneath.
// Implementations: WebBluetoothDriver (this session), SimDriver (session 4),
// NativeBleDriver (Phase 4).

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting'

export type TelemetryValue = number | boolean

export interface TelemetryEvent {
  name: string
  value: TelemetryValue
}

export type Unsubscribe = () => void

export interface RobotDriver {
  readonly connectionState: ConnectionState
  /** Robot's advertised name once known (kept across disconnects). */
  readonly robotName: string | null
  connect(): Promise<void>
  disconnect(): Promise<void>
  /** Write a control variable by name (e.g. '$puppet.motor.0'). */
  sendVar(name: string, value: TelemetryValue): void
  onTelemetry(listener: (event: TelemetryEvent) => void): Unsubscribe
  onConnectionState(listener: (state: ConnectionState) => void): Unsubscribe
  /** Latest received value for a telemetry variable, if any. */
  getTelemetry(name: string): TelemetryValue | undefined
}

// Connection failures mapped to the specific advice in plan 8.7.
export type ConnectErrorKind = 'cancelled' | 'timeout' | 'security' | 'unsupported' | 'unknown'

export class RobotConnectError extends Error {
  kind: ConnectErrorKind

  constructor(kind: ConnectErrorKind, message: string) {
    super(message)
    this.name = 'RobotConnectError'
    this.kind = kind
  }
}

export function classifyBleError(error: unknown): RobotConnectError {
  if (error instanceof RobotConnectError) return error
  const name = (error as { name?: string } | null)?.name
  const message = error instanceof Error ? error.message : String(error)
  if (name === 'NotFoundError') return new RobotConnectError('cancelled', message)
  if (name === 'SecurityError') return new RobotConnectError('security', message)
  if (name === 'NetworkError' || name === 'TimeoutError') {
    return new RobotConnectError('timeout', message)
  }
  return new RobotConnectError('unknown', message)
}
