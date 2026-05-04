from oceanwatch.inference.pipeline import run_demo_analysis


def launch() -> None:
    """Launch a minimal optional Gradio UI."""
    try:
        import gradio as gr
    except ImportError as error:
        msg = "Install UI dependencies with: pip install -e '.[ui]'"
        raise RuntimeError(msg) from error

    def run_demo() -> tuple[str, dict[str, object]]:
        result = run_demo_analysis()
        return result.report, result.model_dump(mode="json")

    with gr.Blocks(title="OceanWatch AI") as demo:
        gr.Markdown("# OceanWatch AI")
        gr.Markdown("Marine pollution triage assistant.")
        run_button = gr.Button("Run demo analysis")
        report = gr.Textbox(label="Incident Report", lines=14)
        payload = gr.JSON(label="Structured JSON")
        run_button.click(fn=run_demo, outputs=[report, payload])

    demo.launch()


if __name__ == "__main__":
    launch()
