from collections import deque
from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class PostprocessResult:
    binary_mask: np.ndarray
    affected_pixel_ratio: float
    regions_detected: int
    largest_region_ratio: float
    confidence: float
    risk_level: str


def risk_from_ratio(affected_pixel_ratio: float) -> str:
    """Map affected pixel ratio to a transparent risk level."""
    if affected_pixel_ratio <= 0.0:
        return "none"
    if affected_pixel_ratio < 0.02:
        return "low"
    if affected_pixel_ratio < 0.08:
        return "medium"
    return "high"


def connected_components(mask: np.ndarray) -> list[int]:
    """Return connected component sizes for a binary mask."""
    binary = mask.astype(bool)
    visited = np.zeros_like(binary, dtype=bool)
    height, width = binary.shape
    components: list[int] = []

    for row in range(height):
        for col in range(width):
            if visited[row, col] or not binary[row, col]:
                continue

            size = 0
            queue: deque[tuple[int, int]] = deque([(row, col)])
            visited[row, col] = True

            while queue:
                current_row, current_col = queue.popleft()
                size += 1

                for next_row, next_col in (
                    (current_row - 1, current_col),
                    (current_row + 1, current_col),
                    (current_row, current_col - 1),
                    (current_row, current_col + 1),
                ):
                    if next_row < 0 or next_col < 0:
                        continue
                    if next_row >= height or next_col >= width:
                        continue
                    if visited[next_row, next_col] or not binary[next_row, next_col]:
                        continue
                    visited[next_row, next_col] = True
                    queue.append((next_row, next_col))

            components.append(size)

    return components


def remove_small_components(mask: np.ndarray, min_pixels: int) -> np.ndarray:
    """Remove connected components smaller than min_pixels."""
    if min_pixels <= 1:
        return mask.astype(np.uint8)

    binary = mask.astype(bool)
    visited = np.zeros_like(binary, dtype=bool)
    output = np.zeros_like(binary, dtype=bool)
    height, width = binary.shape

    for row in range(height):
        for col in range(width):
            if visited[row, col] or not binary[row, col]:
                continue

            pixels: list[tuple[int, int]] = []
            queue: deque[tuple[int, int]] = deque([(row, col)])
            visited[row, col] = True

            while queue:
                current_row, current_col = queue.popleft()
                pixels.append((current_row, current_col))

                for next_row, next_col in (
                    (current_row - 1, current_col),
                    (current_row + 1, current_col),
                    (current_row, current_col - 1),
                    (current_row, current_col + 1),
                ):
                    if next_row < 0 or next_col < 0:
                        continue
                    if next_row >= height or next_col >= width:
                        continue
                    if visited[next_row, next_col] or not binary[next_row, next_col]:
                        continue
                    visited[next_row, next_col] = True
                    queue.append((next_row, next_col))

            if len(pixels) >= min_pixels:
                for pixel_row, pixel_col in pixels:
                    output[pixel_row, pixel_col] = True

    return output.astype(np.uint8)


def postprocess_probability_map(
    probability_map: np.ndarray,
    threshold: float = 0.5,
    min_component_pixels: int = 8,
) -> PostprocessResult:
    """Convert a probability map into mask and risk metrics."""
    if probability_map.ndim != 2:
        msg = f"Expected a 2D probability map, got shape {probability_map.shape}"
        raise ValueError(msg)

    probabilities = np.clip(np.nan_to_num(probability_map.astype(np.float32)), 0.0, 1.0)
    initial_mask = probabilities >= threshold
    binary_mask = remove_small_components(initial_mask.astype(np.uint8), min_component_pixels)

    affected_pixels = int(binary_mask.sum())
    total_pixels = int(binary_mask.size)
    affected_ratio = affected_pixels / total_pixels if total_pixels else 0.0

    components = connected_components(binary_mask)
    largest_component = max(components, default=0)
    largest_ratio = largest_component / total_pixels if total_pixels else 0.0

    if affected_pixels > 0:
        confidence = float(probabilities[binary_mask.astype(bool)].mean())
    else:
        confidence = float(1.0 - probabilities.mean())

    return PostprocessResult(
        binary_mask=binary_mask,
        affected_pixel_ratio=affected_ratio,
        regions_detected=len(components),
        largest_region_ratio=largest_ratio,
        confidence=confidence,
        risk_level=risk_from_ratio(affected_ratio),
    )
