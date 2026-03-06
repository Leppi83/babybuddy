# BabyBuddy Ant Frontend (WIP)

This folder contains the React + Ant Design frontend for the UI migration.
The build writes directly into Django static files:
- `babybuddy/static/babybuddy/ant/app.js`
- `babybuddy/static/babybuddy/ant/app.css`

## Local usage

```bash
cd frontend
npm install
npm run build
```

The Dockerfile builds this frontend during image creation.
