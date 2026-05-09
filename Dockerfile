# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build


FROM python:3.11-slim AS app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    OCEANWATCH_ENV=production \
    OCEANWATCH_MODEL_BACKEND=deterministic

WORKDIR /app

RUN python -m pip install --upgrade pip

COPY pyproject.toml README.md ./
COPY src ./src
COPY scripts ./scripts
COPY configs ./configs

RUN pip install -e ".[api,vision]"

COPY --from=frontend-builder /build/frontend/dist /app/frontend_dist

RUN mkdir -p /app/outputs /static

EXPOSE 8000

CMD ["/bin/sh", "-c", "rm -rf /static/* && cp -R /app/frontend_dist/. /static/ && exec uvicorn oceanwatch.api.app:create_app --factory --host 0.0.0.0 --port 8000"]
