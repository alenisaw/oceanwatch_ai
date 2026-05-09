# OceanWatch AI Deployment Notes

OceanWatch is designed to run reliably on a local laptop or small CPU cloud service first.
GPU acceleration is a future backend integration, not a current detection claim.

## Local Demo

Start the backend:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
pip install -e ".[api,dev,vision]"
uvicorn oceanwatch.api.app:create_app --factory --host 127.0.0.1 --port 8000
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The Vite dev proxy sends `/api` requests to
`http://127.0.0.1:8000`. Check backend runtime with:

```powershell
curl http://127.0.0.1:8000/runtime
```

## CPU Docker Demo

Build and run the CPU image:

```powershell
docker build -f docker/Dockerfile -t oceanwatch-api .
docker run --env-file .env.example -p 8000:8000 oceanwatch-api
```

This image installs API and vision extras only. It does not install ROCm, CUDA, model
weights, or large ML assets.

## DigitalOcean App Platform

`deploy/digitalocean/app.yaml` points at `alenisaw/oceanwatch_ai`, uses the CPU Dockerfile,
and keeps `OCEANWATCH_MODEL_BACKEND=deterministic`.

The app spec sets `OCEANWATCH_CORS_ORIGINS=${APP_URL}`, which DigitalOcean expands
to the live app URL. Add any separate custom frontend domains to this comma-separated
value in the App Platform dashboard.

## Future Remote AMD GPU Worker Plan

Use these variables when a trusted GPU worker service exists:

```env
OCEANWATCH_MODEL_BACKEND=remote_gpu
OCEANWATCH_REMOTE_GPU_URL=https://your-worker.example.com
OCEANWATCH_REMOTE_GPU_TIMEOUT=60
```

`src/oceanwatch/inference/remote_worker.py` contains a safe HTTP scaffold. The current
pipeline does not send full tile bytes to a worker yet, so the production model handoff
still needs to be implemented and validated.

## ROCm Checklist

Before claiming ROCm acceleration, verify:

- AMD GPU host with ROCm-compatible drivers is available.
- Container has access to `/dev/kfd` and `/dev/dri`.
- PyTorch reports `torch.cuda.is_available() == True`.
- `/runtime` reports `"runtime": "rocm"` and a real `hip_version`.
- Benchmarks are run against the real model backend, not the deterministic baseline.

## ROCm Docker Skeleton

Build the future ROCm image:

```powershell
docker build -f docker/Dockerfile.rocm -t oceanwatch-rocm .
```

Example run command for an AMD GPU host:

```powershell
docker run --device=/dev/kfd --device=/dev/dri --group-add video -p 8000:8000 oceanwatch-rocm
```

The image is intentionally separate from the default Dockerfile so local users and CI do
not pull heavy GPU dependencies.

## Hackathon Notes

- Default demo mode is deterministic and CPU-safe.
- Map and report language should say possible oil-like anomaly, not confirmed detection.
- `/benchmark` reports the actual runtime plus `deterministic-demo-baseline`.
- `/runtime` is the fastest way to verify whether a laptop, Docker image, or server has
  CPU, CUDA, or ROCm available.
