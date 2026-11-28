# Running the ML service on macOS (zsh)

These are the exact steps used to run Roshni's trained models on a Mac (Apple Silicon). The active models are **committed to Git** under `ml-service/model_artifacts/{price,fraud}/current/` (synthetic data, about 1 MB), so there is nothing to download, unzip or retrain.

All commands run from the repository root unless noted.

## 1. Check the models are there

```zsh
ls ml-service/model_artifacts/price/current ml-service/model_artifacts/fraud/current
# model.joblib  metrics.json  MODEL_CARD.md   (in each folder)
```

Current version: `marketplace-v3-r2` (price: XGBoost regressor; fraud: Isolation Forest). Any other files in `model_artifacts/` (for example an old bundle zip) are ignored by Git and not used.

## 2. Python environment (match the training versions)

The models were trained with **Python 3.13, scikit-learn 1.7.0, numpy 2.3.1** (see `model_artifacts/price/current/metrics.json` → `versions`). Use those exact versions: newer scikit-learn still loads the models but warns `InconsistentVersionWarning` for every component, and results may drift. scikit-learn 1.7.0 has no Python 3.14 build, so you need Python 3.13 (3.11–3.13 work).

If `python3 --version` is not 3.11–3.13, the simplest way to get 3.13 without touching Homebrew is [uv](https://docs.astral.sh/uv/):

```zsh
python3 -m pip install --user uv          # or: brew install uv
uv python install 3.13
PY="$(uv python find 3.13)"               # path to python3.13
```

Then create the venv:

```zsh
cd ml-service
"$PY" -m venv .venv                       # or python3.13 / python3.11 if you have it
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt "scikit-learn==1.7.0" "numpy==2.3.1"
```

### XGBoost needs OpenMP (`libomp`)

Without Homebrew's `libomp`, XGBoost fails with
`XGBoost Library (libxgboost.dylib) could not be loaded … Library not loaded: @rpath/libomp.dylib`.

- **Usual fix:** `brew install libomp` (then skip the variable below).
- **No Homebrew changes:** scikit-learn's wheel already ships `libomp.dylib`; point the loader at it:
  ```zsh
  export DYLD_FALLBACK_LIBRARY_PATH="$PWD/.venv/lib/python3.13/site-packages/sklearn/.dylibs"
  ```

Check both models load without version warnings:

```zsh
.venv/bin/python -W always -c "from price_prediction.predict import predict_price as p; print(p({'category':'Books','originalPrice':500,'age':6,'condition':'Good'}))"
```

## 3. Start the service

Still inside `ml-service/`, in its own terminal tab:

```zsh
DYLD_FALLBACK_LIBRARY_PATH="$PWD/.venv/lib/python3.13/site-packages/sklearn/.dylibs" \
  .venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

> **Don't start it through `nohup`, `env` or `sudo`.** macOS strips `DYLD_*` variables when launching protected system programs, so XGBoost loses `libomp` again: `/health` still answers but `/predict-price` fails with HTTP 500 (`Library not loaded: @rpath/libomp.dylib` in the log). Or use `brew install libomp` and skip the variable entirely.

The first start downloads the free search model `all-MiniLM-L6-v2` (about 90 MB, ONNX via `fastembed`) into `ml-service/.cache/fastembed` (ignored by Git). After that it runs fully offline. **No `HF_TOKEN` is needed.**

Development mode (the default) needs no `ml-service/.env` and no API key. Interactive docs: http://localhost:8000/docs

### Test it like production (API key on)

With `APP_ENV=production` the service rejects every call except `/health` unless it carries `x-ml-api-key: <ML_API_KEY>`. To test this locally, start it with the same key as `backend/.env`:

```zsh
APP_ENV=production ML_API_KEY=<same value as backend/.env> \
DYLD_FALLBACK_LIBRARY_PATH="$PWD/.venv/lib/python3.13/site-packages/sklearn/.dylibs" \
  .venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

`/docs` is turned off in production mode.

## 4. Check it

```zsh
curl http://localhost:8000/health
curl http://localhost:8000/model-metrics                       # add -H 'x-ml-api-key: …' in production mode
curl -X POST http://localhost:8000/predict-price -H 'Content-Type: application/json' \
  -d '{"category":"Electronics","itemType":"Casio FX-991EX calculator","brand":"Casio","originalPrice":1500,"age":12,"condition":"Good"}'
```

Expected: `{"status":"ok",...}`, the metrics JSON (holdout MAE ≈ ₹495, RMSE ≈ ₹2,322, R² ≈ 0.855, all on **synthetic** data), and a prediction with `predictedPrice`, `fairPriceRange` and `modelVersion: marketplace-v3-r2`.

## 5. Connect the backend

`backend/.env`: `AI_SERVICE_URL=http://localhost:8000`, and `ML_API_KEY=<same value>` if the ML service runs in production mode. The backend sends the key automatically.

## 6. Stop it

`Ctrl+C` in its terminal, or `pkill -f "uvicorn main:app"`.

## Retraining (only for model changes)

See [TRAINING_RUNBOOK.md](TRAINING_RUNBOOK.md) (written for PowerShell: use `.venv/bin/python` instead of `.venv\Scripts\python.exe` and `/` instead of `\`). Not needed to run the service.
