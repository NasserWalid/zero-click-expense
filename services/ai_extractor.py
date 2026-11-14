import asyncio


class ReceiptAIParser:
    """Mock AI receipt parser simulating the latency of a vision model."""

    async def extract_data_from_image(self, file_bytes: bytes) -> dict:
        await asyncio.sleep(1.5)
        return {
            "amount": 45.50,
            "category": "fuel",
            "merchant": "TotalEnergies Dakar",
            "confidence_score": 0.98,
        }
