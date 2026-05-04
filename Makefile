.PHONY: install check test lint format health demo

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
