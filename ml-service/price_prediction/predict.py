"""Load the evaluated pricing model and produce a conservative estimate range."""

from __future__ import annotations

from functools import lru_cache

import joblib
import pandas as pd

from .train import MODEL_PATH


@lru_cache(maxsize=1)
def _model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError("Price model is missing; run python price_prediction/train.py")
    return joblib.load(MODEL_PATH)


def predict_price(features: dict) -> dict:
    artifact = _model()
    row = {
        "category": features["category"],
        "item_type": features.get("itemType", "Generic item"),
        "brand": features.get("brand", "Unknown"),
        "variant": features.get("variant", "Standard"),
        "item_kind": features.get("itemKind", "reusable"),
        "original_price_inr": features["originalPrice"],
        "age_months": features["age"],
        "pack_quantity": features.get("packQuantity", 1),
        "is_perishable": int(features.get("isPerishable", False)),
        "days_until_expiry": features.get("daysUntilExpiry", 0),
        "opened": int(features.get("opened", False)),
        "condition": features["condition"],
    }
    estimate = float(artifact["pipeline"].predict(pd.DataFrame([row]))[0])
    estimate = max(1.0, min(estimate, float(features["originalPrice"])))
    return {
        "predictedPrice": round(estimate, 2),
        "fairPriceRange": {"min": round(estimate * 0.90, 2), "max": round(estimate * 1.10, 2)},
        "currency": "INR",
        "modelVersion": artifact["modelVersion"],
        "dataNote": "Baseline trained on synthetic data; validate against completed campus sales before production use.",
    }
