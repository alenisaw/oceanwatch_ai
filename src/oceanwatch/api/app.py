import base64
import io
import pathlib
import random
import tempfile
import time
from datetime import datetime, timezone


def _ndarray_to_b64_png(arr) -> str:
    """Encode a uint8 HxWx3 numpy array as a base64 PNG data URI."""
    from PIL import Image
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def _artifacts_to_response(artifacts, latency_ms: float | None = None) -> dict:
    return {
        "report": artifacts.report.model_dump(mode="json"),
        "preview_b64": _ndarray_to_b64_png(artifacts.preview_rgb),
        "overlay_b64": _ndarray_to_b64_png(artifacts.overlay_rgb),
        **({"latency_ms": latency_ms} if latency_ms is not None else {}),
    }


def create_app():
    """Create the optional FastAPI application."""
    try:
        from fastapi import FastAPI, File, HTTPException, UploadFile
        from fastapi.middleware.cors import CORSMiddleware
    except ImportError as error:
        msg = "Install API dependencies with: pip install -e '.[api]'"
        raise RuntimeError(msg) from error

    from oceanwatch.data.io import load_sar_tile, make_synthetic_tile
    from oceanwatch.inference.pipeline import (
        analyze_tile,
        analyze_tile_with_artifacts,
        run_demo_analysis,
        run_demo_analysis_with_artifacts,
    )

    app = FastAPI(
        title="OceanWatch AI",
        version="0.1.0",
        description="Sentinel-1 SAR marine pollution detection API.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Health ────────────────────────────────────────────────────────────────

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # ── Demo ─────────────────────────────────────────────────────────────────

    @app.post("/analyze/demo")
    def analyze_demo() -> dict[str, object]:
        result = run_demo_analysis()
        return result.model_dump(mode="json")

    @app.post("/analyze/demo/full")
    def analyze_demo_full() -> dict[str, object]:
        t0 = time.perf_counter()
        artifacts = run_demo_analysis_with_artifacts()
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return _artifacts_to_response(artifacts, latency_ms=latency_ms)

    # ── Single tile upload ────────────────────────────────────────────────────

    @app.post("/analyze/tile/full")
    async def analyze_tile_full(file: UploadFile = File(...)) -> dict[str, object]:
        _validate_extension(file.filename)
        suffix = pathlib.Path(file.filename or "tile").suffix.lower()
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = pathlib.Path(tmp.name)
        try:
            tile = _safe_load(tmp_path)
        finally:
            tmp_path.unlink(missing_ok=True)
        image_id = pathlib.Path(file.filename or "upload").stem
        t0 = time.perf_counter()
        artifacts = analyze_tile_with_artifacts(tile, image_id=image_id)
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return _artifacts_to_response(artifacts, latency_ms=latency_ms)

    # ── Batch ────────────────────────────────────────────────────────────────

    @app.post("/analyze/batch")
    async def analyze_batch_endpoint(files: list[UploadFile] = File(default=[])) -> dict[str, object]:
        if not files or all(f.filename == "" for f in files):
            # No files sent — run the built-in demo batch
            return _run_demo_batch(analyze_tile)

        results = []
        t_total = time.perf_counter()

        for f in files:
            image_id = pathlib.Path(f.filename or "upload").stem
            try:
                _validate_extension(f.filename)
                suffix = pathlib.Path(f.filename).suffix.lower()
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                    tmp.write(await f.read())
                    tmp_path = pathlib.Path(tmp.name)
                tile = _safe_load(tmp_path)
                tmp_path.unlink(missing_ok=True)
                t0 = time.perf_counter()
                report = analyze_tile(tile, image_id=image_id)
                lat = round((time.perf_counter() - t0) * 1000, 2)
                results.append({
                    "tile_id": image_id,
                    "latency_ms": lat,
                    "risk_level": report.risk_level,
                    "confidence": report.confidence,
                    "affected_pixel_ratio": report.affected_pixel_ratio,
                    "regions_detected": report.mask_summary.regions_detected,
                })
            except Exception as exc:  # noqa: BLE001
                results.append({
                    "tile_id": image_id,
                    "error": str(exc),
                    "latency_ms": 0.0,
                    "risk_level": "error",
                    "confidence": 0.0,
                    "affected_pixel_ratio": 0.0,
                    "regions_detected": 0,
                })

        total_ms = round((time.perf_counter() - t_total) * 1000, 2)
        tps = round(len(results) / (total_ms / 1000), 2) if total_ms > 0 else 0.0
        return {
            "total_tiles": len(results),
            "total_latency_ms": total_ms,
            "tiles_per_second": tps,
            "results": results,
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        }

    # ── Benchmark ────────────────────────────────────────────────────────────

    @app.get("/benchmark")
    def benchmark() -> dict[str, object]:
        rng = random.Random(42)
        n = 50
        latencies: list[float] = []
        risk_dist: dict[str, int] = {"none": 0, "low": 0, "medium": 0, "high": 0}

        for _ in range(n):
            tile = make_synthetic_tile(size=128, slick_scale=rng.uniform(0.5, 2.0))
            t0 = time.perf_counter()
            report = analyze_tile(tile, image_id="benchmark")
            latencies.append((time.perf_counter() - t0) * 1000)
            risk_dist[report.risk_level] = risk_dist.get(report.risk_level, 0) + 1

        latencies.sort()
        total_ms = sum(latencies)
        return {
            "hardware": "cpu (demo — swap for amd-mi300x on AMD infra)",
            "tiles_tested": n,
            "avg_latency_ms": round(sum(latencies) / n, 2),
            "p95_latency_ms": round(latencies[int(n * 0.95) - 1], 2),
            "p99_latency_ms": round(latencies[int(n * 0.99) - 1], 2),
            "tiles_per_second": round(n / (total_ms / 1000), 2),
            "risk_distribution": risk_dist,
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        }

    return app


# ── Helpers ───────────────────────────────────────────────────────────────────

_ALLOWED_EXTS = {".npy", ".npz", ".tif", ".tiff"}


def _validate_extension(filename: str | None) -> None:
    from fastapi import HTTPException
    suffix = pathlib.Path(filename or "").suffix.lower()
    if suffix not in _ALLOWED_EXTS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(sorted(_ALLOWED_EXTS))}",
        )


