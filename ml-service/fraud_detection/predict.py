"""Load the trained Isolation Forest and add named, explainable threshold signals."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = Path(os.getenv("FRAUD_MODEL_PATH", Path(os.getenv("MODEL_STORAGE_ROOT", ROOT / "model_artifacts")) / "fraud" / "current" / "model.joblib"))
FEATURES = ["priceDeviation", "accountAgeInDays", "totalListings", "listingsLast7Days", "previousReports", "completedSalesCount", "rejectedListingsCount", "averagePriceDeviation"]


@lru_cache(maxsize=1)
def _artifact():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Trained fraud model missing at {MODEL_PATH}. Follow docs/TRAINING_RUNBOOK.md.")
    return joblib.load(MODEL_PATH)


def score_listing(payload: dict) -> dict:
    artifact = _artifact()
    fair = max(float(payload["predictedFairPrice"]), 1.0)
    deviation = abs(float(payload["listedPrice"]) - fair) / fair
    values = {
        "priceDeviation": deviation,
        "accountAgeInDays": float(payload["accountAgeInDays"]),
        "totalListings": float(payload["totalListings"]),
        "listingsLast7Days": float(payload["listingsLast7Days"]),
        "previousReports": float(payload["previousReports"]),
        "completedSalesCount": float(payload["completedSalesCount"]),
        "rejectedListingsCount": float(payload["rejectedListingsCount"]),
        "averagePriceDeviation": float(payload["averagePriceDeviation"]),
    }
    row = np.asarray([[values[name] for name in FEATURES]], dtype=float)
    model_input = artifact["scaler"].transform(np.log1p(np.clip(row, 0, None)))
    raw = float(artifact["model"].decision_function(model_input)[0])
    anomaly_score = float(np.clip(50 - raw * 160, 0, 100))
    reasons = []
    if deviation >= 0.60: reasons.append({"feature": "priceDeviation", "value": round(deviation * 100, 1), "reason": "Listed price differs from estimated fair price by at least 60%"})
    if values["accountAgeInDays"] < 7: reasons.append({"feature": "accountAgeInDays", "value": values["accountAgeInDays"], "reason": "Seller account is less than 7 days old"})
    if values["listingsLast7Days"] >= 10: reasons.append({"feature": "listingsLast7Days", "value": values["listingsLast7Days"], "reason": "Unusually high listing volume in the last 7 days"})
    if values["previousReports"] >= 2: reasons.append({"feature": "previousReports", "value": values["previousReports"], "reason": "Seller has multiple previous reports"})
    if values["rejectedListingsCount"] >= 2: reasons.append({"feature": "rejectedListingsCount", "value": values["rejectedListingsCount"], "reason": "Seller has multiple rejected listings"})
    if values["completedSalesCount"] == 0 and values["totalListings"] >= 5: reasons.append({"feature": "completedSalesCount", "value": 0, "reason": "No completed sales despite several listings"})
    score = int(round(min(100, anomaly_score * 0.55 + min(len(reasons) * 12, 60))))
    return {
        "listingId": payload["listingId"],
        "suspicionScore": score,
        "anomalyScore": round(anomaly_score, 2),
        "riskLevel": "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW",
        "riskFactors": reasons,
        "model": "IsolationForest + transparent threshold signals",
        "modelVersion": artifact["modelVersion"],
        "modelNote": "Trained from synthetic benign profiles; human review required and this is not verified fraud probability.",
        "decision": "FLAG_FOR_REVIEW" if score >= 40 else "NO_FLAG",
    }
