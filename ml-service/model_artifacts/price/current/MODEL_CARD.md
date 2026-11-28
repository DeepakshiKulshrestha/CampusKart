# Price Estimator Model Card

- Version: `marketplace-v3-r2`
- Estimator: `XGBRegressor`
- Trained (UTC): `2026-11-28T11:10:53.696441+00:00`
- Dataset file: `campuskart_listings_v2.csv`
- Dataset SHA-256: `2892476111b6bb35c1c193f5394c73b8aa024f7e00c99fc88f089eecec540c2a`
- CSV rows: `400,000`
- Completed rows used: `248,035`
- Training / holdout rows: `198,428` / `49,607`

## Measured holdout results

- MAE: ₹495.31
- RMSE: ₹2,321.93
- R²: 0.85464

## Features and target

- Inputs: category, brand, condition, title, original_price_inr, log_original_price, age_months
- Target: `sale_price_inr` (completed sale price in INR)
- Excluded from features: fair_reference_price_inr, listed_price_inr, synthetic_suspicious_label, listing_id

## Candidate comparison

Metrics are on the same untouched 20% holdout. Candidate models train on a fixed-size sample; the MAE winner is refit on all training rows.

| Candidate | MAE (INR) | RMSE (INR) | R² | Candidate rows |
| --- | ---: | ---: | ---: | ---: |
| Ridge | 614.48 | 2535.79 | 0.82663 | 100,000 |
| XGBRegressor | 503.72 | 2339.35 | 0.85245 | 100,000 |

## Limitations

Synthetic holdout metrics are pipeline diagnostics and do not establish real-campus pricing accuracy.
Replace synthetic training/holdout data with time-aware real completed-sales validation before relying on predictions for live pricing.
