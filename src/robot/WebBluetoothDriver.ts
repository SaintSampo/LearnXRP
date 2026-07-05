// WebBluetoothDriver — RobotDriver over XPP / Web Bluetooth
// (plan 8.1, 8.7, Appendix A). Chromium desktop browsers only; Capacitor
// builds get NativeBleDriver in Phase 4.

import {
  MsgType,
  XppStreamParser,
  decodeVarDef,
  encodeProgramEnd,
  encodeProgramStart,
  encodeVarUpdate,
  resolveVarUpdate,
} from './xpp/codec'
import { VarRegistry } from './xpp/registry'
import {
  RobotConnectError,
  classifyBleError,
  type ConnectionState,
  type RobotDriver,
  type TelemetryEvent,
  type TelemetryValue,
  type Unsubscribe,
} from './types'

const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const RX_CHAR_UUID = '92ae6088-f24d-4360-b1b1-a432a8ed36fe' // notify: robot -> browser
const TX_CHAR_UUID = '92ae6088-f24d-4360-b1b1-a432a8ed36ff' // write:  browser -> robot

// Critical writes use write-with-response so they are never silently
// dropped (plan Appendix A); everything else goes without response for
// speed, when the characteristic supports it.
const CRITICAL_VARS = new Set(['$puppet.drivetrain.stop'])

// Silent auto-reconnect backoff on unexpected disconnect (plan 8.7).
const RECONNECT_DELAYS_MS = [500, 1500, 3000]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth
}

export class WebBluetoothDriver implements RobotDriver {
  private state: ConnectionState = 'idle'
  private device: BluetoothDevice | null = null
  private txChar: BluetoothRemoteGATTCharacteristic | null = null
  private rxChar: BluetoothRemoteGATTCharacteristic | null = null
  private registry = new VarRegistry()
  private parser = new XppStreamParser()
  private telemetry = new Map<string, TelemetryValue>()
  private telemetryListeners = new Set<(event: TelemetryEvent) => void>()
  private stateListeners = new Set<(state: ConnectionState) => void>()
  private writeQueue: Promise<void> = Promise.resolve()
  private userDisconnect = false
  private connecting = false

