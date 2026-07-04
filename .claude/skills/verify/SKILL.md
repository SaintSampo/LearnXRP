---
name: verify
description: Build, serve, and browser-drive LearnXRP to verify changes end-to-end
---

# Verifying LearnXRP changes

The app is a client-rendered React SPA served under the `/LearnXRP/` base
path. Fetching HTML proves nothing — drive it with Playwright.

## Recipe

```
npm run lessons:check    # validate all lesson JSON against the schema
npm run build            # typecheck + production build to dist/
npm run preview          # serves dist/ at http://localhost:4173/LearnXRP/  (background)
node scripts/verify-smoke.mjs <screenshot-dir>
```

`scripts/verify-smoke.mjs` clicks through the real UI: mode grid → Build
guide → checklist (:has strikethrough) → callout/inline markup → photo
slots → quiz (wrong answers, feedback, retry, score) → back to grid.
It exits non-zero on any failed check. Extend it as new modes land.

## Gotchas

- Playwright chromium must be installed once per machine:
  `npx playwright install chromium` (the headless shell is required —
  `--no-shell` installs are not enough).
- Screenshots go to the directory passed as argv[2] (use the session
  scratchpad, not the repo).
- Kill the preview server when done.