def _safe_load(path: pathlib.Path):
    from fastapi import HTTPException
    from oceanwatch.data.io import load_sar_tile
    try:
        return load_sar_tile(path)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to read tile: {exc}") from exc


def _run_demo_batch(analyze_tile_fn) -> dict:
    from oceanwatch.data.io import make_synthetic_tile
    demo_configs = [
        ("high_confidence_compact", 2.0),
        ("look_alike_uncertain", 0.6),
        ("low_risk", 0.3),
        ("medium_risk", 1.1),
        ("no_oil_like", 0.05),
    ]
    results = []
    t_total = time.perf_counter()
    for name, scale in demo_configs:
        tile = make_synthetic_tile(size=128, slick_scale=scale)
        t0 = time.perf_counter()
        report = analyze_tile_fn(tile, image_id=name)
        lat = round((time.perf_counter() - t0) * 1000, 2)
        results.append({
            "tile_id": name,
            "latency_ms": lat,
            "risk_level": report.risk_level,
            "confidence": report.confidence,
            "affected_pixel_ratio": report.affected_pixel_ratio,
            "regions_detected": report.mask_summary.regions_detected,
        })
    total_ms = round((time.perf_counter() - t_total) * 1000, 2)
    tps = round(len(results) / (total_ms / 1000), 2) if total_ms > 0 else 0.0
    return {
        "total_tiles": len(results),
        "total_latency_ms": total_ms,
        "tiles_per_second": tps,
        "results": results,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }
