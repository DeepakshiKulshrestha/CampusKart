# Security and deployment review

## Scope

Static source/configuration review only. The service, dependency installation, and deployment configuration were not run or tested. This document is not a penetration test, vulnerability scan, or production approval.

## Controls currently in the code

- Production requires `ML_API_KEY`; middleware uses constant-time comparison and protects routes other than `GET /health`.
- Interactive API docs are disabled when `APP_ENV=production`.
- Pydantic models bound request fields and list sizes and reject non-finite numeric values.
- Search sends at most 250 candidate records to the hosted embedding API per request; it does not maintain a local index.
- Training run IDs are constrained to safe filename characters.
- Model bundle restore requires HTTPS, limits download/expanded archive size, rejects duplicate/traversal paths, checks the expected artifact set, and verifies checksums.
- Risk scores are documented as review signals, not verified probabilities or automatic moderation decisions.
- Development startup binds to loopback when running `python main.py`; the Docker command listens on all container interfaces.

## Remaining work before production

1. **Network and identity:** keep this API behind the Node backend/private network with TLS. The shared key is service authentication, not user authentication or per-user authorization. Store and rotate it in the hosting secret manager.
2. **Abuse controls:** enforce request body limits, rate limits, and concurrency/timeouts at the trusted proxy or host. Input schema bounds do not replace those controls.
3. **Secrets and external inference:** keep `HF_TOKEN` server-side. Semantic search sends query and candidate product text to Hugging Face Inference Providers; exclude private student data. Provider access, quotas, latency, and charges affect availability. Pin/review a model revision where supported.
4. **Artifact trust:** checksums detect corruption but the ZIP manifest is not a signature. Use access-controlled storage and trusted artifacts only; `joblib.load` may execute code.
5. **Model validity:** synthetic training data is not evidence of real sale-price or fraud performance. Evaluate price outputs on time-separated completed sales and risk signals against admin-reviewed outcomes. Monitor quality and drift; do not make consequential decisions from the current models.
6. **Operations and supply chain:** requirements use version ranges; no lockfile, vulnerability scan, demonstrated load test, audit trail, metrics/alerts, rollback drill, or disaster-recovery exercise is included. The Docker image runs as root. Lock and scan dependencies, use a non-root image user, set permissions, and establish monitoring and ownership before deployment.
7. **Search quality:** a successful hosted request proves connectivity only. Evaluate with an expected-results query set and representative product candidates. The Node backend must own candidate retrieval/filtering and call this service with a bounded list.

## Manual verification plan

1. Follow [TRAINING_RUNBOOK.md](TRAINING_RUNBOOK.md) to install dependencies and train the price and risk models yourself.
2. Start the development API and use `/docs` to check health, metrics, pricing, fairness, search, and risk endpoints.
3. For semantic search, set `HF_TOKEN`, submit candidate listings, and confirm the response engine begins with `huggingface-inference:`. Try expected-results queries and inspect rank order. A request succeeding is not a relevance evaluation.
4. In a separate controlled production-like environment, verify `/health` works, protected routes reject missing/incorrect keys and accept the correct key, and docs are unavailable. Use only dummy secrets.
5. Run dependency, container, load, and deployment checks in the intended hosting environment before exposing traffic.

Do not describe this service as production-ready until the remaining controls and validations are completed.
