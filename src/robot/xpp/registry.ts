// XPP variable registry (plan Appendix A).
//
// Variables are addressed by numeric ID on the wire; the browser keeps a
// name <-> ID registry. The registry is pre-seeded with every known
// variable because (a) the robot never sends VAR_DEF for standard IDs and
// (b) VAR_DEF packets for the long custom names exceed the default BLE ATT
// MTU (20 bytes) and get silently truncated. Incoming VAR_DEFs are still
// merged (define()) so future firmware can add variables.
//
// IDs, names, types, and permissions must match puppet.py's
// _STANDARD_VAR_IDS and the custom IDs puppet_passthrough.py assigns
// sequentially from FIRST_CUSTOM_VAR_ID (38).

export const VarType = {
  Int: 1,
  Float: 2,
  Bool: 3,
} as const
export type VarType = (typeof VarType)[keyof typeof VarType]

export const VarPerm = {
  ReadOnly: 1,
  WriteOnly: 2,
  ReadWrite: 3,
} as const
export type VarPerm = (typeof VarPerm)[keyof typeof VarPerm]

export interface VarInfo {
  id: number
  name: string
  type: VarType
  perm: VarPerm
}

type SeedRow = [id: number, name: string, type: VarType, perm: VarPerm]

// Permissions are as the robot declares them: WriteOnly = browser -> robot.
const SEED: SeedRow[] = [
  // Gamepad (1-19): axes are floats, buttons/dpad/triggers are ints (0/1),
  // per gamepad.py. Drive mode writes these to puppet the robot.
  [1, '$gamepad.x1', VarType.Float, VarPerm.WriteOnly],
  [2, '$gamepad.y1', VarType.Float, VarPerm.WriteOnly],
  [3, '$gamepad.x2', VarType.Float, VarPerm.WriteOnly],
  [4, '$gamepad.y2', VarType.Float, VarPerm.WriteOnly],
  [5, '$gamepad.button_a', VarType.Int, VarPerm.WriteOnly],
  [6, '$gamepad.button_b', VarType.Int, VarPerm.WriteOnly],
  [7, '$gamepad.button_x', VarType.Int, VarPerm.WriteOnly],
  [8, '$gamepad.button_y', VarType.Int, VarPerm.WriteOnly],
  [9, '$gamepad.bumper_l', VarType.Int, VarPerm.WriteOnly],
  [10, '$gamepad.bumper_r', VarType.Int, VarPerm.WriteOnly],
  [11, '$gamepad.trigger_l', VarType.Int, VarPerm.WriteOnly],
  [12, '$gamepad.trigger_r', VarType.Int, VarPerm.WriteOnly],
  [13, '$gamepad.back', VarType.Int, VarPerm.WriteOnly],
  [14, '$gamepad.start', VarType.Int, VarPerm.WriteOnly],
  [15, '$gamepad.dpad_up', VarType.Int, VarPerm.WriteOnly],
  [16, '$gamepad.dpad_dn', VarType.Int, VarPerm.WriteOnly],
  [17, '$gamepad.dpad_l', VarType.Int, VarPerm.WriteOnly],
  [18, '$gamepad.dpad_r', VarType.Int, VarPerm.WriteOnly],
  [19, '$gamepad.enabled', VarType.Bool, VarPerm.ReadOnly],
  // IMU (20-25)
  [20, '$imu.yaw', VarType.Float, VarPerm.ReadOnly],
  [21, '$imu.roll', VarType.Float, VarPerm.ReadOnly],
  [22, '$imu.pitch', VarType.Float, VarPerm.ReadOnly],
  [23, '$imu.acc_x', VarType.Float, VarPerm.ReadOnly],
  [24, '$imu.acc_y', VarType.Float, VarPerm.ReadOnly],
  [25, '$imu.acc_z', VarType.Float, VarPerm.ReadOnly],
  // Encoders (26-29)
  [26, '$encoder.left', VarType.Int, VarPerm.ReadOnly],
  [27, '$encoder.right', VarType.Int, VarPerm.ReadOnly],
  [28, '$encoder.3', VarType.Int, VarPerm.ReadOnly],
  [29, '$encoder.4', VarType.Int, VarPerm.ReadOnly],
  // Current sensors (30-33)
  [30, '$current.left', VarType.Float, VarPerm.ReadOnly],
  [31, '$current.right', VarType.Float, VarPerm.ReadOnly],
  [32, '$current.3', VarType.Float, VarPerm.ReadOnly],
  [33, '$current.4', VarType.Float, VarPerm.ReadOnly],
  // Other sensors (34-37)
  [34, '$rangefinder.distance', VarType.Float, VarPerm.ReadOnly],
  [35, '$reflectance.left', VarType.Float, VarPerm.ReadOnly],
  [36, '$reflectance.right', VarType.Float, VarPerm.ReadOnly],
  [37, '$voltage', VarType.Float, VarPerm.ReadOnly],
  // Custom variables assigned by puppet_passthrough.py from ID 38.
  [38, '$puppet.motor.0', VarType.Float, VarPerm.WriteOnly],
  [39, '$puppet.motor.1', VarType.Float, VarPerm.WriteOnly],
  [40, '$puppet.motor.2', VarType.Float, VarPerm.WriteOnly],
  [41, '$puppet.motor.3', VarType.Float, VarPerm.WriteOnly],
  [42, '$puppet.servo.0', VarType.Float, VarPerm.WriteOnly],
  [43, '$puppet.servo.1', VarType.Float, VarPerm.WriteOnly],
  [44, '$puppet.servo.2', VarType.Float, VarPerm.WriteOnly],
  [45, '$puppet.servo.3', VarType.Float, VarPerm.WriteOnly],
  [46, '$puppet.drivetrain.stop', VarType.Bool, VarPerm.WriteOnly],
  [47, '$puppet.drivetrain.distance', VarType.Float, VarPerm.ReadWrite],
  [48, '$puppet.drivetrain.angle', VarType.Float, VarPerm.ReadWrite],
  [49, '$puppet.led', VarType.Bool, VarPerm.WriteOnly],
  [50, '$puppet.board_type', VarType.Int, VarPerm.ReadOnly],
  [51, '$puppet.button', VarType.Bool, VarPerm.ReadOnly],
]

export class VarRegistry {
  private byName = new Map<string, VarInfo>()
  private byId = new Map<number, VarInfo>()

  constructor() {
    for (const [id, name, type, perm] of SEED) {
      this.define({ id, name, type, perm })
    }
  }

  define(info: VarInfo): void {
    this.byName.set(info.name, info)
    this.byId.set(info.id, info)
  }

  get(name: string): VarInfo | undefined {
    return this.byName.get(name)
  }

  getById(id: number): VarInfo | undefined {
    return this.byId.get(id)
  }
}

// $puppet.board_type values, per the reference implementation.
export const BOARD_TYPE_NAMES = ['XRP Beta', 'XRP', 'NanoXRP']
