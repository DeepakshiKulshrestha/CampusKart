# CampusKart AI/ML Service

This branch contains Roshni's Python service for resale-price suggestions, price fairness, product search, and listing-risk review. The Node application is expected to provide listings and seller information; this service does not own user authentication or marketplace database writes.

## Product catalog and dataset

The configurable catalog is [product_catalog.json](ml-service/data/product_catalog.json). It has 62 item types in eight categories, including lab and Manpro coats (XS–XXXL), safety equipment, stationery, books, personal care, chips/chocolate and other snacks, laptops, bicycles, and hostel essentials. Product records define brands, variants, pack options, item type, price range, and whether each item is reusable, consumable, or perishable.

The generator creates a local 1,050,000-row CSV at `ml-service/data/synthetic/campuskart_listings_v2.csv`. A companion manifest records its seed, catalog version, columns, and digest. The CSV and model binaries are Git-ignored. Price ranges and resale rules are synthetic assumptions, not verified market research; scores from these labels are not evidence of real-world accuracy.

## File guide

| File | Purpose |
| --- | --- |
| `ml-service/data/product_catalog.json` | Editable product types, sizes/variants, brands, pack quantities, price ranges, and generation weights. |
| `ml-service/data/generate_synthetic.py` | Reads the catalog and creates the CSV plus provenance manifest. |
| `ml-service/data/DATA_DICTIONARY.md` | Column definitions, synthetic assumptions, and appropriate use. |
| `ml-service/price_prediction/train.py` | Compares regressors, selects one by holdout MAE, and saves versioned plus `current` model artifacts. |
| `ml-service/price_prediction/predict.py` | Loads the active price artifact and prepares a request row for prediction. |
| `ml-service/fraud_detection/train.py` | Fits the Isolation Forest and stores metrics/model card. |
| `ml-service/fraud_detection/predict.py` | Loads the active anomaly model and returns a review signal. |
| `ml-service/semantic_search/search.py` | Sends query and bounded candidate-product text to Hugging Face Inference Providers and ranks hosted embeddings. |
| `ml-service/main.py` | FastAPI application, validation, routes, model loading, and production API-key check. |
| `ml-service/scripts/package_model_artifacts.py` | Packages the active model artifacts and checksums for a later deployment workflow. |
| `ml-service/scripts/artifact_bundle.py` | Restores a downloaded bundle after verifying its checksums. The API can use it on startup if bundle environment variables are configured. |
| `ml-service/docs/TRAINING_RUNBOOK.md` | Detailed manual commands and expected outputs. |
| `ml-service/docs/API_AND_MODEL_REFERENCE.md` | Request fields and route behavior. |

## Run it yourself, step by step

These commands are instructions for you to run in PowerShell. Review each step and its output before continuing. Do not start at the training step until the CSV has been generated.

### 1. Create the Python environment

From the repository root:

```powershell
py -3.11 -m venv ml-service/.venv
ml-service/.venv/Scripts/Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r ml-service/requirements.txt
Set-Location ml-service
```

Purpose: isolate project dependencies, install the packages used by FastAPI, scikit-learn, XGBoost and the other service modules, then move to the ML service folder. If the activation policy blocks activation, use `ml-service/.venv/Scripts/python.exe` for commands instead.

### 2. Review and generate the dataset

Review `data/product_catalog.json` and change its values if needed. Then, from `ml-service/`:

```powershell
python data/generate_synthetic.py --rows 1050000 --seed 20261020 --chunk-size 50000
```

Purpose: produce the CSV and `.manifest.json` in `data/synthetic/`. Check the final row count, file size, catalog version, and SHA-256 in the printed output/manifest. Change the seed when you deliberately want a different synthetic population. The output is large and is excluded from Git.

### 3. Train the price model yourself

```powershell
python price_prediction/train.py --data data/synthetic/campuskart_listings_v2.csv
```

Purpose: read completed-sale rows, compare Linear Regression, Random Forest, and XGBoost (if installed), score them against a held-out split, and save the selected model. Read the JSON summary, especially the feature list, model version, dataset digest, row counts, and synthetic caveat.

Expected outputs under `model_artifacts/price/`:

