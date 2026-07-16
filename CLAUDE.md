# LearnXRP

Cross-platform learning platform for the NanoXRP educational robot
(two-wheeled, ultrasonic sonar, line-following sensors, IMU, motors with
encoders). Robots are controlled from the browser over BLE.

**`LearnXRP Project Plan.md` is the source of truth** for all product and
architecture decisions. `WORKFLOW.md` describes how to work on this repo
(session discipline, build order). Read the relevant plan section before
implementing a feature.

## Hard rules — every session, no exceptions

1. **Never add Claude attribution to git history.** No `Co-Authored-By`
   trailers, no "Generated with" lines, in commits, PRs, or anywhere else.
2. **One roadmap session per Claude session.** The next session is the
   first item in WORKFLOW.md's "Suggested session order" not yet in
   `git log`. Don't scope-creep into the next one.
3. **Plan before building.** For anything non-trivial, present a plan and
   get approval before writing code.
4. **Verify before committing.** Use the repo verify skill
   (`.claude/skills/verify`): `npm run lessons:check`, `npm run build`,
   then drive the real UI with `scripts/verify-smoke.mjs`. Extend the
   smoke script to cover what the session added.
5. **Pushing to `main` deploys publicly** (GitHub Pages). Commit at the
   session milestone; only push working, verified code.
6. **If a decision changes, update `LearnXRP Project Plan.md`** in the
   same session — the plan and the code must not drift apart.

## Stack

- React 19 + TypeScript + Vite, Tailwind CSS v4 (via `@tailwindcss/vite`)
- PWA via `vite-plugin-pwa`, `registerType: 'prompt'` (never swap versions
  mid-lesson)
- Deployed to GitHub Pages by `.github/workflows/deploy.yml` on push to
  `main`; Vite `base` is `/LearnXRP/`
- Phase 4 adds Capacitor builds for Android/iOS (native BLE plugin)

## Commands

- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc --noEmit`) + production build
- `npm run preview` — serve the production build locally
- `npm run lessons:check` — validate all lesson JSON against the schema
- `node scripts/verify-smoke.mjs <shot-dir>` — Playwright drive of the
  built app (needs `npm run preview` running)

## Architecture rules (from the plan)

- **All robot control goes through the `RobotDriver` interface** (plan 8.1):
  WebBluetoothDriver / NativeBleDriver / SimDriver. Blocks, Drive mode, and
  diagnostics never touch a transport directly.
- **Lessons are structured JSON** per the schema in plan 8.2, implemented
  in `src/lessons/schema.ts` (zod), with lesson data in
  `public/lessons/<id>/lesson.json` — never ad-hoc HTML. Block ids are
  stable translation anchors: never change one after publish. Build guides
  and Arcade challenges reuse the same schema/config.
- **Simulator is NOT physics-based**: arcade-style kinematics on a fixed
  logic tick (plan 6.3).
- **Wire protocol** (XPP over BLE) is specified in plan Appendix A. Routine
  control values use write-without-response; emergency stop and
  PROGRAM_START/END use write-with-response.
- Mode names: Build, Learn, Code Lab, Drive, Arcade.
- Use Tailwind logical utilities (`ms-*`, `pe-*`, `text-start`) — layouts
  must work RTL (plan 8.5). UI strings move to i18next in Phase 3; keep
  strings easy to extract.
- Accessibility is a requirement (plan 8.6): keyboard nav, labels,
  contrast, `prefers-reduced-motion`.

## Conventions

- The deployed app is fully static — no production backend. Developer-only
  features run against a localhost server (plan 8.9).
- No unit tests for the XPP codec or simulator (deliberate decision);
  SCORM export gets package-structure tests in CI (plan 8.8).
