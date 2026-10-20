# CampusKart ML API reference

Run the service from `ml-service/`. Development defaults to `http://127.0.0.1:8000`. In production, the Node backend must send `x-ml-api-key` on every route except `GET /health`. Interactive API docs are available only outside production.

## Endpoints

### `GET /health`

Returns process liveness. It does not prove that models or external providers are ready.

### `GET /model-metrics`

Returns the active price model metrics; returns 404 if the metrics file is absent.

### `POST /predict-price`

Requires `category`, `originalPrice` in INR, `age` in months, and `condition` (`New`, `Like New`, `Good`, `Fair`, or `Poor`). Optional fields include `itemType`, `brand`, `variant`, `itemKind`, `packQuantity`, `isPerishable`, `daysUntilExpiry`, and `opened`. Returns the estimate, a ±10% range, model version, and synthetic-data caveat. The estimate is capped at the provided original price.

### `POST /price-fairness`

Accepts the price prediction fields plus `listedPrice`. Labels are policy thresholds: `GOOD DEAL` at or below -15%, `FAIR` through +15%, `SLIGHTLY HIGH` through +30%, otherwise `OVERPRICED`. Validate against real completed sales before relying on these labels.

### `POST /semantic-search`

Requires `query` (2–500 characters) and `products` (1–250 marketplace candidates). Each candidate has bounded fields: `id`, `title`, `itemType`, `variant`, `description`, `category`, `brand`, `price`, `condition`, and `location`. Optional filters are `category`, `condition`, `location`, `minPrice`, and `maxPrice`; `limit` is 1–100.

The service sends query and candidate text to Hugging Face Inference Providers and ranks embeddings by cosine similarity. The default model is `sentence-transformers/all-MiniLM-L6-v2`; no model weights are downloaded locally. Success reports `huggingface-inference:<model-id>`. Missing credentials, network/provider failures, or invalid provider output return HTTP 503. If filters leave no candidates, results are empty and `engine` is `not-run`. Candidate data must not contain private student information.

The Node backend should retrieve/filter marketplace candidates and submit only a bounded candidate set. This ML service does not own the product database or maintain an index.

### `POST /suspicion-score`

Accepts listing and seller-behavior features and returns a 0–100 review signal, anomaly score, model version, risk level, factors, and a `NO_FLAG`/`FLAG_FOR_REVIEW` suggestion. This is not a fraud probability. Never automatically ban users, remove listings, or make payment decisions from this score.

## Configuration

| Variable | Purpose |
| --- | --- |
| `HF_TOKEN` | Hugging Face Inference Providers token. Backend/host secret only; never expose it to a browser or Git. |
| `EMBEDDING_MODEL` | Hosted embedding model ID; defaults to `sentence-transformers/all-MiniLM-L6-v2`. |
| `ML_API_KEY` | Node-to-ML shared key, required when `APP_ENV=production`; distinct from `HF_TOKEN`. |
| `APP_ENV` | `production` enables API-key enforcement, disables docs, and verifies hosted embeddings at startup. |
| `PRICE_MODEL_PATH`, `FRAUD_MODEL_PATH` | Optional overrides for active trained model files. |
| `MODEL_STORAGE_ROOT` | Root folder for model artifacts. |
| `MODEL_ARTIFACT_BUNDLE_URL`, `MODEL_ARTIFACT_BUNDLE_TOKEN` | Optional private HTTPS model bundle restore settings. |

The application does not load `.env` automatically. Inject values through the process environment or hosting secret manager.

## Model artifact layout and limitations

- Price and fraud models are loaded from `model_artifacts/<family>/current/` by default; dated run folders preserve training history.
- The embedding model is hosted and is not trained on the CampusKart CSV.
- Models trained from synthetic rules are development baselines. Use real, time-separated sale outcomes and admin-reviewed fraud outcomes before making production-quality claims.
- Bundle checksums detect corruption but are not signatures. Only restore trusted `joblib` files from access-controlled storage.

See [TRAINING_RUNBOOK.md](TRAINING_RUNBOOK.md) for manual setup and [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for outstanding deployment work.