```text
<run-id>/model.joblib
<run-id>/metrics.json
<run-id>/MODEL_CARD.md
current/model.joblib
current/metrics.json
current/MODEL_CARD.md
```

### 4. Train the listing-risk model yourself

```powershell
python fraud_detection/train.py --data data/synthetic/campuskart_listings_v2.csv
```

Purpose: fit an Isolation Forest on generated benign seller profiles. Read its metrics/model card. Perfect synthetic-scenario diagnostics only show that it recognized rules created by this same generator; they do not measure real fraud detection quality. Do not automatically ban users or remove listings based on this score.

Expected outputs are in `model_artifacts/fraud/<run-id>/` and `model_artifacts/fraud/current/`.

### 5. Start the API and make manual requests

To use hosted Hugging Face embeddings, create an access token with Inference Providers permission. In the same PowerShell session used to start the API, set it as a process environment variable:

```powershell
$secureToken = Read-Host "Paste Hugging Face token" -AsSecureString
$env:HF_TOKEN = [System.Net.NetworkCredential]::new("", $secureToken).Password
$env:EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
```

Then start the API:

```powershell
uvicorn main:app --reload --port 8000
```

Keep this terminal running. In a second PowerShell terminal, use:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/model-metrics
```

Purpose: `/health` reports service status; `/model-metrics` identifies the loaded pricing model and its measured synthetic holdout results. Open `http://127.0.0.1:8000/docs` to manually try `/predict-price`, `/price-fairness`, `/semantic-search`, and `/suspicion-score`. For a Manpro lab coat request, provide `category`, `itemType`, `brand`, `variant` (for example `L`), `originalPrice`, `age`, `condition`, and `packQuantity`; provide `isPerishable`, `daysUntilExpiry`, and `opened` for relevant items. Stop the server with Ctrl+C in its terminal.

The hosted mode returns an engine name beginning `huggingface-inference:`. It sends query and candidate product text to Hugging Face; keep private student information out of those fields. Remote inference uses your Hugging Face account/provider quota and may incur charges. The model is pretrained; the CSV does not train it. The Node backend must retrieve and provide a bounded candidate set (1–250 listings) for each search request. Use `/docs` for manual endpoint checks. See [SECURITY_REVIEW.md](ml-service/docs/SECURITY_REVIEW.md) for remaining deployment work.

### 6. Package artifacts only when you decide to deploy

After inspecting both model cards and metrics:

```powershell
python scripts/package_model_artifacts.py
```

Purpose: produce a checksum-verified ZIP from the active models. It does not deploy the service. Deployment also needs private artifact storage, configured secrets, a hosting account, and integration with the main application. Do not upload secrets or large model/data files to ordinary Git history.

## Existing files in this workspace

Datasets, manifests, trained model artifacts, and the packaged model bundle are local generated outputs and are Git-ignored. Recreate/regenerate them with the steps above as needed; the source of truth is the code and catalog configuration. No Git commit or push has been made.

## Production boundary

The Dockerfile packages the ML API only; this branch does not contain an integrated/deployed full marketplace. Production use needs real transaction and reviewed fraud outcomes, model governance, secrets, persistent artifact hosting, operational monitoring, and Node/backend integration. Synthetic outputs should remain clearly labeled suggestions/review signals.

## Weekly Roshni work log

- **Week 1:** FastAPI service skeleton, health endpoint, initial synthetic generator and reproducible manifest.
- **Week 2:** Price-model training and versioned artifacts.
- **Week 3:** Candidate regressor comparison and price inference.
- **Week 4:** Fair-price labels and documented thresholds.
- **Week 5:** Model metrics endpoint and model version reporting.
- **Week 6:** Product search, catalog refresh, Isolation Forest scores, and human-readable risk factors.
- **Week 7:** Model cards, bundle checksums, API-key guard, and Docker configuration.
- **Week 7 catalog update:** Expanded to 62 college-student item types across eight categories; added sizes, variants, pack/expiry fields, and documented manual data/model workflow.
- **Week 7 cleanup:** Removed the temporary browser test page, local product-index write route, and local TF-IDF fallback. The API now uses the hosted embedding path and expects the Node backend to provide bounded search candidates.

Real-sale retraining, product sync from Node, frontend/backend integration, cloud artifact storage, and live deployment remain team integration work.
