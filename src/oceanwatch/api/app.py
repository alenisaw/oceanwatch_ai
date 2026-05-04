from oceanwatch.inference.pipeline import run_demo_analysis


def create_app():
    """Create the optional FastAPI application."""
    try:
        from fastapi import FastAPI
    except ImportError as error:
        msg = "Install API dependencies with: pip install -e '.[api]'"
        raise RuntimeError(msg) from error

    app = FastAPI(title="OceanWatch AI", version="0.1.0")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/analyze/demo")
    def analyze_demo() -> dict[str, object]:
        result = run_demo_analysis()
        return result.model_dump(mode="json")

    return app
