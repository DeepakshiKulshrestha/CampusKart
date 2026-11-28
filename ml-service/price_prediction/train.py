"""Compare price regressors, refit the validation winner, and save versioned artifacts."""

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
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge
from sklearn.preprocessing import OneHotEncoder

from .categories import CATEGORIES, normalize_category

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "synthetic" / "campuskart_listings_v2.csv"
ARTIFACT_ROOT = Path(os.getenv("MODEL_STORAGE_ROOT", ROOT / "model_artifacts")) / "price"
CURRENT_DIR = ARTIFACT_ROOT / "current"
MODEL_PATH = Path(os.getenv("PRICE_MODEL_PATH", CURRENT_DIR / "model.joblib"))
METRICS_PATH = CURRENT_DIR / "metrics.json"
CATEGORICAL = ["category", "brand", "condition"]
TEXT = "title"
NUMERIC = ["original_price_inr", "log_original_price", "age_months"]
FEATURES = CATEGORICAL + [TEXT] + NUMERIC
TARGET = "sale_price_inr"
USECOLS = ["category", "item_type", "brand", "variant", "condition", "original_price_inr", "age_months", TARGET, "completed_sale"]


def build_frame(data: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    """Create model inputs. The marketplace sends a free-text listing title, so training titles are
    synthesised from item/brand/variant words with random drops and reordering to imitate that."""
    rng = np.random.default_rng(seed)
    data = data.copy()
    data["category"] = data["category"].map(normalize_category)
    titles = []
    for item, brand, variant in zip(data["item_type"].astype(str), data["brand"].astype(str), data["variant"].astype(str)):
        parts = [w for w in item.split() if rng.random() > 0.15 or len(item.split()) <= 2]
        if brand != "Generic" and rng.random() < 0.7: parts.insert(int(rng.integers(0, len(parts) + 1)), brand)
        if rng.random() < 0.4: parts.append(variant)
        titles.append(" ".join(parts))
    data[TEXT] = titles
    data["log_original_price"] = np.log1p(data["original_price_inr"])
    return data


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _candidate_models() -> dict:
    models = {"Ridge": Ridge(alpha=1.0)}
    try:
        from xgboost import XGBRegressor
        models["XGBRegressor"] = XGBRegressor(
            n_estimators=350, max_depth=6, learning_rate=0.07, min_child_weight=5,
            subsample=0.9, colsample_bytree=0.8, objective="reg:squarederror",
            tree_method="hist", random_state=42, n_jobs=2,
        )
    except ImportError:
        models["RandomForestRegressor"] = RandomForestRegressor(n_estimators=60, max_depth=18, min_samples_leaf=5, random_state=42, n_jobs=1)
    return models


def _pipeline(estimator) -> Pipeline:
    features = ColumnTransformer([
        ("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL),
        ("title", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), min_df=2, max_features=4000, sublinear_tf=True), TEXT),
        ("numeric", "passthrough", NUMERIC),
    ])
    return Pipeline([("features", features), ("regressor", estimator)])


