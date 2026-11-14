import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base, configure_sqlite, get_db
from main import app
from models.domain import User, Vehicle


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    event.listen(engine, "connect", configure_sqlite)
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    yield factory
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # No context manager: the lifespan (which targets the real DB) is not run.
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded(session_factory):
    db = session_factory()
    user = User(email="driver@example.com", full_name="Jane Driver")
    vehicle = Vehicle(plate_number="AB-123-CD", model="Renault Master")
    db.add_all([user, vehicle])
    db.commit()
    ids = {"user_id": user.id, "vehicle_id": vehicle.id}
    db.close()
    return ids


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_and_get_expense(client, seeded):
    payload = {
        **seeded,
        "amount": 82.5,
        "category": "fuel",
        "receipt_url": "https://example.com/receipts/1.jpg",
    }
    response = client.post("/api/v1/expenses/", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["amount"] == 82.5
    assert body["category"] == "fuel"
    assert body["status"] == "pending"
    assert body["receipt_url"] == payload["receipt_url"]

    listing = client.get("/api/v1/expenses/")
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    single = client.get(f"/api/v1/expenses/{body['id']}")
    assert single.status_code == 200
    assert single.json() == body

    filtered = client.get("/api/v1/expenses/", params={"status": "approved"})
    assert filtered.json() == []


def test_create_expense_unknown_user(client, seeded):
    payload = {"user_id": 999, "vehicle_id": seeded["vehicle_id"], "amount": 10, "category": "toll"}
    assert client.post("/api/v1/expenses/", json=payload).status_code == 404


def test_create_expense_invalid_amount(client, seeded):
    payload = {**seeded, "amount": -5, "category": "toll"}
    assert client.post("/api/v1/expenses/", json=payload).status_code == 422


def test_get_missing_expense(client):
    assert client.get("/api/v1/expenses/42").status_code == 404
