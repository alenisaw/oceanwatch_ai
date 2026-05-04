from pathlib import Path

import numpy as np
import typer

from oceanwatch.data.io import make_synthetic_tile

DEMO_CASES = {
    "no_oil_like_case": 0.0,
    "look_alike_uncertain_case": 0.35,
    "low_risk_case": 0.7,
    "medium_risk_case": 1.8,
    "high_confidence_compact_case": 3.0,
}


def main(output: Path = typer.Option(Path("data/demo_cases"), help="Output directory.")) -> None:
    output.mkdir(parents=True, exist_ok=True)
    for name, slick_scale in DEMO_CASES.items():
        tile = make_synthetic_tile(size=128, slick_scale=slick_scale)
        np.save(output / f"{name}.npy", tile)
    typer.echo(f"written: {output}")


if __name__ == "__main__":
    typer.run(main)
