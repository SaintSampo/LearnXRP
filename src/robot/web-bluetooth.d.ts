// Minimal Web Bluetooth ambient types — just the surface WebBluetoothDriver
// uses. Kept local instead of depending on @types/web-bluetooth.

interface Navigator {
  readonly bluetooth?: Bluetooth
}

interface Bluetooth {
  requestDevice(options: {
    filters: { namePrefix: string }[]
    optionalServices: string[]
  }): Promise<BluetoothDevice>
}

interface BluetoothDevice extends EventTarget {
  readonly name?: string
  readonly gatt?: BluetoothRemoteGATTServer
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly properties: { readonly writeWithoutResponse: boolean }
  readonly value?: DataView
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  // BufferSource in the spec; Uint8Array here so TS 5.7's generic
  // Uint8Array<ArrayBufferLike> (what the codec returns) is accepted.
  writeValueWithResponse(value: Uint8Array): Promise<void>
  writeValueWithoutResponse(value: Uint8Array): Promise<void>
}
