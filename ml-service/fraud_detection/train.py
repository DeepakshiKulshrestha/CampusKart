"""Fit the unsupervised listing-risk model from the documented synthetic cohort."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "synthetic" / "campuskart_listings_v2.csv"
ARTIFACT_ROOT = Path(os.getenv("MODEL_STORAGE_ROOT", ROOT / "model_artifacts")) / "fraud"
CURRENT_DIR = ARTIFACT_ROOT / "current"
FEATURES = ["priceDeviation", "accountAgeInDays", "totalListings", "listingsLast7Days", "previousReports", "completedSalesCount", "rejectedListingsCount", "averagePriceDeviation"]
USECOLS = ["listed_price_inr", "fair_reference_price_inr", "account_age_days", "total_listings", "listings_last_7_days", "previous_reports", "completed_sales_count", "rejected_listings_count", "average_price_deviation", "synthetic_suspicious_label"]


def _input_frame(data_path: Path) -> tuple[pd.DataFrame, pd.Series]:
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}. Run python data/generate_synthetic.py first.")
    frame = pd.read_csv(data_path, usecols=USECOLS, low_memory=False).dropna()
    fair = frame["fair_reference_price_inr"].clip(lower=1)
    x = pd.DataFrame({
        "priceDeviation": ((frame["listed_price_inr"] - fair).abs() / fair).clip(0, 5),
        "accountAgeInDays": frame["account_age_days"],
        "totalListings": frame["total_listings"],
        "listingsLast7Days": frame["listings_last_7_days"],
        "previousReports": frame["previous_reports"],
        "completedSalesCount": frame["completed_sales_count"],
        "rejectedListingsCount": frame["rejected_listings_count"],
        "averagePriceDeviation": frame["average_price_deviation"],
    })
    x = np.log1p(x.clip(lower=0))
    y = frame["synthetic_suspicious_label"].astype(int)
    return x, y


def train_model(data_path: Path = DATA_PATH, run_id: str | None = None, fit_rows: int = 500_000) -> dict:
    x, y = _input_frame(data_path)
    if len(x) < 1000:
        raise ValueError("At least 1,000 usable listing rows are required.")
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.20, random_state=42, stratify=y)
    benign = x_train.loc[y_train.eq(0)]
    fit_count = min(fit_rows, len(benign))
    fit_sample = benign.sample(n=fit_count, random_state=42)
    scaler = StandardScaler()
    scaled_train = scaler.fit_transform(fit_sample)
    model = IsolationForest(n_estimators=200, max_samples="auto", contamination=0.045, random_state=42, n_jobs=1)
    model.fit(scaled_train)

    scored = scaler.transform(x_test)
    anomaly = -model.decision_function(scored)
    try:
        diagnostic = {
            "syntheticScenarioRocAuc": round(float(roc_auc_score(y_test, anomaly)), 5),
            "syntheticScenarioAveragePrecision": round(float(average_precision_score(y_test, anomaly)), 5),
        }
    except ValueError:
        diagnostic = {}

    run_id = run_id or datetime.now(timezone.utc).strftime("synthetic-v2-%Y%m%dT%H%M%SZ")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,99}", run_id):
        raise ValueError("run-id must be 1–100 letters, digits, dots, underscores, or hyphens and start with a letter or digit")
    version_dir = ARTIFACT_ROOT / run_id
    version_dir.mkdir(parents=True, exist_ok=False)
    manifest_path = data_path.with_suffix(".manifest.json")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    if "sha256" in manifest:
        digest = manifest["sha256"]
    else:
        hasher = hashlib.sha256()
        with data_path.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                hasher.update(block)
        digest = hasher.hexdigest()
    metrics = {
        "modelName": "CampusKart listing anomaly detector",
        "modelVersion": run_id,
        "algorithm": "IsolationForest trained on generated benign profiles",
        "rows": int(len(x)), "fitRows": int(fit_count), "holdoutRows": int(len(x_test)),
        "features": FEATURES, "transformation": "log1p(non-negative features), then StandardScaler",
        "expectedContamination": 0.045, "randomSeed": 42,
        "syntheticScenarioDiagnostics": diagnostic,
        "dataset": {"file": data_path.name, "sha256": digest, "generatorSeed": manifest.get("seed"), "syntheticOnly": True},
        "versions": {"python": platform.python_version(), "scikitLearn": sklearn.__version__, "numpy": np.__version__},
        "trainedAtUtc": datetime.now(timezone.utc).isoformat(),
        "caveat": "The scenario labels are produced by the same hand-designed generator assumptions. Diagnostic scores are not real fraud detection performance.",
    }
    joblib.dump({"model": model, "scaler": scaler, "features": FEATURES, "modelVersion": run_id}, version_dir / "model.joblib", compress=3)
    (version_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    _write_model_card(version_dir / "MODEL_CARD.md", metrics)
    CURRENT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(version_dir / "model.joblib", CURRENT_DIR / "model.joblib")
    shutil.copy2(version_dir / "metrics.json", CURRENT_DIR / "metrics.json")
    shutil.copy2(version_dir / "MODEL_CARD.md", CURRENT_DIR / "MODEL_CARD.md")
    print(json.dumps(metrics, indent=2))
    print(f"Versioned model: {version_dir}")
    print(f"Active model: {CURRENT_DIR / 'model.joblib'}")
    return metrics


def _write_model_card(path: Path, metrics: dict) -> None:
    lines = [
        "# Listing Anomaly Model Card", "", f"- Version: `{metrics['modelVersion']}`",
        f"- Algorithm: {metrics['algorithm']}", f"- Trained (UTC): `{metrics['trainedAtUtc']}`",
        f"- Dataset: `{metrics['dataset']['file']}` ({metrics['rows']:,} rows)",
        f"- Dataset SHA-256: `{metrics['dataset']['sha256']}`", f"- Fitted benign rows: `{metrics['fitRows']:,}`",
        f"- Held-out rows: `{metrics['holdoutRows']:,}`", f"- Features: {', '.join(metrics['features'])}",
        f"- Transformation: `{metrics['transformation']}`", "", "## Diagnostic only", "",
        json.dumps(metrics["syntheticScenarioDiagnostics"], indent=2), "",
        "The labels are generated by the same scenario assumptions used to synthesize the cohort. These values are not estimates of real fraud detection performance. The score must only route listings to a person for review; it must never automatically reject or ban users.", "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DATA_PATH)
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--fit-rows", type=int, default=500_000)
    args = parser.parse_args()
    train_model(args.data, args.run_id, args.fit_rows)
