# LearnXRP — Project Plan

## Overview

LearnXRP is a cross-platform learning platform for the NanoXRP robot — a small
two-wheeled educational robot with an ultrasonic sonar, line-following sensors,
an IMU, and motors with encoders.

Built with React, Vite, and Tailwind CSS. Ships as an installable PWA on
desktop (offline-capable via a service worker) and as Capacitor store apps on
Android and iOS. Uses the most modern web features. Compact and efficient.

## 1. Core definitions

**Lesson** — An atomic unit of content containing text and images. Users click
through pages and take a quiz at the end, similar to a SCORM file.

**Unit** — A collection of lessons.

**Mode** — How the user chooses to use LearnXRP. One of:

| Mode | What it is |
| --- | --- |
| **Build** | Hands-on assembly guides (Section 6.5) |
| **Learn** | Guided lessons (Section 6.2) |
| **Code Lab** | The development environment (Section 6.1) |
| **Drive** | Direct robot control via gamepad or touch (Section 6.4) |
| **Arcade** | Standalone simulator challenges (Section 6.3) |

**Profile** — A user must create a profile before using the app.

- Stored on the device in IndexedDB (see Section 8.3).
- Contains: name, user type, lesson/unit progress, and the user's saved
  programs.
- Displayed at the top of the app with the user's name. Clicking it opens a
  profile popup where users can:
  - Edit their profile
  - Create new profiles
  - View their progress (e.g., progress a teacher can review)

**Platform** — The device class LearnXRP runs on: desktop, tablet, or phone.

**OS** — Supported operating systems: Windows, ChromeOS, Linux, macOS, iOS,
Android.

## 2. Language & translation

LearnXRP supports all languages, in two ways:

1. **App UI translation** — The site uses dynamic JSON translation keys, and
   leverages Tailwind's logical/flow-relative utilities (`ms-*`, `pe-*`,
   `text-start`, etc.) so layout and spacing automatically adapt to any
   language direction (LTR/RTL). Implemented with i18next and ICU message
   syntax — see Section 8.5.

2. **Lesson translation — "Rosetta Action"** — Lessons are translated
   separately through a dedicated UI available to the Developer user type:
   - The developer selects a lesson and a target language.
   - Translation is performed by Claude (Sonnet 5), and the developer watches
     the translation happen in real time.
   - The UI requires an Anthropic API key.
   - All prompts for Claude are built into Rosetta Action, so the experience
     is seamless for the developer.

## 3. User types

### Student (primary user type)

The main audience for the platform.

### Teacher

Has access to additional features:

- Notes built into lessons
- Unrestricted access to content
- Export any lesson as a SCORM file
- Export any unit as a zipped folder of SCORM files

SCORM exports must open content in a new window so the window has the browser
features it needs (e.g., Web Bluetooth). Implementation details: Section 8.8.

Teacher mode is gated by the teacher PIN (see Section 5, first-run flow).

### Translator

Reviews translations. On any lesson page, a translator can submit suggestions
to edit a translation.

Security note: translator input must be handled cautiously — translators must
not be able to damage the host machine.

### Developer

Full access. ONLY available when the app is run locally.

- UI to start, stop, and share a free.pinggy.io tunnel link.
- Every lesson doubles as an editor: the developer can change text, text
  style, and images at will. (Keep the editor simple for now — units and
  lessons will be created manually; the editor only needs easy
  text/style/photo editing.)
- Images are added by dragging and dropping them into place. The editor
  accepts JPG, PNG, and WebP, and automatically converts everything to WebP
  on save.
- Can view, approve, or decline translator suggestions.
- Has access to Rosetta Action (see Section 2).

### Visibility rules

- Hosted publicly (GitHub Pages): only Student and Teacher are visible.
- Translator: only available via a shared free.pinggy.io link.
- Developer: only available when running locally.

## 4. Platform support

| Platform | Distribution | Users | Modes |
| --- | --- | --- | --- |
| **Desktop** | Webpage / installable PWA (works offline after the first load; updates prompt the user to reload rather than swapping versions mid-lesson) | All user types | Fully featured: all modes |
| **Tablet** | Capacitor app via Google Play / Apple App Store | Student and Teacher only | All modes: Build, Learn, Code Lab (via native BLE), Drive, and Arcade — tablets are big enough for Blockly and the simulator side by side |
| **Phone** | Capacitor app via Google Play / Apple App Store | Student and Teacher only | Exactly two modes: Drive and Build. No Code Lab and no simulator — Blockly does not work on a phone-sized screen |

