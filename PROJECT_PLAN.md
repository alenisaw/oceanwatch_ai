# OceanWatch AI — Project Plan

OceanWatch AI is a multimodal marine pollution triage assistant for AMD Hackathon Track 3: Vision & Multimodal AI.

## Scope

The MVP focuses on one use case:

```text
Sentinel-1 SAR oil-like anomaly triage
```

The system should not claim final confirmation. It should produce decision-support outputs:

```text
mask → affected ratio → severity → uncertainty-aware report → JSON
```

## Core modules

| Module | Responsibility |
|---|---|
| `data` | Load and normalize SAR-like arrays |
| `inference` | Run prediction and post-processing |
| `reporting` | Build Pydantic schemas and reports |
| `api` | Optional FastAPI service |
| `ui` | Optional Gradio dashboard |
| `scripts` | CLI entry points for demos and prediction |

## Build order

```text
1. Keep CI green.
2. Add dataset loader for TIFF/GeoTIFF.
3. Add U-Net baseline training.
4. Add real checkpoint inference.
5. Add overlay rendering.
6. Add Gradio monitoring dashboard.
7. Add Supabase incident persistence.
8. Add DigitalOcean deployment.
9. Add ROCm/vLLM benchmark path.
```

## Acceptance criteria

Minimum demo:

```text
input tile → mask → risk metrics → report → result.json
```

Strong demo:

```text
batch inference → ranked incidents → AMD benchmark → polished UI
```
