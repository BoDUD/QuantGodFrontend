# QuantGodFrontend

Vue 3 operator workbench for QuantGod.

This repository contains only frontend source:

- Vue 3 app shell and workspaces
- Ant Design Vue UI layer
- KlineCharts charting workspace
- Monaco Editor Vibe Coding workspace
- API service modules that call the backend under `/api/*`

Backend, infra automation, and canonical docs live in separate repositories:

- Backend: <https://github.com/Boowenn/QuantGodBackend>
- Infra: <https://github.com/Boowenn/QuantGodInfra>
- Docs: <https://github.com/Boowenn/QuantGodDocs>

## Development

Start the backend first:

```powershell
cd ..\QuantGodBackend
Dashboard\start_dashboard.bat
```

Then run the frontend dev server:

```powershell
cd ..\QuantGodFrontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/vue/
```

The Vite proxy forwards `/api/*` and `/QuantGod_*` requests to `QG_BACKEND_URL`, defaulting to `http://127.0.0.1:8080`.

## Production/local backend serving

```powershell
npm run build
cd ..\QuantGodInfra
python scripts\qg-workspace.py --workspace workspace\quantgod.workspace.json sync-frontend-dist
```

The sync command copies `QuantGodFrontend/dist` into `QuantGodBackend/Dashboard/vue-dist` so the backend can serve the workbench at `/vue/`.

## Safety

The frontend is read-only/review-first unless a backend API explicitly exposes a guarded operation. It must not read local JSON/CSV files directly; use `/api/*` facades instead.
