FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml README.md ./
COPY src ./src
COPY scripts ./scripts
COPY configs ./configs

RUN python -m pip install -U pip && pip install -e ".[api]"

EXPOSE 8000
CMD ["uvicorn", "oceanwatch.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
