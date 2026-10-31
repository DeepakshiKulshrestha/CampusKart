# Local setup, training, and deployment runbook

This document describes commands for the project owner to run. The code creates synthetic training data, trains the local price and listing-risk models, and exposes an API. It does not contain real marketplace transactions. Semantic search calls Hugging Face Inference Providers remotely; it does not download model weights.

## 1. Prerequisites

- Windows PowerShell and Python 3.11.
- Several GB of free disk space and at least 8 GB RAM for the 1.05M-row training workflow.
- A Hugging Face token with **Inference Providers** permission and provider access to the selected embedding model.
- Outbound network access to Hugging Face when starting/testing semantic search.

Search query and candidate listing text leave CampusKart for embedding. Never include private student information in those fields. Provider availability, quotas, latency, and billing depend on the account.

## 2. Install the service dependencies

From the repository root:

```powershell
py -3.11 -m venv ml-service/.venv
ml-service/.venv/Scripts/Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r ml-service/requirements.txt
Set-Location ml-service
```

If activation is blocked, use `ml-service/.venv/Scripts/python.exe` in place of `python`. The example environment file is a reference; the application does not load it automatically.

## 3. Generate and inspect training data

Review `data/product_catalog.json`, then run from `ml-service/`:

```powershell
python data/generate_synthetic.py --rows 1050000 --seed 20261020 --chunk-size 50000
```

Expected outputs are `data/synthetic/campuskart_listings_v2.csv` and its `.manifest.json`. Check row count, byte size, catalog version, and SHA-256. Keep the manifest with any copied CSV. Catalog prices, sale outcomes, and fraud scenarios are assumptions, not observed market facts; see [DATA_DICTIONARY.md](../data/DATA_DICTIONARY.md).

## 4. Train the models yourself

Price model:

```powershell
python price_prediction/train.py --data data/synthetic/campuskart_listings_v2.csv
```

It compares available regressors using held-out MAE and saves a dated run plus the active copy under `model_artifacts/price/`. Inspect the JSON output, metrics, and model card.

Listing-risk model:

```powershell
python fraud_detection/train.py --data data/synthetic/campuskart_listings_v2.csv
```

It trains an Isolation Forest on generated benign seller profiles and saves artifacts under `model_artifacts/fraud/`. Synthetic scenario diagnostics are not validated fraud-detection performance. Treat scores as review hints only.

## 5. Configure hosted semantic search

Create a Hugging Face token with Inference Providers permission. In the PowerShell session that will run the API, enter it without typing it as a plain command:

```powershell
$secureToken = Read-Host "Paste Hugging Face token" -AsSecureString
$env:HF_TOKEN = [System.Net.NetworkCredential]::new("", $secureToken).Password
$env:EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
```

The token stays in the server process environment. Do not put it in source, `.env.example`, browser code, screenshots, or Git. Clear it from this session after use with `Remove-Item Env:HF_TOKEN`.

## 6. Start and manually check the API

From `ml-service/`, in the same PowerShell session:

```powershell
$env:APP_ENV = "development"
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs`. Manually try `/predict-price`, `/price-fairness`, `/semantic-search`, and `/suspicion-score`. For semantic search, send a query plus 1–250 candidate products; the Node backend will provide the real marketplace candidates. A successful response should have an `engine` starting with `huggingface-inference:`. HTTP 503 means the server token, provider/network access, model availability, or provider response needs attention. Check the server terminal for the sanitized exception category.

Example search request body for Swagger's `/semantic-search` endpoint:

```json
{
  "query": "large Manpro lab coat",
  "products": [
    {
      "id": "sample-1",
      "title": "Manpro lab coat, size L",
      "itemType": "Lab coat",
      "variant": "L",
      "description": "Used laboratory coat in good condition",
      "category": "Lab and safety",
      "brand": "Manpro",
      "price": 650,
      "condition": "Good",
      "location": "Campus"
    }
  ],
  "filters": {},
  "limit": 10
}
```

In another terminal, check liveness and trained price metrics:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/model-metrics
```

Search connectivity does not prove relevance. Build a small expected-results query set (for example, “large Manpro lab coat”) and manually judge ranking. Stop the server with Ctrl+C.

## 7. Prepare a deployment artifact

After reviewing the model cards and metrics, optionally package the active models:

```powershell
python scripts/package_model_artifacts.py
```

The command creates a checksum-verified ZIP; it does not deploy anything. Store it in trusted private artifact storage. Do not commit the CSV, model binaries, package ZIP, or secrets.

## 8. Production deployment checklist

Before routing real traffic:

1. Deploy the API behind the application backend/private network with TLS; do not call it directly from browsers.
2. Configure `APP_ENV=production`, a strong `ML_API_KEY`, `HF_TOKEN`, and any artifact/model path settings in the host secret manager. Keep the Hugging Face token distinct from the Node-to-ML key.
3. Ensure active price and fraud models are present or that the private bundle restore settings are correct. Production startup checks remote embedding connectivity.
4. Integrate the Node backend so it sends authenticated requests and supplies a bounded candidate set for search.
5. Validate relevance and pricing on appropriate real data; validate risk scores against reviewed outcomes. Synthetic metrics are not production evidence.
6. Add operational controls before production use: request/concurrency limits, monitoring and alerts, dependency/image scanning, non-root container execution, access-controlled artifacts, rollback, and incident ownership.

The included Dockerfile runs the ML API only. It is not a complete CampusKart marketplace deployment.
