# BabyBuddy Shadcn Frontend (WIP)

This folder contains the React + Tailwind foundation for the shadcn-based UI migration.
The `/ui-preview/` Django route loads the built files:
- `dist/preview.js`
- `dist/preview.css`

## Local usage

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
cd frontend
npm run build
```

The build artifacts can later be integrated into Django static files for production.
The current Dockerfile already copies these files to `static/babybuddy/shadcn/`.