**Input considerations (touch vs. mouse):** The UI must account for whether
the user is on touch or mouse input — e.g., larger touch targets, no
hover-dependent interactions on touch, and appropriate spacing/controls for
each input method.

**Browser capability gate (governing rule, applies app-wide):** If the
browser has no Web Bluetooth, the user is not offered the normal mode grid at
all — they get a dedicated page that explains why and guides them to a
platform that works:

- iOS (no iOS browser has Web Bluetooth): download the app.
- Android: the app is suggested, but users may still use LearnXRP in a
  supported browser (e.g., Chrome).
- Unsupported browsers everywhere (Safari, Firefox): switch to a browser with
  Web Bluetooth — Chrome, Edge, or Opera.

## 5. Main page

The main page is where users select their mode. A grid of mode tiles takes up
most of the page. The user's profile is displayed at the top.

**First-run flow (streamlined for students):**

- Every user is assumed to be a Student. First launch shows one screen with
  one field — "What's your name?" — which creates a Student profile and lands
  on the main page. Thirty kids should be working within two minutes of class
  starting.
- A "Skip for now" option creates a Guest profile that can be named and
  converted later.
- A small "I'm a teacher" link on that screen (and a "Switch to teacher"
  option in the profile popup) opens teacher setup, gated by the teacher PIN:
  **4561**. The PIN is a deterrent against curious students, not real
  security — everything is client-side, and the stakes are lesson notes, not
  grades.
- There is no separate teacher URL: one URL, role stored in the profile.

**Resume affordance:** Returning users see a "Continue" card as the first
tile — e.g., "Continue: Lesson 3 — Sonar Sensor" — that takes them straight
back to where they left off, instead of re-navigating from scratch each
session.

## 6. Modes

### 6.1 Code Lab (development environment)

The user has full access. Code Lab is a Blockly editor that controls a robot
over BLE. Users can connect to and disconnect from a robot from within the
editor. All robot control goes through the RobotDriver interface
(Section 8.1), so the same blocks drive the real robot or the simulator
unchanged.

**Live diagnostics:** Whenever a robot is connected, Code Lab displays live
diagnostics — primarily battery level (from `$voltage`), drawing on the
telemetry values below.

**Blocks / BLE protocol:**

Control commands (browser → robot):

| Variable | Type | Description |
| --- | --- | --- |
| `$puppet.motor.0` – `$puppet.motor.3` | float, write | Set individual motor effort, −1.0 to 1.0 |
| `$puppet.servo.0` – `$puppet.servo.3` | float, write | Set servo angle, 0–180° (default 90) |
| `$puppet.drivetrain.stop` | bool, write | Emergency-stop the drivetrain |
| `$puppet.drivetrain.distance` | float, r/w | Drive straight a given distance in cm |
| `$puppet.drivetrain.angle` | float, r/w | Turn in place by a given angle in degrees |
| `$puppet.led` | bool, write | Toggle the onboard LED |

Status / telemetry (robot → browser, read-only):

| Variable | Type | Description |
| --- | --- | --- |
| `$puppet.board_type` | int | Board type, mapped to "XRP Beta", "XRP", or "NanoXRP" |
| `$puppet.button` | bool | Onboard button (pressed/open) |
| `$imu.yaw` / `$imu.roll` / `$imu.pitch` | float | IMU orientation |
| `$imu.acc_x` / `$imu.acc_y` / `$imu.acc_z` | float | IMU acceleration |
| `$encoder.left` / `$encoder.right` / `$encoder.3` / `$encoder.4` | int | Encoder counts |
| `$rangefinder.distance` | float | Rangefinder distance |
| `$reflectance.left` / `$reflectance.right` | float | Reflectance sensors |
| `$voltage` | float | Battery voltage |

(See Appendix A for the wire protocol these variables travel over.)

### 6.2 Learn (guided lessons)

