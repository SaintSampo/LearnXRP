# LearnXRP

A learning platform for the NanoXRP educational robot: guided lessons,
a Blockly coding environment, a simulator, and direct drive control —
all in the browser, with robots connected over Bluetooth Low Energy.

See **`LearnXRP Project Plan.md`** for the full project plan and
**`WORKFLOW.md`** for how this repo is developed.

## Development

```
npm install
npm run dev
```

`npm run build` typechecks and produces the production bundle in `dist/`.

## Deployment

Pushes to `main` build and deploy to GitHub Pages via
`.github/workflows/deploy.yml`.

One-time repo setup: **Settings → Pages → Source: GitHub Actions.**
