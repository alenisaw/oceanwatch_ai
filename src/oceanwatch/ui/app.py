from oceanwatch.inference.pipeline import run_demo_analysis_with_artifacts


def launch() -> None:
    """Launch a minimal optional Gradio UI."""
    try:
        import gradio as gr
    except ImportError as error:
        msg = "Install UI dependencies with: pip install -e '.[ui]'"
        raise RuntimeError(msg) from error

    def run_demo() -> tuple[str, dict[str, object], object, object]:
        artifacts = run_demo_analysis_with_artifacts()
        result = artifacts.report
        return (
            result.report,
            result.model_dump(mode="json"),
            artifacts.preview_rgb,
            artifacts.overlay_rgb,
        )

    with gr.Blocks(title="OceanWatch AI") as demo:
        gr.Markdown("# OceanWatch AI")
        gr.Markdown("Marine pollution triage assistant for Sentinel-1 SAR.")
        run_button = gr.Button("Run demo analysis")
        with gr.Row():
            preview = gr.Image(label="SAR preview", type="numpy")
            overlay = gr.Image(label="Predicted mask overlay", type="numpy")
        report = gr.Textbox(label="Incident Report", lines=14)
        payload = gr.JSON(label="Structured JSON")
        run_button.click(fn=run_demo, outputs=[report, payload, preview, overlay])

    demo.launch()


if __name__ == "__main__":
    launch()