def train_model(data_path: Path = DATA_PATH, run_id: str | None = None, candidate_rows: int = 50_000) -> dict:
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}. Run python data/generate_synthetic.py first.")
    data = pd.read_csv(data_path, usecols=USECOLS, low_memory=False)
    data = data[data["completed_sale"].eq(1)].dropna(subset=USECOLS).copy()
    data = build_frame(data)
    data[TARGET] = pd.to_numeric(data[TARGET], errors="coerce")
    data = data[data[TARGET].gt(0)]
    if len(data) < 1000:
        raise ValueError(f"Only {len(data)} completed sale rows found; at least 1,000 are required.")

    x = data[FEATURES]
    price_target = data[TARGET].astype(np.float64)
    # Learn the resale ratio, not the rupee amount: one model then scales from a Rs 80 notebook to a Rs 80,000 laptop.
    y = np.log(price_target / data["original_price_inr"]).astype(np.float32)
    inr = lambda pred, frame: np.clip(np.exp(pred) * frame["original_price_inr"].to_numpy(), 1, frame["original_price_inr"].to_numpy())
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.20, random_state=42)
    sample_count = min(candidate_rows, len(x_train))
    candidate_x = x_train.sample(n=sample_count, random_state=42)
    candidate_y = y_train.loc[candidate_x.index]
    actual = price_target.loc[x_test.index]

    results: dict[str, dict] = {}
    for name, estimator in _candidate_models().items():
        candidate = _pipeline(estimator)
        candidate.fit(candidate_x, candidate_y)
        prediction = inr(candidate.predict(x_test), x_test)
        results[name] = {
            "maeInr": round(float(mean_absolute_error(actual, prediction)), 2),
            "rmseInr": round(float(np.sqrt(mean_squared_error(actual, prediction))), 2),
            "r2": round(float(r2_score(actual, prediction)), 5),
            "candidateTrainingRows": int(sample_count),
        }

    winner_name = min(results, key=lambda name: results[name]["maeInr"])
    winner_estimator = _candidate_models()[winner_name]
    final_pipeline = _pipeline(winner_estimator)
    final_pipeline.fit(x_train, y_train)
    # Report final refit model on the untouched test set using the same metric definitions.
    final_prediction = inr(final_pipeline.predict(x_test), x_test)
    winner_metrics = {
        "maeInr": round(float(mean_absolute_error(actual, final_prediction)), 2),
        "rmseInr": round(float(np.sqrt(mean_squared_error(actual, final_prediction))), 2),
        "r2": round(float(r2_score(actual, final_prediction)), 5),
        "medianAbsPercentError": round(float(np.median(np.abs(final_prediction - actual) / actual) * 100), 2),
    }

    run_id = run_id or datetime.now(timezone.utc).strftime("synthetic-v2-%Y%m%dT%H%M%SZ")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,99}", run_id):
        raise ValueError("run-id must be 1–100 letters, digits, dots, underscores, or hyphens and start with a letter or digit")
    version_dir = ARTIFACT_ROOT / run_id
    version_dir.mkdir(parents=True, exist_ok=False)
    dataset_manifest_path = data_path.with_suffix(".manifest.json")
    dataset_manifest = json.loads(dataset_manifest_path.read_text(encoding="utf-8")) if dataset_manifest_path.exists() else {}
    metrics = {
        "modelName": "CampusKart price estimator",
        "modelVersion": run_id,
        "selectedEstimator": winner_name,
        "selectionMetric": "lowest MAE on one untouched 20% holdout after comparing candidate models",
        "finalHoldoutMetrics": winner_metrics,
        "candidateMetrics": results,
        "dataset": {
            "pathAtTraining": str(data_path),
            "file": data_path.name,
            "sha256": dataset_manifest.get("sha256", sha256_file(data_path)),
            "manifest": dataset_manifest,
            "csvRows": int(len(pd.read_csv(data_path, usecols=["listing_id"]))),
            "completedSaleRowsUsed": int(len(data)),
            "trainRows": int(len(x_train)),
            "testRows": int(len(x_test)),
            "splitSeed": 42,
            "generatorSeed": dataset_manifest.get("seed"),
            "syntheticOnly": True,
        },
        "features": FEATURES,
        "target": TARGET,
        "excludedFields": ["fair_reference_price_inr", "listed_price_inr", "synthetic_suspicious_label", "listing_id"],
        "fitDetails": {"candidateSampleRows": int(sample_count), "selectedModelFinalFitRows": int(len(x_train))},
        "versions": {"python": platform.python_version(), "scikitLearn": sklearn.__version__, "numpy": np.__version__},
        "trainedAtUtc": datetime.now(timezone.utc).isoformat(),
        "caveat": "Synthetic holdout metrics are pipeline diagnostics and do not establish real-campus pricing accuracy.",
    }
    joblib.dump({"pipeline": final_pipeline, "modelVersion": run_id, "targetTransform": "log-ratio"}, version_dir / "model.joblib", compress=3)
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
    dataset = metrics["dataset"]
    final = metrics["finalHoldoutMetrics"]
    lines = [
        "# Price Estimator Model Card", "",
        f"- Version: `{metrics['modelVersion']}`", f"- Estimator: `{metrics['selectedEstimator']}`",
        f"- Trained (UTC): `{metrics['trainedAtUtc']}`", f"- Dataset file: `{dataset['file']}`",
        f"- Dataset SHA-256: `{dataset['sha256']}`", f"- CSV rows: `{dataset['csvRows']:,}`",
        f"- Completed rows used: `{dataset['completedSaleRowsUsed']:,}`",
        f"- Training / holdout rows: `{dataset['trainRows']:,}` / `{dataset['testRows']:,}`", "",
        "## Measured holdout results", "",
        f"- MAE: ₹{final['maeInr']:,.2f}", f"- RMSE: ₹{final['rmseInr']:,.2f}", f"- R²: {final['r2']}", "",
        "## Features and target", "", f"- Inputs: {', '.join(metrics['features'])}",
        f"- Target: `{metrics['target']}` (completed sale price in INR)",
        f"- Excluded from features: {', '.join(metrics['excludedFields'])}", "",
        "## Candidate comparison", "", "Metrics are on the same untouched 20% holdout. Candidate models train on a fixed-size sample; the MAE winner is refit on all training rows.", "",
        "| Candidate | MAE (INR) | RMSE (INR) | R² | Candidate rows |", "| --- | ---: | ---: | ---: | ---: |",
    ]
    for name, result in metrics["candidateMetrics"].items():
        lines.append(f"| {name} | {result['maeInr']:.2f} | {result['rmseInr']:.2f} | {result['r2']:.5f} | {result['candidateTrainingRows']:,} |")
    lines += ["", "## Limitations", "", metrics["caveat"], "Replace synthetic training/holdout data with time-aware real completed-sales validation before relying on predictions for live pricing.", ""]
    path.write_text("\n".join(lines), encoding="utf-8")


def ensure_model() -> None:
    """Refuse silent toy training: the operator must generate/train the intended dataset."""
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Trained price model missing at {MODEL_PATH}. Follow docs/TRAINING_RUNBOOK.md.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DATA_PATH)
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--candidate-rows", type=int, default=50_000)
    args = parser.parse_args()
    train_model(args.data, args.run_id, args.candidate_rows)
