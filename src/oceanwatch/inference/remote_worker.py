from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

import numpy as np


class RemoteWorkerError(RuntimeError):
    """Raised when a remote GPU worker request cannot be completed."""


@dataclass(frozen=True)
class RemoteWorkerConfig:
    url: str
    timeout_seconds: float


def get_model_backend() -> str:
    return os.getenv("OCEANWATCH_MODEL_BACKEND", "deterministic").strip().lower() or "deterministic"


def get_remote_worker_config() -> RemoteWorkerConfig:
    timeout_raw = os.getenv("OCEANWATCH_REMOTE_GPU_TIMEOUT", "60")
    try:
        timeout_seconds = float(timeout_raw)
    except ValueError:
        timeout_seconds = 60.0
    return RemoteWorkerConfig(
        url=os.getenv("OCEANWATCH_REMOTE_GPU_URL", "").strip().rstrip("/"),
        timeout_seconds=timeout_seconds,
    )


def analyze_tile_remote(tile: np.ndarray, image_id: str) -> dict[str, Any]:
    """Call a future remote GPU worker using a small JSON protocol scaffold."""
    config = get_remote_worker_config()
    if not config.url:
        msg = "OCEANWATCH_REMOTE_GPU_URL is required when OCEANWATCH_MODEL_BACKEND=remote_gpu."
        raise RemoteWorkerError(msg)

    payload = {
        "image_id": image_id,
        "shape": list(tile.shape),
        "dtype": str(tile.dtype),
        "min": float(np.nanmin(tile)),
        "max": float(np.nanmax(tile)),
        "note": "Tile bytes are not uploaded by this scaffold yet.",
    }
    request = Request(
        f"{config.url}/analyze",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=config.timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))
    except (OSError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RemoteWorkerError(f"Remote GPU worker request failed: {exc}") from exc