Lessons can grant the user access to Code Lab, and this access must be highly
customizable:

- Whitelist/blacklist blocks to control exactly what the user sees.
- Place "ghost blocks" as hints.
- Support a rich hint system.
- Animated tooltips.

### 6.3 Simulator & Arcade

Code Lab also supports an internal simulator: like a Flash game, the editor
controls a top-down digital robot instead of a real one.

The simulator is **NOT** physics-engine based. It plays like a classic
Flash-era browser game (without Flash): simple arcade-style kinematic
movement — the robot moves, turns, and senses according to straightforward
game rules, updated on a fixed logic tick so behavior is identical on every
device and framerate.

- The simulated space is customizable with obstacles.
- Used to teach drive commands, sonar sensing, line following, and more.
- Highly configurable per lesson. Example: in the sonar lesson, the user can
  switch to a "robot view" with limited vision, just like the real robot —
  they can only see sonar pulses.

The simulator is accessible two ways:

1. Embedded inside Learn lessons.
2. As the standalone mode "Arcade" (simulator challenges).

Arcade challenges are authored as data, like lessons: each challenge is a
sim-embed world config (obstacles, lines, view mode) plus a goal / win
condition.

Desktop and tablet only (see Section 4): the simulator requires the Blockly
editor and the simulated field on screen side by side, and Blockly does not
work on a phone-sized screen.

### 6.4 Drive (direct control)

The student controls the robot directly, using either on-screen touch
controls or a physical gamepad plugged into their device.

### 6.5 Build (assembly guides)

Hands-on assembly guides as their own top-level mode — no Blockly, and it
works well on a phone propped up next to the parts.

Build guides are NOT part of any Learn unit. Build mode is effectively its
own unit containing one build lesson per robot — just the NanoXRP guide for
now; guides for more robots may be added in the future.

Build guides reuse the standard lesson structure (same schema, Section 8.2),
so the developer editor, translation tooling, and SCORM export all work on
them unchanged. Available on every platform.

## 7. Initial content

### Unit: Learn NanoXRP

- **Lesson 1 — Making the Robot Drive** (in the simulator)
- **Lesson 2 — Make the Robot Drive in Real Life**
- **Lesson 3 — Sonar Sensor** (echolocation, stop-before-wall, gradual
  slowdown)
- **Lesson 4 — Line-Following Sensor**

### Build mode: NanoXRP Build Guide

(Its own single-lesson unit, separate from Learn units — see Section 6.5.)

- Parts checklists (plastics + electronics) as interactive checkboxes with
  strikethrough on check (CSS `:has`).
