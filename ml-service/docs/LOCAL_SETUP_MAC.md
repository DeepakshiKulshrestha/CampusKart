# Running the ML service on macOS (zsh)

These are the exact steps used to run Roshni's trained models on a Mac (Apple Silicon, macOS 15+). They use the **pre-trained model bundle**; you do not need to generate the dataset or retrain.

All commands run from the repository root unless noted.

## 1. Unpack the model bundle

Put the bundle zip (e.g. `campuskart-model-bundle.zip`, shared by Roshni) into `ml-service/model_artifacts/`, then:

```zsh
cd ml-service/model_artifacts
unzip -l campuskart-model-bundle.zip          # look before extracting: only price/… fraud/… and bundle-manifest.json
unzip -o campuskart-model-bundle.zip
ls price/current fraud/current                 # model.joblib, metrics.json, MODEL_CARD.md in each
cd ../..
```

Optional integrity check against the manifest:

```zsh
python3 - <<'EOF'
import json, hashlib
m = json.load(open('ml-service/model_artifacts/bundle-manifest.json'))
for f, h in m['files'].items():
    ok = hashlib.sha256(open('ml-service/model_artifacts/' + f, 'rb').read()).hexdigest() == h
    print('OK ' if ok else 'BAD', f)
EOF
```

`ml-service/model_artifacts/` (including the zip) is in `.gitignore`. Never commit it.

## 2. Python environment

The models were trained with **Python 3.13.5, scikit-learn 1.9.1, numpy 2.5.4** (see `price/current/metrics.json` → `versions`). Install the same scikit-learn and numpy so the pickled models load exactly. Python 3.11–3.14 all work; this setup used Python 3.14 (the only version on the machine).

```zsh
cd ml-service
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt "scikit-learn==1.9.1" "numpy==2.5.4"
```

### XGBoost needs OpenMP (`libomp`)

The price model is an XGBoost regressor. On a Mac without Homebrew's `libomp`, importing XGBoost fails with
`XGBoost Library (libxgboost.dylib) could not be loaded … Library not loaded: @rpath/libomp.dylib`.

Pick one fix:

- **Usual fix:** `brew install libomp` (then you can skip the variable below).
- **No Homebrew changes:** scikit-learn's wheel already contains a `libomp.dylib`; point the loader at it when starting Python:
  ```zsh
  export DYLD_FALLBACK_LIBRARY_PATH="$PWD/.venv/lib/python3.14/site-packages/sklearn/.dylibs"   # adjust python3.14 to your version
  ```

Check that both models load:

```zsh
.venv/bin/python -c "import joblib; [print(m, type(joblib.load(f'model_artifacts/{m}/current/model.joblib')).__name__) for m in ('price','fraud')]"
```

## 3. Start the service

Still inside `ml-service/`:

```zsh
DYLD_FALLBACK_LIBRARY_PATH="$PWD/.venv/lib/python3.14/site-packages/sklearn/.dylibs" \
  .venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

> **Don't start it through `nohup`, `env` or `sudo`.** macOS strips `DYLD_*` variables when launching protected system programs, so XGBoost loses `libomp` again: `/health` still answers but `/predict-price` fails with HTTP 500 (`Library not loaded: @rpath/libomp.dylib` in the log). Run it in its own terminal tab as above, or use `brew install libomp` and skip the variable entirely.

No `ml-service/.env` is needed for local development (defaults: development mode, models under `./model_artifacts`, no API key). Interactive docs: http://localhost:8000/docs

## 4. Check it

```zsh
curl http://localhost:8000/health
curl http://localhost:8000/model-metrics
curl -X POST http://localhost:8000/predict-price -H 'Content-Type: application/json' \
  -d '{"category":"Electronics","brand":"Casio","originalPrice":1500,"age":12,"condition":"Good"}'
```

Expected: `{"status":"ok",...}`, the metrics JSON (holdout MAE ≈ ₹210.74, RMSE ≈ ₹1,804.59, R² ≈ 0.896, all on **synthetic** data), and a prediction with `predictedPrice`, `fairPriceRange` and `modelVersion`.

## 5. Connect the backend

`backend/.env` → `AI_SERVICE_URL=http://localhost:8000`. `ML_API_KEY` is only required when the ML service runs with `APP_ENV=production`; use the same value on both sides then.

## 6. Semantic search needs a Hugging Face token

`POST /semantic-search` embeds text with Hugging Face Inference Providers and returns 503 without `HF_TOKEN`. To enable it, create a token at huggingface.co → Settings → Access Tokens (fine-grained, "Make calls to Inference Providers") and start the service with it:

```zsh
HF_TOKEN=hf_xxx DYLD_FALLBACK_LIBRARY_PATH=... .venv/bin/python -m uvicorn main:app --port 8000
```

(or put `HF_TOKEN=...` into `ml-service/.env` and export it). Without a token the backend falls back to keyword search, so the app keeps working.

## 7. Stop it

Press `Ctrl+C` in the terminal running uvicorn, or `pkill -f "uvicorn main:app"`.

## Retraining (only if the bundle doesn't load)

Follow [TRAINING_RUNBOOK.md](TRAINING_RUNBOOK.md), replacing PowerShell paths with zsh ones (`.venv/bin/python` instead of `.venv\Scripts\python.exe`, `/` instead of `\`). A smaller dataset is enough for local work: `python data/generate_synthetic.py --rows 100000`. This was **not** needed for this setup.
