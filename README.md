# OceanWatch AI

![CI](https://github.com/alenisaw/oceanwatch-ai/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/Python-3.11%2B-blue)
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

The current scaffold ships with a deterministic demo predictor so the repository can run, test, and pass CI before model checkpoints are added.

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
| `python scripts/predict_one.py --image path/to/tile.npy` | Run analysis on a local NumPy tile |
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

---

## Limitations

OceanWatch AI is a decision-support prototype. SAR oil-spill detection has known look-alike risks, including low-wind zones, biogenic films, natural surface effects, waves, and upwelling. The system should recommend analyst verification before response or enforcement decisions.

---

## License

MIT.
