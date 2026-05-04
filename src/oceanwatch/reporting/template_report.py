def format_percent(value: float) -> str:
    """Format a ratio as a percentage."""
    return f"{value * 100:.2f}%"


def build_template_report(
    risk_level: str,
    confidence: float,
    affected_pixel_ratio: float,
    regions_detected: int,
) -> str:
    """Build a deterministic uncertainty-aware incident report."""
    if risk_level == "none":
        summary = "No clear oil-like anomaly is detected in the analyzed tile."
    else:
        summary = "A possible oil-like anomaly is detected in the analyzed tile."

    return "\n".join(
        [
            "Incident Summary",
            summary,
            "",
            "Risk Level",
            risk_level.upper(),
            "",
            "Detection Metrics",
            f"Confidence: {confidence:.2f}",
            f"Affected pixel ratio: {format_percent(affected_pixel_ratio)}",
            f"Detected regions: {regions_detected}",
            "",
            "Uncertainty",
            "SAR look-alike phenomena may be present. Human analyst verification is recommended.",
            "",
            "Recommended Actions",
            "Prioritize analyst review for medium/high-risk cases and request temporal "
            "confirmation.",
        ]
    )
