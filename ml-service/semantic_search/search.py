"""Hosted embedding search over a bounded set of marketplace candidates."""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Any

import numpy as np
from huggingface_hub import InferenceClient

LOGGER = logging.getLogger(__name__)
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


@lru_cache(maxsize=1)
def _client() -> InferenceClient:
    token = os.getenv("HF_TOKEN")
    if not token:
        raise RuntimeError("HF_TOKEN is required for hosted semantic search")
    return InferenceClient(model=MODEL_NAME, provider="hf-inference", token=token, timeout=30)


def _text(product: dict[str, Any]) -> str:
    fields = ("title", "itemType", "variant", "description", "category", "brand", "condition", "location")
    return " ".join(str(product.get(field, "")) for field in fields).strip()[:3000]


def _embed(texts: list[str]) -> np.ndarray:
    try:
        result = _client().feature_extraction(texts)
    except Exception as exc:
        LOGGER.warning("Hugging Face embedding request failed (%s)", type(exc).__name__)
        raise RuntimeError("Hosted semantic search is unavailable") from exc
    vectors = np.asarray(result, dtype=np.float32)
    if vectors.ndim == 1:
        vectors = vectors.reshape(1, -1)
    if vectors.ndim != 2 or vectors.shape[0] != len(texts) or not np.isfinite(vectors).all():
        raise RuntimeError("Embedding provider returned an invalid response")
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / np.maximum(norms, 1e-12)


def warmup_encoder() -> str:
    _embed(["CampusKart semantic search startup check"])
    return f"huggingface-inference:{MODEL_NAME}"


def search_products(query: str, products: list[dict[str, Any]], filters: dict[str, Any], limit: int) -> dict[str, Any]:
    candidates = []
    for product in products:
        if filters.get("category") and product.get("category", "").casefold() != filters["category"].casefold():
            continue
        if filters.get("condition") and product.get("condition", "").casefold() != filters["condition"].casefold():
            continue
        if filters.get("location") and filters["location"].casefold() not in product.get("location", "").casefold():
            continue
        price = float(product.get("price", 0))
        if filters.get("minPrice") is not None and price < filters["minPrice"]:
            continue
        if filters.get("maxPrice") is not None and price > filters["maxPrice"]:
            continue
        candidates.append(product)

    if not candidates:
        return {"query": query, "results": [], "engine": "not-run"}

    vectors = _embed([query, *(_text(product) for product in candidates)])
    scores = vectors[1:] @ vectors[0]
    ranked = sorted(zip(candidates, scores.tolist()), key=lambda pair: pair[1], reverse=True)[:limit]
    return {
        "query": query,
        "engine": f"huggingface-inference:{MODEL_NAME}",
        "results": [{**product, "similarity": round(float(score), 6)} for product, score in ranked],
    }
