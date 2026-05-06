# OceanWatch AI

![CI](https://github.com/alenisaw/oceanwatch-ai/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

OceanWatch AI is a multimodal marine pollution triage assistant.

It turns satellite imagery into a pollution mask, severity score, uncertainty-aware report, and structured JSON output.

```text
Satellite pixels → pollution mask → severity → report → JSON/API
```

---

**Overview** · **Pipeline** · **Quickstart** · **Repository** · **Deployment** · **Limitations**

---

## Overview

OceanWatch AI is designed for first-pass analysis of Sentinel-1 SAR imagery. The MVP focuses on possible oil-like anomaly triage, not legal or scientific confirmation.

| Layer | Purpose |
|---|---|
| SAR preprocessing | Normalize VV/VH channels and prepare model input |
| Segmentation | Produce a probability map and binary mask |
| Post-processing | Estimate affected ratio, regions, confidence, and risk |
| Reporting | Generate an uncertainty-aware incident report |
| Export | Return API-ready JSON for dashboards and downstream systems |

Correct output language:

```text
Possible oil-like anomaly detected. Analyst verification is recommended.
```

Incorrect output language:

```text
Confirmed illegal oil spill detected.
```

---

## Pipeline

```text
Input SAR tile
  ↓
Preprocess VV/VH channels
  ↓
Segmentation inference
  ↓
Mask post-processing
  ↓
Severity + confidence scoring
  ↓
Template or VLM incident report
  ↓
JSON/API export
```

The current scaffold ships with a deterministic demo predictor so the repository can run, test, and pass CI before model checkpoints are added. It also writes preview and mask overlay images so the demo shows visible inspection artifacts, not only text.

---

## Quickstart

```bash
git clone https://github.com/alenisaw/oceanwatch-ai.git
cd oceanwatch-ai

python -m venv .venv
source .venv/bin/activate

python -m pip install -U pip
pip install -e ".[dev]"
```

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1

python -m pip install -U pip
pip install -e ".[dev]"
```

Optional install groups:

```bash
pip install -e ".[ui]"              # Gradio dashboard
pip install -e ".[api]"             # FastAPI service
pip install -e ".[vision]"          # TIFF/GeoTIFF-style loading through tifffile
pip install -e ".[ml]"              # PyTorch path for model checkpoints
pip install -e ".[dev,api,ui,vision,ml]"
```

Run checks:

```bash
ruff format --check .
ruff check .
pytest -q
python -m oceanwatch health
```

Run a synthetic demo prediction:

```bash
python scripts/run_demo.py --output outputs/demo
```

Expected output:

```text
outputs/demo/result.json
outputs/demo/preview.png
outputs/demo/overlay.png
outputs/demo/heatmap.png
outputs/demo/arrays/probability_map.npy
outputs/demo/arrays/binary_mask.npy
```

## UI Features

| Feature | Description |
|---|---|
| Heatmap | Gradient pollution visualization |
| Real-time analytics | Interactive clickable map |
| Timeline | Temporal slider for change analysis |
| Satellite loader | Sentinel-2, Landsat, MODIS, Copernicus, NOAA |
| Dashboard | Gradio UI with all features integrated |
| Global map | NOAA IncidentNews markers over NASA GIBS date-based imagery |

Run the API and React frontend for the global map:

```bash
make api
make frontend
```

Official data sources used by the global map:

| Source | Use |
|---|---|
| NOAA IncidentNews raw CSV | Reported oil and chemical incident records with coordinates |
| NASA GIBS WMTS | Date-based satellite imagery for temporal visual inspection |

Create prepared demo cases and run a batch benchmark:

```bash
python scripts/create_demo_cases.py --output data/demo_cases
python scripts/run_batch.py --input-dir data/demo_cases --output outputs/batch
```

Expected output:

```text
outputs/batch/batch_results.json
```

---

## Repository

```text
oceanwatch-ai/
├─ .github/workflows/ci.yml
├─ configs/
├─ deploy/digitalocean/
├─ docker/
├─ scripts/
├─ src/oceanwatch/
├─ supabase/migrations/
├─ tests/
├─ DATASETS.md
├─ DEMO_SCRIPT.md
├─ MODEL_CARD.md
├─ PROJECT_PLAN.md
├─ pyproject.toml
└─ README.md
```

No notebooks, fake screenshots, empty pitch folders, or unused model files are included in the base scaffold.

---

## Commands

| Command | Purpose |
|---|---|
| `python -m oceanwatch health` | Verify package import and runtime basics |
| `python scripts/run_demo.py --output outputs/demo` | Run deterministic demo pipeline |
| `python scripts/predict_one.py --image path/to/tile.npy` | Run analysis on a local NumPy/TIFF tile |
| `python scripts/create_demo_cases.py --output data/demo_cases` | Create prepared synthetic demo tiles |
| `python scripts/run_batch.py --input-dir data/demo_cases --output outputs/batch` | Run batch inference and throughput timing |
| `pytest -q` | Run unit tests |
| `ruff check .` | Run lint checks |

---

## Supabase

Supabase is optional in the MVP. The scaffold includes one SQL migration for incident storage:

```text
supabase/migrations/001_create_incidents.sql
```

Use it when the UI/API needs persistent incident history, exported reports, or shared team review.

---

## DigitalOcean

DigitalOcean deployment is kept as a template, not an active CI/CD job.

```text
deploy/digitalocean/app.yaml
```

This avoids broken GitHub Actions before secrets, registry, and runtime settings are configured.

---

## AMD path

The base repository is CPU-safe for local development and CI.

The AMD path should be added behind explicit runtime configuration:

```text
PyTorch ROCm segmentation inference
vLLM ROCm VLM report generation
batch satellite tile throughput benchmark
```

Do not make ROCm packages mandatory for default CI. Keep GPU dependencies in optional install groups or separate Docker images.

For the AMD Developer Cloud / AMD Instinct MI300X path, use:

```text
docs/AMD_MI300X_RUNBOOK.md
```

The intended validation order is:

```text
local CPU fallback demo
prepared batch demo
ROCm PyTorch GPU visibility check
MI300X batch throughput benchmark
optional vLLM/VLM report generation
```

---

## Limitations

OceanWatch AI is a decision-support prototype. SAR oil-spill detection has known look-alike risks, including low-wind zones, biogenic films, natural surface effects, waves, and upwelling. The system should recommend analyst verification before response or enforcement decisions.

---

## License

MIT.