  constructor() {
    // Safety: emergency drivetrain stop when the tab loses focus
    // (plan Appendix A).
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', () => {
        if (this.state === 'connected') this.sendVar('$puppet.drivetrain.stop', true)
      })
    }
  }

  get connectionState(): ConnectionState {
    return this.state
  }

  get robotName(): string | null {
    return this.device?.name ?? null
  }

  onConnectionState(listener: (state: ConnectionState) => void): Unsubscribe {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  onTelemetry(listener: (event: TelemetryEvent) => void): Unsubscribe {
    this.telemetryListeners.add(listener)
    return () => this.telemetryListeners.delete(listener)
  }

  getTelemetry(name: string): TelemetryValue | undefined {
    return this.telemetry.get(name)
  }

  async connect(): Promise<void> {
    if (this.connecting || this.state === 'connected') return
    if (!navigator.bluetooth) {
      throw new RobotConnectError('unsupported', 'Web Bluetooth is not available')
    }
    this.connecting = true
    this.userDisconnect = false
    this.setState('connecting')
    try {
      if (!this.device) {
        this.device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: 'XRP' }],
          optionalServices: [SERVICE_UUID],
        })
        this.device.addEventListener('gattserverdisconnected', this.handleDisconnected)
      }
      await this.setupGatt()
      this.setState('connected')
    } catch (error) {
      this.txChar = null
      this.rxChar = null
      this.setState('idle')
      throw classifyBleError(error)
    } finally {
      this.connecting = false
    }
  }

  async disconnect(): Promise<void> {
    this.userDisconnect = true
    try {
      if (this.state === 'connected' && this.txChar) {
        // Best effort; the robot also notices the GATT disconnect.
        await this.txChar.writeValueWithResponse(encodeProgramEnd())
      }
    } catch {
      // Robot may already be gone; the GATT teardown below still runs.
    }
    try {
      if (this.rxChar) {
        await this.rxChar.stopNotifications()
        this.rxChar.removeEventListener('characteristicvaluechanged', this.handleNotification)
      }
    } catch {
      // Ignore: disconnecting anyway.
    }
    if (this.device?.gatt?.connected) this.device.gatt.disconnect()
    this.txChar = null
    this.rxChar = null
    this.setState('idle')
  }

  sendVar(name: string, value: TelemetryValue): void {
    const info = this.registry.get(name)
    if (!info) return
    const packet = encodeVarUpdate([{ id: info.id, type: info.type, value }])
    this.enqueueWrite(packet, CRITICAL_VARS.has(name))
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) return
    this.state = state
    for (const listener of this.stateListeners) listener(state)
  }

  private async setupGatt(): Promise<void> {
    const gatt = this.device?.gatt
    if (!gatt) throw new RobotConnectError('unknown', 'Device has no GATT server')
    const server = await gatt.connect()
    const service = await server.getPrimaryService(SERVICE_UUID)
    this.txChar = await service.getCharacteristic(TX_CHAR_UUID)
    this.rxChar = await service.getCharacteristic(RX_CHAR_UUID)
    this.parser.reset()
    this.writeQueue = Promise.resolve()
    await this.rxChar.startNotifications()
    this.rxChar.addEventListener('characteristicvaluechanged', this.handleNotification)
    // Handshake: PROGRAM_START with response (plan Appendix A); the robot
    // echoes PROGRAM_START back, which triggers sendInitialValues again.
    await this.txChar.writeValueWithResponse(encodeProgramStart())
    this.sendInitialValues()
  }

  // Safe initial values on connect and on the robot's PROGRAM_START
  // (plan Appendix A): motors 0, servos 90, stop false, distance/angle 0,
  // LED off.
  private sendInitialValues(): void {
    for (let i = 0; i < 4; i++) this.sendVar(`$puppet.motor.${i}`, 0.0)
    for (let i = 0; i < 4; i++) this.sendVar(`$puppet.servo.${i}`, 90.0)
    this.sendVar('$puppet.drivetrain.stop', false)
    this.sendVar('$puppet.drivetrain.distance', 0.0)
    this.sendVar('$puppet.drivetrain.angle', 0.0)
    this.sendVar('$puppet.led', false)
  }

  private handleNotification = (event: Event): void => {
    const view = (event.target as BluetoothRemoteGATTCharacteristic).value
    if (!view) return
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    for (const packet of this.parser.push(bytes)) {
      if (packet.type === MsgType.VarUpdate) {
        for (const { name, value } of resolveVarUpdate(packet.payload, this.registry)) {
          this.telemetry.set(name, value)
          for (const listener of this.telemetryListeners) listener({ name, value })
        }
      } else if (packet.type === MsgType.VarDef) {
        const info = decodeVarDef(packet.payload)
        if (info) this.registry.define(info)
      } else if (packet.type === MsgType.ProgramStart) {
        this.sendInitialValues()
      }
    }
  }

  private handleDisconnected = (): void => {
    this.txChar = null
    this.rxChar = null
    if (this.userDisconnect || this.state === 'idle') {
      this.setState('idle')
      return
    }
    void this.reconnect()
  }

  // Silent retry with backoff behind a "Reconnecting…" state; only if all
  // attempts fail does the UI fall back to the wizard (plan 8.7).
  private async reconnect(): Promise<void> {
    this.setState('reconnecting')
    for (const wait of RECONNECT_DELAYS_MS) {
      await delay(wait)
      if (this.userDisconnect) return
      try {
        await this.setupGatt()
        this.setState('connected')
        return
      } catch {
        // Try again after the next backoff step.
      }
    }
    this.setState('idle')
  }

  private enqueueWrite(bytes: Uint8Array, critical: boolean): void {
    this.writeQueue = this.writeQueue.then(async () => {
      const tx = this.txChar
      if (!tx || (this.state !== 'connected' && this.state !== 'connecting')) return
      try {
        if (!critical && tx.properties.writeWithoutResponse) {
          await tx.writeValueWithoutResponse(bytes)
        } else {
          await tx.writeValueWithResponse(bytes)
        }
      } catch (error) {
        console.error('BLE write failed:', error)
      }
    })
  }
}
