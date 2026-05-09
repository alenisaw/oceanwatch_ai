# OceanWatch AI

OceanWatch AI is a marine pollution triage prototype for SAR imagery. It provides:

- a FastAPI backend for demo analysis, uploaded tile analysis, batch analysis, benchmark data, and incident map feeds;
- a React/Vite frontend with global map, single tile analysis, batch analysis, incident log, benchmark, and settings screens;
- a deterministic CPU-safe demo pipeline for local development and CI.

## Run Locally

Use Python 3.10+ and Node.js 20+.

### Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
pip install -e ".[api,dev,vision]"
uvicorn oceanwatch.api.app:create_app --factory --host 127.0.0.1 --port 8000
```

Backend URLs:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/runtime`
- `http://127.0.0.1:8000/docs`

Check the active runtime:

```powershell
curl http://127.0.0.1:8000/runtime
```

### Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

The frontend defaults to the same-origin `/api` proxy. If the backend runs on another port or host, set `VITE_API_URL` or update the Backend URL in the Settings tab.

## Runtime Modes

OceanWatch defaults to a CPU-safe deterministic demo baseline. This keeps local laptops,
CI, and small cloud deployments reliable without GPU dependencies.

| Mode | Environment | Notes |
|---|---|---|
| Deterministic CPU | `OCEANWATCH_MODEL_BACKEND=deterministic` | Default local and CI path. |
| Remote GPU scaffold | `OCEANWATCH_MODEL_BACKEND=remote_gpu` plus `OCEANWATCH_REMOTE_GPU_URL` | Reserved for a future trusted worker service. |
| ROCm container skeleton | `docker/Dockerfile.rocm` | Prepared for AMD GPU hosts, not enabled by default. |

Use `/runtime` to inspect whether PyTorch, CUDA, or ROCm is actually available. The
demo pipeline should still describe outputs as possible oil-like anomalies until
analyst review confirms them.

## Useful Commands

```powershell
python -m pytest -q
python -m ruff check .
cd frontend
npm run build
```

Run synthetic pipeline artifacts:

```powershell
python scripts/run_demo.py --output outputs/demo
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for local demo, CPU Docker, and future
ROCm deployment notes.

## Repository Layout

```text
oceanwatch_ai/
  docker/
  frontend/
  scripts/
  src/oceanwatch/
  tests/
  pyproject.toml
  README.md
```

Ignored local-only folders include `.agent/`, `.venv/`, `frontend/node_modules/`, `frontend/dist/`, runtime outputs, and local environment files.

## Notes

This is a decision-support prototype. SAR oil-spill detection has known look-alike risks, including low-wind zones, biogenic films, natural surface effects, waves, and upwelling. Analyst verification is required before response or enforcement decisions.