- Safety slide.
- Then 5 assembly steps, with a photo slot before every step:
  1. Connect motor wires and battery to the board.
  2. Press wheels on (nub toward motor; don't push on the encoder magnet).
     Press motors and casters into the flipped chassis (encoder ports facing
     down).
  3. Route wires through the rear wheel wells.
  4. Clip on the bottom plate (check line-follow sensor orientation) and plug
     the motor wires into the motors.
  5. Connect the sonar (be gentle with the 4-pin Dupont connector), slide it
     into the chassis, and clip the battery cover snug against the sonar.

## 8. Architecture & engineering decisions

### 8.1 RobotDriver — one robot interface, three implementations

All robot control in the app goes through a single RobotDriver interface:

```
connect() / disconnect()
sendVar(name, value)      — write a control variable
onTelemetry(callback)     — subscribe to telemetry updates
connectionState           — idle / connecting / connected / reconnecting
```

Three implementations:

1. **WebBluetoothDriver** — Chromium desktop browsers. Speaks XPP over Web
   Bluetooth (Appendix A).
2. **NativeBleDriver** — Capacitor iOS/Android builds. Speaks the same XPP
   protocol through a native BLE plugin (e.g.,
   `@capacitor-community/bluetooth-le`), because WebViews on iOS have no Web
   Bluetooth.
3. **SimDriver** — drives the simulator robot; no hardware involved.

Blockly blocks, Drive mode, live diagnostics, and lessons target ONLY this
interface — they never know which transport is underneath. This is what lets
the same blocks run against the real robot or the simulator unchanged.

### 8.2 Lesson content schema

Lessons are structured JSON, not ad-hoc HTML: metadata (id, title, unit,
version) plus an ordered list of typed content blocks:

| Block | Contents |
| --- | --- |
| `text` | Rich text with a limited, well-defined style set |
| `image` | Source, alt text, caption |
| `checklist` | Interactive checkboxes (strikethrough on check) |
| `quiz` | Questions, choices, correct answers, feedback |
| `de-embed` | Embedded Code Lab editor: block whitelist/blacklist, ghost blocks, hints, driver (real or sim) |
| `sim-embed` | Embedded simulator: world config (obstacles, lines, view mode such as "robot view") |
| `teacher-note` | Visible only to Teacher users |

Every user-visible string is a translatable segment with a stable ID.
Translations are stored per lesson, per language, as separate JSON files.
Each translated segment stores a hash of its source segment, so when the
source text changes the translation is automatically flagged stale. Each
translation carries a status: machine / human-reviewed.

The developer editor, Rosetta Action, translator suggestions, quizzes, and
SCORM export all operate on this one schema.

### 8.3 Storage

- IndexedDB (via a wrapper such as Dexie), NOT localStorage — profiles,
  progress, and saved programs would exceed localStorage quotas. (Translator
  suggestions live on the developer's machine via the local server —
  Section 8.9.)
- Every stored record carries a schema version number so future releases can
  migrate data instead of wiping it.
- Profile export/import: a profile (progress + saved programs) can be
  exported to a file and imported on another device. This doubles as the
  lightweight teacher workflow: students export progress, the teacher imports
  it to review.
- Optional future feature: students can save and load their work to the cloud
  via Google OAuth.

### 8.4 Security

Accepted risks:

- The developer editor shipping in the public bundle is not a concern — it
  only edits content that is already public.
- Profiles on shared devices have no authentication between them; any user on
  a device can open any profile stored on that device.

Pinggy tunnel (translator access):

- The tunnel serves a restricted translator build, never the full dev
  environment. No file-write endpoints are reachable through the tunnel.
- Translator suggestions are untrusted data: stored as plain text/JSON,
  rendered escaped (never innerHTML), size-limited and rate-limited.
- Suggestions queue pending explicit developer approval; nothing a translator
  submits ever executes or writes to disk directly.
- The tunnel link is revocable at any time by stopping the tunnel.

Anthropic API key (Rosetta Action):

- Held in memory only for the session — never persisted to localStorage,
  IndexedDB, or disk.
- Entered through a masked input each session.
- The Rosetta UI (and any code path touching the key) is excluded from
  tunnel-shared and public builds.

### 8.5 Internationalization implementation

- i18next with ICU message syntax — handles pluralization, gender, and
  number/date formatting correctly, which raw JSON key lookup cannot.
- Keep the Tailwind logical/flow-relative utilities (`ms-*`, `pe-*`,
  `text-start`) for automatic LTR/RTL layout adaptation.
- Budget for font fallbacks: CJK and Arabic scripts need explicit, tested
  font stacks for weight and legibility.

### 8.6 Accessibility

Designed in from the start (target: WCAG 2.1 AA / Section 508 / EN 301 549,
commonly required for school purchasing):

- Full keyboard navigation.
- Screen-reader labels on all interactive elements.
- Sufficient color contrast in both light and dark themes.
- Font scaling without layout breakage.
- All animations — including animated tooltips — respect
  `prefers-reduced-motion`.

### 8.7 BLE connection UX

A persistent connection chip plus a first-run connect wizard, shared by every
mode that talks to a robot.

**Connection chip** — Always visible wherever a robot can be used: gray "Not
connected", pulsing while connecting, green with live battery voltage when
connected. Clicking it opens the connect wizard (first time) or the
diagnostics panel (once connected).

**Pre-flight capability check** — If `navigator.bluetooth` (or the native BLE
plugin) is unavailable, no connect button is shown — the browser capability
gate (Section 4) takes over.

**Connect wizard** (first-time flow, with animated illustrations):

1. Turn the robot on — show where the LED is and what "ready" looks like.
2. Press Connect — prepare the user for the native device chooser: "a list
   will pop up; pick the robot named XRP-…".
3. Connecting / handshake indicator.
4. Success state showing battery level.

After the first successful connection, returning users get one-click connect
instead of the wizard.

**Error mapping** — every failure produces specific advice:

- `NotFoundError` (cancelled / nothing found): Is the robot on? Is the
  battery charged? Is it within a few feet? Is it already connected to
  another tab or device?
- Timeout: power-cycle the robot and retry.
- `SecurityError`: HTTPS / permission guidance.

**Auto-reconnect** — Keep the device handle after first pairing. On
unexpected disconnect, silently retry `gatt.connect()` 2–3 times with backoff
behind a "Reconnecting…" toast; only surface the wizard if that fails.

**Low battery** — Check `$voltage` immediately on connect; below a threshold,
warn that the robot may behave erratically.

**Classroom reality** — Many robots advertise similar names. Physically label
each robot to match its BLE name, and have the wizard say "pick the name on
your robot's sticker."

### 8.8 SCORM export implementation

Target SCORM 1.2 (maximum LMS compatibility; SCORM 2004 adds sequencing
features we don't need). A package is a zip with `imsmanifest.xml` at the
root plus content files.

Launcher architecture (solves Web Bluetooth inside an LMS):

- The file the LMS loads in its iframe is a small LAUNCHER page, not the
  lesson itself.
- The launcher discovers the SCORM API (`window.API`, walking parent frames —
  use the pipwerks SCORM wrapper) and calls `LMSInitialize`.
- A "Launch Lesson" button `window.open()`s the real lesson player in a
  top-level window: the user gesture defeats popup blockers, and the
  top-level window gets full Web Bluetooth access outside the LMS iframe.
- The player postMessages progress and quiz results back to the launcher,
  which relays them to the LMS: `cmi.core.score.raw` for the quiz score,
  `cmi.core.lesson_status` (completed / passed / failed), then `LMSCommit` /
  `LMSFinish`.

Export pipeline (runs client-side, since teachers trigger it):

- Bundle a prebuilt "player" build of the app + the lesson JSON + images.
- Generate `imsmanifest.xml` from lesson metadata.
- Zip with fflate (or JSZip) and download.
- Unit export = a zip of per-lesson SCORM zips.

Testing:

- Every CI run: unit tests validate package structure — manifest is
  well-formed and references real files, launcher is present, zip layout is
  correct.
- Manually triggered CI job (`workflow_dispatch`): build a sample package,
  upload it via the SCORM Cloud API, assert the import succeeds. Run when
  export code changes.

### 8.9 Local developer server

The deployed app (GitHub Pages, store apps) is fully static — no backend
exists in production. When the app runs locally as the Developer, a small
local server (Vite dev middleware or a small Node process) provides:

- Write endpoints for the lesson editor: saving lesson JSON and images back
  into the repo (images converted to WebP on save — Section 3, Developer).
- The translator suggestion queue: receiving suggestions submitted through
  the pinggy tunnel and storing them for developer review.
- The pinggy tunnel start/stop controls.

Only the suggestion-submission endpoint is reachable through the tunnel (see
Section 8.4); file-write endpoints bind to localhost only.

## 9. Roadmap

Each phase ships something usable on its own.

### Phase 1 — Playable core (desktop web, English, Student only)

- Scaffold: React + Vite + Tailwind + PWA plugin; GitHub Actions CI deploying
  to GitHub Pages.
- Lesson schema (8.2) + lesson renderer.
- Profiles: IndexedDB, first-run flow, schema versioning.
- RobotDriver interface + WebBluetoothDriver + connection UX (8.7).
- Code Lab: Blockly editor + live diagnostics.
- Simulator core: fixed-tick game loop + SimDriver.
- Content: NanoXRP Build guide + Lessons 1–2.

### Phase 2 — Classroom ready

- Learn mode: embedded Code Lab (whitelist/blacklist, ghost blocks, hints,
  animated tooltips), quizzes, progress tracking, resume card.
- Drive mode (touch + gamepad) and Arcade mode.
- Teacher user type: PIN, lesson notes, unrestricted access.
- SCORM export (8.8) + profile export/import.
- Content: Lessons 3–4.

### Phase 3 — Content pipeline

- Developer editor + local developer server (8.9), drag-and-drop
  image → WebP pipeline.
- Rosetta Action (Claude Sonnet 5) with staleness tracking.
- Translator build + pinggy tunnel + suggestion review workflow.
- App UI translation via i18next; CJK/Arabic font fallbacks.
- Accessibility pass (8.6).

### Phase 4 — Mobile

- Capacitor builds + NativeBleDriver.
- Platform gating polish (phone/tablet mode availability, Section 4).
- Google Play and Apple App Store submissions.

## Appendix A — XPP protocol over BLE (implementation reference)

The browser talks to the robot using the XPP protocol, which must match
`puppet.py` on the robot. Summary of the reference implementation:

### Packet framing

Every message is framed as:

```
[0xAA 0x55] [msg type] [payload length] [payload...] [0x55 0xAA]
```

Message types:

| Code | Type | Meaning |
| --- | --- | --- |
| `0x01` | VAR_DEF | Robot announces a variable (name, type, perms, ID) |
| `0x02` | VAR_UPDATE | One or more variable values (either direction) |
| `0x05` | PROGRAM_START | Handshake; sent by browser on connect, echoed by the robot |
| `0x06` | PROGRAM_END | |

Values are little-endian: float32 and int32 are 4 bytes, bool is 1 byte.
Variables carry a type (int / float / bool) and a permission (read-only /
write-only / read-write).

### Variable registry (pre-seeded, no handshake dependency)

Variables are addressed by numeric ID on the wire; the browser keeps a
name ↔ ID registry.

- IDs 20–37: standard variables defined in `puppet.py` (`_STANDARD_VAR_IDS`)
  — IMU, encoders, rangefinder, reflectance, voltage. The robot never sends
  VAR_DEF for these.
- IDs 38–51: custom variables assigned sequentially by
  `PuppetPassthrough.py` — motors, servos, drivetrain, LED, board type,
  button. Their VAR_DEF packets exceed the default BLE ATT MTU (20 bytes) and
  get silently truncated.

Because of both limitations, the browser pre-seeds the full registry at
startup instead of relying on the VAR_DEF handshake (though incoming VAR_DEFs
are still parsed and merged).

### BLE transport (Web Bluetooth)

- Device discovery filters on name prefix "XRP".
- Nordic UART service (`6e400001-b5a3-f393-e0a9-e50e24dcca9e`) with two
  custom data characteristics:

  | Characteristic | UUID suffix | Direction |
  | --- | --- | --- |
  | RX | `...36fe` | notify — robot → browser (telemetry) |
  | TX | `...36ff` | write — browser → robot (commands) |

- Writes go through a promise queue. Routine control values (motors, servos,
  drivetrain distance/angle, LED) use write-WITHOUT-response for speed;
  critical commands (drivetrain emergency stop, PROGRAM_START/END) use
  write-WITH-response so they are never silently dropped.
- Incoming notifications are scanned for complete, well-framed packets;
  malformed bytes are skipped.

### Connection lifecycle

1. User clicks the connect button; browser scans and connects.
2. Browser sends PROGRAM_START; the robot replies with PROGRAM_START.
3. On connect (and again on the robot's PROGRAM_START), the browser sends
   safe initial values: motors 0.0, servos 90.0, drivetrain.stop false,
   drivetrain distance/angle 0.0, LED off.
4. A connection status badge shows state (scanning / connected / disconnected
   / error), and the robot's disconnect event resets the UI.

### Safety behaviors

- When the browser tab loses focus, an emergency drivetrain stop is sent.
- The UI stop button sends `$puppet.drivetrain.stop` and zeroes all motors.

### Telemetry display

Incoming VAR_UPDATEs drive live UI elements per variable (IMU, encoders,
sonar, reflectance, voltage). `$voltage` also feeds a battery badge
(formatted to 0.1 V) — this is the basis for the live diagnostics described
in Section 6.1. `$puppet.board_type` maps int values to "XRP Beta" / "XRP" /
"NanoXRP"; `$puppet.button` renders pressed/open state.

### Input handling reference

The example UI implements sliders (servo angle, motor effort with a
snap-to-zero dead zone) that handle both mouse and touch drag events — a
working reference for the touch-vs-mouse considerations in Section 4.
