from __future__ import annotations

from contextlib import suppress
from typing import Any


def get_runtime_info() -> dict[str, Any]:
    """Return the active inference runtime without requiring PyTorch."""
    base: dict[str, Any] = {
        "runtime": "cpu",
        "device": "cpu",
        "torch_available": False,
        "torch_version": None,
        "cuda_available": False,
        "cuda_version": None,
        "hip_version": None,
        "device_name": "cpu",
    }

    try:
        import torch  # type: ignore[import-not-found]
    except Exception:
        return base

    base["torch_available"] = True
    base["torch_version"] = getattr(torch, "__version__", None)
    version = getattr(torch, "version", None)
    base["cuda_version"] = getattr(version, "cuda", None)
    base["hip_version"] = getattr(version, "hip", None)

    try:
        cuda_available = bool(torch.cuda.is_available())
    except Exception:
        cuda_available = False

    base["cuda_available"] = cuda_available
    if not cuda_available:
        return base

    runtime = "rocm" if base["hip_version"] else "cuda"
    device_name = "gpu"
    with suppress(Exception):
        device_name = str(torch.cuda.get_device_name(0))

    return {
        **base,
        "runtime": runtime,
        "device": "cuda:0",
        "device_name": device_name,
    }
