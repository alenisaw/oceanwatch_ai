# Demo Script

## Main path

```text
1. Open the project locally.
2. Run the health check.
3. Run the demo script.
4. Open result.json.
5. Explain mask, risk metrics, uncertainty, and recommended actions.
```

Commands:

```bash
python -m oceanwatch health
python scripts/run_demo.py --output outputs/demo
cat outputs/demo/result.json
```

Prepared cases and batch benchmark:

```bash
python scripts/create_demo_cases.py --output data/demo_cases
python scripts/run_batch.py --input-dir data/demo_cases --output outputs/batch
cat outputs/batch/batch_results.json
```

## Pitch line

```text
OceanWatch AI turns satellite pixels into response-ready marine pollution reports.
```

## Backup path

If live model inference is unstable:

```text
use cached demo outputs
use template report generation
show benchmark table separately
```
