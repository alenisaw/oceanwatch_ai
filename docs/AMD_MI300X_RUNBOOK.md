# AMD MI300X Runbook

This runbook keeps the local Windows/CPU path separate from the AMD Developer
Cloud path. Use it after joining the AMD AI Developer Program and activating
AMD Developer Cloud credits from the member portal:

https://www.amd.com/en/developer/ai-dev-program.html

## Target

Hardware:

```text
AMD Instinct MI300X
```

Software target:

```text
Linux
ROCm
Python 3.10+
PyTorch ROCm
Optional vLLM ROCm for VLM report generation
```

## 1. Provision cloud access

Follow the AMD AI Developer Program steps:

```text
1. Create or sign in to an AMD account.
2. Complete the AI Developer Program form.
3. Verify email and open the member portal.
4. Join the private Discord for support.
5. Activate AMD Developer Cloud credits from the portal credit link.
6. Start an AMD Developer Cloud MI300X instance.
```

## 2. Clone and install

On the MI300X instance:

```bash
git clone https://github.com/alenisaw/oceanwatch-ai.git
cd oceanwatch-ai

python -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
pip install -e ".[dev,api,ui,vision,ml]"
```

If the cloud image already has a ROCm PyTorch environment, prefer that image's
recommended PyTorch install command over reinstalling torch from PyPI.

## 3. Validate ROCm and GPU visibility

```bash
python - <<'PY'
import torch

print("torch:", torch.__version__)
print("hip:", torch.version.hip)
print("cuda api available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("device count:", torch.cuda.device_count())
    print("device 0:", torch.cuda.get_device_name(0))
PY
```

Expected signal:

```text
hip: non-empty ROCm version
cuda api available: True
device 0: AMD Instinct MI300X...
```

PyTorch uses the `torch.cuda` API name even when the backend is ROCm.

## 4. Run local fallback demo

```bash
python -m oceanwatch health
python scripts/run_demo.py --output outputs/demo
ls outputs/demo
```

Expected files:

```text
result.json
preview.png
overlay.png
arrays/probability_map.npy
arrays/binary_mask.npy
```

## 5. Create prepared demo cases

```bash
python scripts/create_demo_cases.py --output data/demo_cases
python scripts/run_batch.py --input-dir data/demo_cases --output outputs/batch
cat outputs/batch/batch_results.json
```

This is the first AMD benchmark path. Record:

```text
total_tiles
total_seconds
tiles_per_second
per-tile latency_ms
```

## 6. Start API and UI

API:

```bash
uvicorn "oceanwatch.api.app:create_app" --factory --host 0.0.0.0 --port 8000
```

UI:

```bash
python -m oceanwatch.ui.app
```

For cloud demos, expose ports through the cloud provider UI or SSH tunneling.

## 7. vLLM/VLM path

Keep vLLM optional until the deterministic segmentation pipeline and batch
benchmark are stable. Recommended order:

```text
1. Confirm ROCm PyTorch works.
2. Run OceanWatch batch benchmark.
3. Start a ROCm-supported vLLM server.
4. Send overlay image + metrics to Qwen-VL or another VLM.
5. Fall back to template reports if vLLM is unavailable.
```

Useful upstream docs:

```text
PyTorch on ROCm:
https://rocm.docs.amd.com/projects/install-on-linux/en/latest/install/3rd-party/pytorch-install.html

vLLM ROCm:
https://docs.vllm.ai/en/latest/getting_started/installation/gpu.html?device=rocm
```

## Demo checklist

```text
[ ] health command passes
[ ] demo JSON exists
[ ] preview and overlay PNGs exist
[ ] batch_results.json reports throughput
[ ] torch.version.hip is non-empty on MI300X
[ ] torch.cuda.get_device_name(0) names AMD Instinct hardware
[ ] UI can show report + JSON + overlay
```
