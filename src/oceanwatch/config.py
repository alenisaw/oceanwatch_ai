from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class RuntimeConfig:
    name: str = "OceanWatch AI"
    environment: str = "local"
    reporting_mode: str = "template"
    runtime: str = "cpu"


def load_yaml(path: Path) -> dict[str, Any]:
    """Load a YAML file and return an empty mapping when the file is empty."""
    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file)
    if data is None:
        return {}
    if not isinstance(data, dict):
        msg = f"Expected mapping in YAML file: {path}"
        raise ValueError(msg)
    return data


def load_runtime_config(path: Path = Path("configs/app.yaml")) -> RuntimeConfig:
    """Load runtime configuration from YAML."""
    if not path.exists():
        return RuntimeConfig()

    data = load_yaml(path)
    app_config = data.get("app", {})
    if not isinstance(app_config, dict):
        msg = "The 'app' section must be a mapping."
        raise ValueError(msg)

    return RuntimeConfig(
        name=str(app_config.get("name", RuntimeConfig.name)),
        environment=str(app_config.get("environment", RuntimeConfig.environment)),
        reporting_mode=str(app_config.get("reporting_mode", RuntimeConfig.reporting_mode)),
        runtime=str(app_config.get("runtime", RuntimeConfig.runtime)),
    )
