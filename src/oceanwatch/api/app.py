import base64
import csv
import io
import pathlib
import random
import tempfile
import time
from datetime import datetime, timezone
from functools import lru_cache
from urllib.request import urlopen


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
        from fastapi import FastAPI, File, UploadFile
        from fastapi.middleware.cors import CORSMiddleware
    except ImportError as error:
        msg = "Install API dependencies with: pip install -e '.[api]'"
        raise RuntimeError(msg) from error

    from oceanwatch.data.io import make_synthetic_tile
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
    async def analyze_batch_endpoint(
        files: list[UploadFile] = File(default=[]),
    ) -> dict[str, object]:
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
                results.append(
                    {
                        "tile_id": image_id,
                        "latency_ms": lat,
                        "risk_level": report.risk_level,
                        "confidence": report.confidence,
                        "affected_pixel_ratio": report.affected_pixel_ratio,
                        "regions_detected": report.mask_summary.regions_detected,
                    }
                )
            except Exception as exc:  # noqa: BLE001
                results.append(
                    {
                        "tile_id": image_id,
                        "error": str(exc),
                        "latency_ms": 0.0,
                        "risk_level": "error",
                        "confidence": 0.0,
                        "affected_pixel_ratio": 0.0,
                        "regions_detected": 0,
                    }
                )

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

    @app.get("/incidents/noaa")
    def noaa_incidents(
        threat: str = "Oil",
        limit: int = 1200,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict[str, object]:
        rows = _load_noaa_incidents()
        filtered = _filter_noaa_rows(
            rows,
            threat=threat,
            limit=max(1, min(limit, 5000)),
            start_date=start_date,
            end_date=end_date,
        )
        return {
            "source": "NOAA IncidentNews",
            "source_url": _NOAA_INCIDENTS_CSV_URL,
            "coverage_note": (
                "Selected NOAA OR&R-supported oil and chemical incidents with approximate "
                "coordinates. This is not an exhaustive global detection feed."
            ),
            "count": len(filtered),
            "incidents": filtered,
            "fetched_at": datetime.now(tz=timezone.utc).isoformat(),
        }

    @app.get("/incidents/ocean-risk")
    def ocean_risk_surface(
        threat: str = "Oil",
        limit: int = 1200,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict[str, object]:
        """Return official incident records blended with maritime risk context anchors."""
        rows = _load_noaa_incidents()
        incidents = _filter_noaa_rows(
            rows,
            threat=threat,
            limit=max(1, min(limit, 5000)),
            start_date=start_date,
            end_date=end_date,
        )
        context = _ocean_context_anchors()
        return {
            "source": "NOAA IncidentNews plus official maritime energy context",
            "source_url": _NOAA_INCIDENTS_CSV_URL,
            "context_sources": [
                {
                    "name": "NOAA IncidentNews",
                    "url": "https://incidentnews.noaa.gov/raw/index",
                },
                {
                    "name": "U.S. Energy Information Administration World Oil Transit Chokepoints",
                    "url": "https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints",
                },
                {
                    "name": "NOAA Office of Response and Restoration incident response context",
                    "url": "https://response.restoration.noaa.gov/",
                },
            ],
            "coverage_note": (
                "Heat surface blends reported NOAA records with contextual maritime oil-risk "
                "anchors such as major oil transit chokepoints and offshore production corridors. "
                "Context anchors are not detected spills."
            ),
            "count": len(incidents) + len(context),
            "reported_incident_count": len(incidents),
            "context_anchor_count": len(context),
            "surface_points": [*incidents, *context],
            "fetched_at": datetime.now(tz=timezone.utc).isoformat(),
        }

    return app


# ── Helpers ───────────────────────────────────────────────────────────────────

_ALLOWED_EXTS = {".npy", ".npz", ".tif", ".tiff"}
_NOAA_INCIDENTS_CSV_URL = "https://incidentnews.noaa.gov/raw/incidents.csv"


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
        results.append(
            {
                "tile_id": name,
                "latency_ms": lat,
                "risk_level": report.risk_level,
                "confidence": report.confidence,
                "affected_pixel_ratio": report.affected_pixel_ratio,
                "regions_detected": report.mask_summary.regions_detected,
            }
        )
    total_ms = round((time.perf_counter() - t_total) * 1000, 2)
    tps = round(len(results) / (total_ms / 1000), 2) if total_ms > 0 else 0.0
    return {
        "total_tiles": len(results),
        "total_latency_ms": total_ms,
        "tiles_per_second": tps,
        "results": results,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }


@lru_cache(maxsize=1)
def _load_noaa_incidents() -> tuple[dict[str, str], ...]:
    with urlopen(_NOAA_INCIDENTS_CSV_URL, timeout=20) as response:
        text = response.read().decode("utf-8-sig")
    return tuple(csv.DictReader(io.StringIO(text)))


def _filter_noaa_rows(
    rows: tuple[dict[str, str], ...],
    threat: str,
    limit: int,
    start_date: str | None,
    end_date: str | None,
) -> list[dict[str, object]]:
    filtered: list[dict[str, object]] = []
    for row in rows:
        if threat and row.get("threat", "").lower() != threat.lower():
            continue
        if not row.get("lat") or not row.get("lon"):
            continue
        opened = row.get("open_date", "")
        if start_date and opened < start_date:
            continue
        if end_date and opened > end_date:
            continue

        gallons = _optional_float(row.get("max_ptl_release_gallons"))
        severity = _incident_severity(gallons)
        incident_id = row.get("id", "")
        filtered.append(
            {
                "id": incident_id,
                "name": row.get("name", "Unnamed incident"),
                "open_date": opened,
                "location": row.get("location", ""),
                "lat": float(row["lat"]),
                "lon": float(row["lon"]),
                "threat": row.get("threat", ""),
                "tags": row.get("tags", ""),
                "commodity": row.get("commodity", ""),
                "max_potential_release_gallons": gallons,
                "severity_score": severity,
                "severity_label": _severity_label(severity),
                "posts": int(row.get("posts") or 0),
                "description": row.get("description", "").replace("\v", " "),
                "source_url": f"https://incidentnews.noaa.gov/incident/{incident_id}",
                "status_language": "reported possible oil-like anomaly or spill incident",
            }
        )
        if len(filtered) >= limit:
            break
    return filtered


def _optional_float(value: str | None) -> float | None:
    if value in {None, ""}:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _incident_severity(gallons: float | None) -> float:
    if gallons is None or gallons <= 0:
        return 0.25
    if gallons >= 1_000_000:
        return 1.0
    if gallons >= 100_000:
        return 0.82
    if gallons >= 10_000:
        return 0.66
    if gallons >= 1_000:
        return 0.48
    return 0.32


def _severity_label(score: float) -> str:
    if score >= 0.9:
        return "critical reported incident"
    if score >= 0.7:
        return "high reported incident"
    if score >= 0.45:
        return "moderate reported incident"
    return "lower reported incident"


def _ocean_context_anchors() -> list[dict[str, object]]:
    anchors = [
        ("hormuz", "Strait of Hormuz oil transit corridor", 26.6, 56.2, 0.92),
        ("malacca", "Strait of Malacca oil transit corridor", 2.9, 101.2, 0.9),
        ("suez", "Suez Canal and Eastern Mediterranean corridor", 30.4, 32.4, 0.84),
        ("bab-el-mandeb", "Bab el-Mandeb and Red Sea corridor", 12.7, 43.4, 0.84),
        ("panama", "Panama Canal maritime transit corridor", 9.1, -79.7, 0.72),
        ("turkish-straits", "Turkish Straits petroleum transit corridor", 41.1, 29.0, 0.7),
        ("english-channel", "English Channel dense tanker traffic corridor", 50.2, 0.0, 0.64),
        ("singapore", "Singapore Strait bunker and tanker hub", 1.2, 104.0, 0.86),
        ("gulf-mexico", "Gulf of Mexico offshore production corridor", 27.0, -90.0, 0.88),
        ("north-sea", "North Sea offshore production corridor", 57.0, 2.5, 0.78),
        ("gulf-guinea", "Gulf of Guinea offshore oil corridor", 2.0, 5.0, 0.76),
        ("persian-gulf", "Persian Gulf offshore terminal zone", 27.0, 51.5, 0.86),
        ("arabian-sea", "Arabian Sea tanker approach corridor", 18.0, 62.0, 0.62),
        ("south-china-sea", "South China Sea tanker and offshore corridor", 12.0, 114.0, 0.74),
        ("east-china-sea", "East China Sea tanker corridor", 29.5, 126.0, 0.62),
        ("japan-korea", "Japan and Korea refinery approach corridor", 34.5, 131.0, 0.66),
        ("caribbean", "Caribbean refinery and tanker corridor", 15.0, -64.0, 0.62),
        ("baltic", "Baltic Sea petroleum transit corridor", 58.0, 20.0, 0.54),
        ("black-sea", "Black Sea petroleum export corridor", 43.5, 35.0, 0.58),
        ("north-atlantic", "North Atlantic tanker approach corridor", 43.0, -45.0, 0.5),
        ("cape-good-hope", "Cape of Good Hope rerouting corridor", -35.0, 19.0, 0.56),
        ("brazil-offshore", "Brazil pre-salt offshore production corridor", -24.0, -42.0, 0.7),
        ("west-australia", "North West Shelf offshore production corridor", -19.0, 116.0, 0.58),
        ("alaska", "Alaska North Pacific oil transit corridor", 58.0, -150.0, 0.54),
    ]
    return [
        {
            "id": f"context-{anchor_id}",
            "name": name,
            "open_date": "",
            "location": "Ocean context zone",
            "lat": lat,
            "lon": lon,
            "threat": "Oil",
            "tags": "context_anchor maritime_oil_risk",
            "commodity": "petroleum transit / offshore production context",
            "max_potential_release_gallons": None,
            "severity_score": score,
            "severity_label": _context_severity_label(score),
            "posts": 0,
            "description": (
                "Contextual maritime oil-risk anchor used to shape the global heat surface. "
                "This is not a detected incident or confirmed spill."
            ),
            "source_url": "https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints",
            "status_language": "contextual maritime oil-risk zone, not a detected incident",
            "record_type": "context_anchor",
        }
        for anchor_id, name, lat, lon, score in anchors
    ]


def _context_severity_label(score: float) -> str:
    if score >= 0.85:
        return "critical maritime oil-risk context"
    if score >= 0.7:
        return "high maritime oil-risk context"
    if score >= 0.55:
        return "moderate maritime oil-risk context"
    return "lower maritime oil-risk context"
