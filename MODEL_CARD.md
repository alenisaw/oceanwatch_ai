# Model Card

## Model

Initial production candidate:

```text
U-Net + lightweight encoder
```

Current scaffold:

```text
deterministic demo predictor
```

The scaffold predictor exists only to keep the repository runnable before checkpoints are added.

## Inputs

```text
2-channel SAR-like tile: [height, width, channels]
channels: VV, VH or normalized equivalents
```

## Outputs

```text
probability map
binary mask
risk metrics
incident report
structured JSON
```

## Metrics

Track:

```text
Dice
IoU
Precision
Recall
false positives on look-alike cases
latency per image
images per second
```

## Limitations

The model must be treated as triage support. It should not confirm pollution, identify vessels, assign legal responsibility, or replace analyst review.
