# Zero-Click Expense & Fleet Management API

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-94%25-brightgreen)
![Python](https://img.shields.io/badge/python-3.11-blue)

> Note: the badges above are static placeholders and are not wired to a CI provider.

## Overview

**Zero-Click Expense** is a backend service that automates logistics and accounting workflows for vehicle fleets. Drivers and systems submit expenses (fuel, tolls, maintenance) against a vehicle, and the API records, categorizes and tracks them through an approval lifecycle. The goal is to remove manual data entry between operations and finance.

## Architecture

| Layer | Technology | Role |
|-------|------------|------|
| API | FastAPI + Pydantic v2 | Typed, validated, self-documenting REST endpoints |
| Persistence | SQLAlchemy 2.x + SQLite (WAL) | Lightweight transactional storage with concurrent readers |
| Runtime | Docker / Docker Compose | Reproducible deployment |
| Quality | Pytest + HTTPX | In-memory integration tests via `TestClient` |

SQLite is configured with `PRAGMA journal_mode=WAL` and `PRAGMA synchronous=NORMAL`, which allows readers to proceed during writes while retaining durability suitable for most workloads.

```
core/       database engine, session, pragmas
models/     SQLAlchemy domain models (User, Vehicle, Expense)
schemas/    Pydantic request/response schemas
main.py     FastAPI application and routes
tests/      Pytest suite
```

## Quick Start

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Or with Docker:

```bash
docker compose up --build
```

API docs: http://localhost:8000/docs

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| POST | `/api/v1/expenses/` | Create an expense |
| GET | `/api/v1/expenses/` | List expenses (`skip`, `limit`, optional `status`) |
| GET | `/api/v1/expenses/{id}` | Retrieve one expense |

## Testing

```bash
pytest -v
```

## Roadmap

- OCR-driven receipt ingestion
- Approval workflows and policy rules
- Accounting system export
- Migration path to PostgreSQL for horizontal scaling
