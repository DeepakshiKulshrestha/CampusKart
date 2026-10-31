"""Generate a reproducible, catalog-based synthetic CampusKart listings CSV."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "data" / "synthetic" / "campuskart_listings_v2.csv"
CATALOG_PATH = ROOT / "data" / "product_catalog.json"
COLUMNS = [
    "listing_id", "category", "item_type", "brand", "variant", "pack_quantity", "item_kind",
    "original_price_inr", "age_months", "condition", "is_perishable", "days_until_expiry", "opened",
    "listed_price_inr", "completed_sale", "sale_price_inr", "fair_reference_price_inr",
    "account_age_days", "total_listings", "listings_last_7_days", "previous_reports",
    "completed_sales_count", "rejected_listings_count", "average_price_deviation", "synthetic_suspicious_label",
]
CONDITIONS = np.array(["New", "Like New", "Good", "Fair", "Poor"])
CONDITION_FACTOR = np.array([1.00, 0.88, 0.72, 0.53, 0.34])


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_dataset(path: Path, rows: int, seed: int, chunk_size: int) -> dict:
    if rows < 1000:
        raise ValueError("Use at least 1,000 rows; default is 1,050,000.")
    if chunk_size < 1000:
        raise ValueError("chunk-size must be at least 1,000")
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    items = catalog["items"]
    weights = np.asarray([item["weight"] for item in items], dtype=float)
    weights /= weights.sum()
    path.parent.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(seed)
    start = 0
    with path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(COLUMNS)
        while start < rows:
            count = min(chunk_size, rows - start)
            item_indexes = rng.choice(len(items), count, p=weights)
            selected = [items[int(i)] for i in item_indexes]
            brands = [rng.choice(item["brands"]) for item in selected]
            variants = [rng.choice(item["variants"]) for item in selected]
            packs = np.fromiter((rng.choice(item["packQuantities"]) for item in selected), dtype=np.int32, count=count)
            kinds = np.array([item["kind"] for item in selected])
            lo = np.fromiter((item["priceRangeInr"][0] for item in selected), dtype=float, count=count)
            hi = np.fromiter((item["priceRangeInr"][1] for item in selected), dtype=float, count=count)
            unit_price = rng.uniform(lo, hi)
            original = unit_price * packs
            is_perishable = kinds == "perishable"
            reusable = kinds == "reusable"
            age = np.where(reusable, rng.integers(0, 97, count), rng.integers(0, 4, count))
            expiry_days = np.zeros(count, dtype=np.int32)
            for i, item in enumerate(selected):
                if is_perishable[i]:
                    expiry_days[i] = rng.integers(item["shelfLifeDays"][0] + 1, item["shelfLifeDays"][1] + 1)
            opened = (is_perishable & (rng.random(count) < 0.08)).astype(int)
            cond_idx = rng.choice(len(CONDITIONS), count, p=[0.18, 0.36, 0.34, 0.10, 0.02])
            cond_idx[~reusable] = rng.choice(2, int((~reusable).sum()), p=[0.58, 0.42])
            condition = CONDITIONS[cond_idx]
            decay_months = np.fromiter((item.get("decayMonths", 72) for item in selected), dtype=float, count=count)
            resale = np.fromiter((item.get("resaleFactor", 0.82) for item in selected), dtype=float, count=count)
            age_factor = np.where(reusable, np.exp(-age / decay_months), 1.0)
            expiry_factor = np.where(is_perishable, np.clip(0.55 + expiry_days / 730.0, 0.55, 0.99), 1.0)
            opened_factor = np.where(opened == 1, 0.45, 1.0)
            fair = original * np.where(reusable, 0.76, resale) * CONDITION_FACTOR[cond_idx] * age_factor * expiry_factor * opened_factor
            fair *= rng.lognormal(mean=-0.5 * 0.13**2, sigma=0.13, size=count)
            fair = np.maximum(5, fair)

            suspicious = rng.random(count) < 0.045
            deviation = rng.normal(0.0, 0.11, count)
            deviation[suspicious] = rng.choice([-1.0, 1.0], int(suspicious.sum())) * rng.uniform(0.65, 2.2, int(suspicious.sum()))
            listed = np.maximum(5, fair * (1.0 + deviation))
            account_age = np.clip(rng.gamma(4.0, 80.0, count), 1, 2500)
            total_listings = np.clip(rng.poisson(4.0, count), 0, 100)
            listings_week = np.clip(rng.poisson(1.1, count), 0, 50)
            reports = np.clip(rng.poisson(0.12, count), 0, 30)
            completed = np.clip(rng.poisson(2.4, count), 0, 100)
            rejected = np.clip(rng.poisson(0.10, count), 0, 30)
            account_age[suspicious] = rng.integers(1, 30, int(suspicious.sum()))
            total_listings[suspicious] = rng.integers(5, 60, int(suspicious.sum()))
            listings_week[suspicious] = rng.integers(8, 30, int(suspicious.sum()))
            reports[suspicious] = rng.integers(1, 8, int(suspicious.sum()))
            completed[suspicious] = rng.integers(0, 2, int(suspicious.sum()))
            rejected[suspicious] = rng.integers(1, 10, int(suspicious.sum()))
            avg_deviation = np.clip(np.abs(rng.normal(0.12, 0.10, count)), 0, 3)
            avg_deviation[suspicious] = np.abs(deviation[suspicious])
            sale_event = rng.random(count) < 0.62
            sale_price = np.maximum(5, listed * rng.normal(0.96, 0.035, count)).round().astype(np.int64)

            for i in range(count):
                writer.writerow((
                    start + i + 1, selected[i]["category"], selected[i]["itemType"], brands[i], variants[i], int(packs[i]), kinds[i],
                    round(float(original[i]), 2), int(age[i]), condition[i], int(is_perishable[i]), int(expiry_days[i]), int(opened[i]),
                    round(float(listed[i]), 2), int(sale_event[i]), int(sale_price[i]) if sale_event[i] else "", round(float(fair[i]), 2),
                    int(account_age[i]), int(total_listings[i]), int(listings_week[i]), int(reports[i]), int(completed[i]), int(rejected[i]),
                    round(float(avg_deviation[i]), 5), int(suspicious[i]),
                ))
            start += count
            print(f"Wrote {start:,}/{rows:,} rows")

    manifest = {
        "dataset": "CampusKart synthetic college marketplace listings", "version": "v2",
        "catalogVersion": catalog["catalogVersion"], "catalogFile": CATALOG_PATH.name,
        "rows": rows, "seed": seed, "chunkSize": chunk_size, "csv": path.name,
        "sha256": sha256_file(path), "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "syntheticOnly": True,
        "purpose": "Pipeline development, load testing, and baseline model experiments; not production performance evidence.",
        "columns": COLUMNS,
        "catalogSummary": {"distinctItemTypes": len(items), "categories": sorted({i["category"] for i in items}), "itemKinds": ["reusable", "consumable", "perishable"]},
        "limitations": [
            "Catalog prices and weights are configurable synthetic assumptions, not verified local retail or resale observations.",
            "Price labels follow hand-designed depreciation, condition, expiry, and noise rules.",
            "Synthetic suspicious labels encode generated scenarios, not confirmed fraud cases.",
            "No personal data, real students, real transactions, or measured campus demand are represented.",
        ],
    }
    manifest_path = path.with_suffix(".manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"CSV: {path} ({path.stat().st_size / (1024**2):.1f} MiB)")
    print(f"Manifest: {manifest_path}\nSHA-256: {manifest['sha256']}")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, default=1_050_000)
    parser.add_argument("--seed", type=int, default=20261020)
    parser.add_argument("--chunk-size", type=int, default=50_000)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    write_dataset(args.output, args.rows, args.seed, args.chunk_size)


if __name__ == "__main__":
    main()
