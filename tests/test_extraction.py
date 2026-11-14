from fastapi.testclient import TestClient

from main import app


def test_extract_receipt():
    client = TestClient(app)
    files = {"receipt": ("receipt.jpg", b"fake-image-bytes", "image/jpeg")}
    response = client.post("/api/v1/expenses/extract", files=files)
    assert response.status_code == 200
    body = response.json()
    assert body["merchant"] == "TotalEnergies Dakar"
    assert body == {
        "amount": 45.50,
        "category": "fuel",
        "merchant": "TotalEnergies Dakar",
        "confidence_score": 0.98,
    }
