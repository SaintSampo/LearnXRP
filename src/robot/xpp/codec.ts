// XPP packet codec (plan Appendix A) — must match puppet.py on the robot.
//
// Frame: [0xAA 0x55] [msg type] [payload length] [payload...] [0x55 0xAA]
// Values are little-endian: float32 and int32 are 4 bytes, bool is 1 byte.

import { VarType, type VarInfo, type VarRegistry } from './registry'

export const MsgType = {
  VarDef: 0x01,
  VarUpdate: 0x02,
  VarSubscribe: 0x03,
  VarUnsubscribe: 0x04,
  ProgramStart: 0x05,
  ProgramEnd: 0x06,
  Heartbeat: 0x07,
} as const
export type MsgType = (typeof MsgType)[keyof typeof MsgType]

const START_1 = 0xaa
const START_2 = 0x55
const END_1 = 0x55
const END_2 = 0xaa
// puppet.py rejects payloads above this and resyncs.
const MAX_PAYLOAD_SIZE = 251

export interface XppPacket {
  type: number
  payload: Uint8Array
}

export type VarValue = number | boolean

export interface VarUpdateEntry {
  id: number
  type: VarType
  value: VarValue
}

export function frame(msgType: number, payload: Uint8Array): Uint8Array {
  if (payload.length > MAX_PAYLOAD_SIZE) {
    throw new Error(`XPP payload too large: ${payload.length} > ${MAX_PAYLOAD_SIZE}`)
  }
  const buf = new Uint8Array(4 + payload.length + 2)
  buf[0] = START_1
  buf[1] = START_2
  buf[2] = msgType
  buf[3] = payload.length
  buf.set(payload, 4)
  buf[4 + payload.length] = END_1
  buf[5 + payload.length] = END_2
  return buf
}

function valueSize(type: VarType): number {
  return type === VarType.Bool ? 1 : 4
}

function writeValue(view: DataView, offset: number, type: VarType, value: VarValue): void {
  const num = typeof value === 'boolean' ? (value ? 1 : 0) : value
  if (type === VarType.Float) view.setFloat32(offset, num, true)
  else if (type === VarType.Int) view.setInt32(offset, Math.round(num), true)
  else view.setUint8(offset, num ? 1 : 0)
}

// Batched VAR_UPDATE: count(1) [var_id(1) type(1) value]*count.
export function encodeVarUpdate(entries: VarUpdateEntry[]): Uint8Array {
  const size = 1 + entries.reduce((sum, e) => sum + 2 + valueSize(e.type), 0)
  const payload = new Uint8Array(size)
  const view = new DataView(payload.buffer)
  payload[0] = entries.length
  let offset = 1
  for (const e of entries) {
    payload[offset] = e.id
    payload[offset + 1] = e.type
    writeValue(view, offset + 2, e.type, e.value)
    offset += 2 + valueSize(e.type)
  }
  return frame(MsgType.VarUpdate, payload)
}

export function encodeProgramStart(): Uint8Array {
  return frame(MsgType.ProgramStart, new Uint8Array(0))
}

export function encodeProgramEnd(): Uint8Array {
  return frame(MsgType.ProgramEnd, new Uint8Array(0))
}

// var_id(1) rate(1) — rate in Hz, 0 = on-demand.
export function encodeVarSubscribe(varId: number, rateHz: number): Uint8Array {
  return frame(MsgType.VarSubscribe, new Uint8Array([varId, rateHz]))
}

export function encodeVarUnsubscribe(varId: number): Uint8Array {
  return frame(MsgType.VarUnsubscribe, new Uint8Array([varId]))
}

// VAR_DEF payload: name_len(1) name(name_len) type(1) permissions(1) var_id(1).
export function decodeVarDef(payload: Uint8Array): VarInfo | null {
  if (payload.length < 4) return null
  const nameLen = payload[0]
  if (payload.length < 1 + nameLen + 3) return null
  const name = new TextDecoder().decode(payload.slice(1, 1 + nameLen))
  const type = payload[1 + nameLen]
  const perm = payload[2 + nameLen]
  const id = payload[3 + nameLen]
  if (type < 1 || type > 3 || perm < 1 || perm > 3) return null
  return { id, name, type: type as VarInfo['type'], perm: perm as VarInfo['perm'] }
}

export function decodeVarUpdate(payload: Uint8Array): VarUpdateEntry[] {
  const entries: VarUpdateEntry[] = []
  if (payload.length < 1) return entries
  const count = payload[0]
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
  let offset = 1
  for (let i = 0; i < count; i++) {
    if (payload.length < offset + 2) break
    const id = payload[offset]
    const type = payload[offset + 1]
    offset += 2
    if (type !== VarType.Int && type !== VarType.Float && type !== VarType.Bool) break
    if (payload.length < offset + valueSize(type)) break
    let value: VarValue
    if (type === VarType.Float) value = view.getFloat32(offset, true)
    else if (type === VarType.Int) value = view.getInt32(offset, true)
    else value = payload[offset] !== 0
    offset += valueSize(type)
    entries.push({ id, type, value })
  }
  return entries
}

// Stateful stream parser. BLE notifications can split or concatenate XPP
// packets arbitrarily, so bytes carry over between push() calls (the
// original reference JS dropped packets split across notifications; this
// mirrors puppet.py's buffered state machine instead). Malformed bytes are
// skipped until the next valid start sequence.
export class XppStreamParser {
  private buffer = new Uint8Array(0)

  push(bytes: Uint8Array): XppPacket[] {
    const merged = new Uint8Array(this.buffer.length + bytes.length)
    merged.set(this.buffer)
    merged.set(bytes, this.buffer.length)

    const packets: XppPacket[] = []
    let i = 0
    while (merged.length - i >= 2) {
      if (merged[i] !== START_1 || merged[i + 1] !== START_2) {
        i++
        continue
      }
      if (merged.length - i < 4) break // wait for type + length
      const payloadLen = merged[i + 3]
      if (payloadLen > MAX_PAYLOAD_SIZE) {
        i += 2 // bad length: skip this start marker and resync
        continue
      }
      const total = 4 + payloadLen + 2
      if (merged.length - i < total) break // wait for the rest
      if (merged[i + 4 + payloadLen] !== END_1 || merged[i + 5 + payloadLen] !== END_2) {
        i += 2 // bad end marker: skip this start marker and resync
        continue
      }
      packets.push({
        type: merged[i + 2],
        payload: merged.slice(i + 4, i + 4 + payloadLen),
      })
      i += total
    }
    this.buffer = merged.slice(i)
    return packets
  }

  reset(): void {
    this.buffer = new Uint8Array(0)
  }
}

// Decode a VAR_UPDATE against the registry, mapping wire IDs to names.
// Unknown IDs are skipped (puppet.py behaves the same way).
export function resolveVarUpdate(
  payload: Uint8Array,
  registry: VarRegistry,
): { name: string; value: VarValue }[] {
  const out: { name: string; value: VarValue }[] = []
  for (const entry of decodeVarUpdate(payload)) {
    const info = registry.getById(entry.id)
    if (info) out.push({ name: info.name, value: entry.value })
  }
  return out
}
