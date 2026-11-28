"""Load the evaluated pricing model and produce a conservative estimate range."""

from __future__ import annotations

from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

from .categories import normalize_category
from .train import MODEL_PATH


@lru_cache(maxsize=1)
def _model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError("Price model is missing; run python -m price_prediction.train")
    return joblib.load(MODEL_PATH)


def predict_price(features: dict) -> dict:
    artifact = _model()
    original = float(features["originalPrice"])
    title = " ".join(str(features.get(k) or "") for k in ("itemType", "variant")).strip() or "item"
    brand = str(features.get("brand") or "Unknown").strip() or "Unknown"
    row = {
        "category": normalize_category(features.get("category")),
        # Brand also joins the title so a brand typed only in the title (or only in the brand field) still counts.
        "title": f"{title} {brand if brand not in ('Unknown', 'Generic') else ''}".strip(),
        "brand": brand,
        "condition": features["condition"],
        "original_price_inr": original,
        "log_original_price": float(np.log1p(original)),
        "age_months": float(features["age"]),
    }
    raw = float(artifact["pipeline"].predict(pd.DataFrame([row]))[0])
    estimate = max(1.0, min(float(np.exp(raw)) * original, original))
    return {
        "predictedPrice": round(estimate, 2),
        "fairPriceRange": {"min": round(estimate * 0.90, 2), "max": round(estimate * 1.10, 2)},
        "currency": "INR",
        "modelVersion": artifact["modelVersion"],
        "dataNote": "Baseline trained on synthetic data; validate against completed campus sales before production use.",
    }
