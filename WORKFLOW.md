# LearnXRP — Working with Claude Code

How to get the most value out of Claude Code while building LearnXRP.
`LearnXRP Project Plan.txt` is the source of truth for **what** to build;
this file is about **how** to build it efficiently.

## One-time setup (first session)

1. **`git init` before anything else.** Version control is what makes
   AI-assisted development safe: every change is diffable and revertible.
   Commit early and often — ask Claude to commit at each milestone.
2. Scaffold the app (Roadmap Phase 1 in the plan), then run `/init` to
   generate `CLAUDE.md`. Hand-edit it to include:
   - The stack: React, Vite, Tailwind, PWA (Capacitor in Phase 4).
   - The two load-bearing contracts: the **RobotDriver interface** and the
     **lesson JSON schema** (paste their TypeScript definitions once written).
   - Commands: dev server, build, test, deploy.
   - A pointer to `LearnXRP Project Plan.txt`.

   `CLAUDE.md` is loaded into every session — keep it short and high-signal,
   and update it whenever a decision in the plan changes.

## Session discipline (the biggest cost/quality lever)

- **One feature per session, one branch per feature.** Long meandering
  sessions cost more and produce worse output.
- `/clear` between unrelated tasks; `/compact` if a session must continue
  past a natural break.
- **Use plan mode (Shift+Tab) for anything non-trivial.** Claude writes an
  implementation plan; you review it *before* it writes code. Reviewing a
  plan costs pennies; untangling forty wrong files doesn't.
- Interrupt early (Esc) the moment you see it heading the wrong way.

## Model selection (bang for buck)

- **Sonnet is the default** for implementation: UI components, styling,
  wiring, CRUD. Fast, cheap, fully capable of this kind of web work.
- **Switch up (`/model`) to Opus or higher** for architecture decisions,
  the XPP protocol/driver code, and debugging that Sonnet circles on.
- Rule of thumb: *"build what's already decided"* → Sonnet;
  *"decide something"* → stronger model.

## Feed Claude references

The cheapest quality improvement available: give it a working example.

- The XPP reference implementation (Appendix A of the plan + the original
  JavaScript file).
- Library documentation URLs (Claude can fetch them).
- Screenshots of broken UI when reporting bugs.

## Repeatable workflows

- Custom slash commands live in `.claude/commands/`. Worth creating:
  - `new-lesson` — scaffold a lesson JSON matching the schema.
  - `deploy-check` — build, run CI checks, verify the Pages deploy.
- Hooks (settings.json) can auto-run Prettier/ESLint after every edit so
  formatting is never something you review by hand.

## Review & verification

- `/code-review` before merging each feature branch.
- `/security-review` specifically on: the local developer server, the
  translator suggestion endpoint, and Rosetta API-key handling.
- SCORM: CI validates package structure on every push; the SCORM Cloud
  upload job is manual (`workflow_dispatch`) — run it when export code
  changes (plan Section 8.8).

## Suggested session order

Mirrors the Roadmap (plan Section 9). Each line ≈ one session / branch:

1. Scaffold: Vite + React + Tailwind + PWA + GitHub Actions → Pages.
2. Lesson schema types + validation + lesson renderer.
3. RobotDriver interface + WebBluetoothDriver (paste the reference JS)
   + connection chip/wizard.
4. Simulator core: canvas, fixed-tick loop, SimDriver.
5. Code Lab: Blockly + diagnostics panel.
6. Profiles: IndexedDB, first-run flow, resume card.
7. Learn mode: embedded Code Lab, whitelist/ghost blocks/hints.
8. Quizzes + progress; Drive mode; Arcade mode.
9. Teacher: PIN, notes, SCORM export; profile export/import.
10. Developer editor + local server + image→WebP pipeline.
11. Rosetta Action + translator workflow + i18next.
12. Capacitor + NativeBleDriver + store builds.
