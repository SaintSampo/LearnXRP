---
description: Start the next LearnXRP roadmap session (find it, plan it, build it)
---

Start the next LearnXRP roadmap session:

1. Read the "Suggested session order" in WORKFLOW.md and run
   `git log --oneline` to determine which sessions are already done.
   The next session is the first one not yet represented in the log.
2. Announce which session you picked and why, then read the sections of
   "LearnXRP Project Plan.txt" that it touches (the session lines
   reference plan section numbers).
3. Present an implementation plan and wait for approval before writing
   any code (CLAUDE.md hard rule 3).
4. After approval: implement the session, extend
   `scripts/verify-smoke.mjs` to cover what you added, and verify using
   the repo verify skill (`.claude/skills/verify`).
5. Commit with a descriptive message — no Claude attribution of any
   kind — and push to `main` only if verification passed.

If anything in the plan conflicts with what you find in the code, stop
and surface it before proceeding.
