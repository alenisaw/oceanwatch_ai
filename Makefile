.PHONY: install check test lint format health demo api frontend ui

install:
	python -m pip install -U pip
	pip install -e ".[dev]"

check: lint test health

lint:
	ruff format --check .
	ruff check .

test:
	pytest -q

format:
	ruff format .
	ruff check --fix .

health:
	python -m oceanwatch health

demo:
	python scripts/run_demo.py --output outputs/demo

api:
	uvicorn oceanwatch.api.app:create_app --factory --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

ui:
	python src/oceanwatch/ui/dashboard.py
