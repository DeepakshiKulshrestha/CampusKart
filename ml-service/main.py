"""CampusKart AI inference service. Marketplace data is supplied by the Node API."""

from __future__ import annotations

import os
import json
import hmac
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from price_prediction.predict import predict_price
from price_prediction.train import ensure_model, METRICS_PATH
from semantic_search.search import search_products, warmup_encoder
from fraud_detection.predict import score_listing, MODEL_PATH as FRAUD_MODEL_PATH
from scripts.artifact_bundle import restore_if_needed


@asynccontextmanager
async def lifespan(_: FastAPI):
    restore_if_needed()
    ensure_model()
    if not FRAUD_MODEL_PATH.exists():
        raise RuntimeError(f"Trained fraud model missing at {FRAUD_MODEL_PATH}. Follow docs/TRAINING_RUNBOOK.md.")
    if os.getenv("APP_ENV", "development").lower() == "production" and not os.getenv("ML_API_KEY"):
        raise RuntimeError("ML_API_KEY must be set in production")
    if os.getenv("APP_ENV", "development").lower() == "production":
        warmup_encoder()
    yield


app = FastAPI(
    title="CampusKart AI Service",
    description="Price intelligence, semantic product search, and listing risk signals.",
    version="0.1.0",
    docs_url=None if os.getenv("APP_ENV", "development").lower() == "production" else "/docs",
    redoc_url=None if os.getenv("APP_ENV", "development").lower() == "production" else "/redoc",
    lifespan=lifespan,
)

@app.middleware("http")
async def require_internal_api_key(request, call_next):
    """Require a shared Node-to-ML key on inference routes in production."""
    if os.getenv("APP_ENV", "development").lower() == "production" and request.url.path != "/health":
        configured = os.getenv("ML_API_KEY", "")
        supplied = request.headers.get("x-ml-api-key", "")
        if not configured or not hmac.compare_digest(supplied, configured):
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)


class InputModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)


class PriceFeatures(InputModel):
    category: str = Field(min_length=1, max_length=80)
    itemType: str = Field(default="Generic item", max_length=100)
    brand: str = Field(default="Unknown", max_length=100)
    variant: str = Field(default="Standard", max_length=120)
    itemKind: str = Field(default="reusable", pattern="^(reusable|consumable|perishable)$")
    originalPrice: float = Field(gt=0, le=10_000_000)
    age: float = Field(ge=0, le=600, description="Age in months")
    condition: Literal["New", "Like New", "Good", "Fair", "Poor"]
    packQuantity: int = Field(default=1, ge=1, le=1000)
    isPerishable: bool = False
    daysUntilExpiry: int = Field(default=0, ge=0, le=5000)
    opened: bool = False


class FairnessRequest(PriceFeatures):
    listedPrice: float = Field(gt=0, le=10_000_000)


class Product(InputModel):
    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    itemType: str = Field(default="", max_length=100)
    variant: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=2000)
    category: str = Field(default="", max_length=80)
    brand: str = Field(default="", max_length=100)
    price: float = Field(ge=0, le=10_000_000, allow_inf_nan=False)
    condition: str = Field(default="", max_length=40)
    location: str = Field(default="", max_length=120)


class SearchFilters(InputModel):
    category: str | None = Field(default=None, max_length=80)
    condition: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=120)
    minPrice: float | None = Field(default=None, ge=0, le=10_000_000, allow_inf_nan=False)
    maxPrice: float | None = Field(default=None, ge=0, le=10_000_000, allow_inf_nan=False)


class SearchRequest(InputModel):
    query: str = Field(min_length=2, max_length=500)
    products: list[Product] = Field(min_length=1, max_length=250, description="Between 1 and 250 marketplace candidates")
    filters: SearchFilters = Field(default_factory=SearchFilters)
    limit: int = Field(default=20, ge=1, le=100)


class SuspicionRequest(InputModel):
    listingId: str = Field(min_length=1, max_length=100)
    listedPrice: float = Field(gt=0)
    predictedFairPrice: float = Field(gt=0, le=10_000_000)
    accountAgeInDays: float = Field(ge=0, le=200_000)
    totalListings: int = Field(ge=0, le=1_000_000)
    listingsLast7Days: int = Field(ge=0, le=100_000)
    previousReports: int = Field(ge=0, le=100_000)
    completedSalesCount: int = Field(ge=0, le=1_000_000)
    rejectedListingsCount: int = Field(ge=0, le=100_000)
    averagePriceDeviation: float = Field(default=0, ge=0, le=10)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "campuskart-ml"}


@app.get("/model-metrics")
def model_metrics() -> dict[str, Any]:
    if not METRICS_PATH.exists():
        raise HTTPException(status_code=404, detail="Train the price model to generate validation metrics")
    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))


@app.post("/predict-price")
def price_prediction(payload: PriceFeatures) -> dict[str, Any]:
    try:
        return predict_price(payload.model_dump())
    except (FileNotFoundError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/price-fairness")
def price_fairness(payload: FairnessRequest) -> dict[str, Any]:
    result = predict_price(payload.model_dump())
    fair = result["predictedPrice"]
    ratio = (payload.listedPrice - fair) / max(fair, 1)
    if ratio <= -0.15:
        label = "GOOD DEAL"
    elif ratio <= 0.15:
        label = "FAIR"
    elif ratio <= 0.30:
        label = "SLIGHTLY HIGH"
    else:
        label = "OVERPRICED"
    return {
        "listedPrice": round(payload.listedPrice, 2),
        "predictedPrice": fair,
        "fairPriceRange": result["fairPriceRange"],
        "deviationPercent": round(ratio * 100, 2),
        "label": label,
        "modelVersion": result["modelVersion"],
    }


@app.post("/semantic-search")
def semantic_search(payload: SearchRequest) -> dict[str, Any]:
    try:
        return search_products(payload.query, [p.model_dump() for p in payload.products], payload.filters.model_dump(exclude_none=True), payload.limit)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/suspicion-score")
def suspicion_score(payload: SuspicionRequest) -> dict[str, Any]:
    return score_listing(payload.model_dump())


if __name__ == "__main__":
    import uvicorn

    host = "0.0.0.0" if os.getenv("APP_ENV", "development").lower() == "production" else "127.0.0.1"
    uvicorn.run("main:app", host=host, port=int(os.getenv("PORT", "8000")))
