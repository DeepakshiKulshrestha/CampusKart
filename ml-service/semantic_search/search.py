"""Hosted embedding search over a bounded set of marketplace candidates."""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from huggingface_hub import InferenceClient

LOGGER = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[1]
# "local" (default): free ONNX copy of the model runs inside this service, no token or credits needed.
# "huggingface": call the paid Hugging Face Inference Providers API (needs HF_TOKEN + credits).
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "local").lower()
LOCAL_MODEL = os.getenv("LOCAL_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


@lru_cache(maxsize=1)
def _client() -> InferenceClient:
    token = os.getenv("HF_TOKEN")
    if not token:
        raise RuntimeError("HF_TOKEN is required for hosted semantic search")
    return InferenceClient(model=MODEL_NAME, provider="hf-inference", token=token, timeout=30)


@lru_cache(maxsize=1)
def _local_model():
    from fastembed import TextEmbedding
    cache = os.getenv("FASTEMBED_CACHE_PATH", str(ROOT / ".cache" / "fastembed"))
    return TextEmbedding(model_name=LOCAL_MODEL, cache_dir=cache)


def _embed_local(texts: list[str]) -> np.ndarray:
    try:
        vectors = np.asarray(list(_local_model().embed(texts)), dtype=np.float32)
    except Exception as exc:
        LOGGER.warning("Local embedding failed (%s)", type(exc).__name__)
        raise RuntimeError("Local embedding model unavailable") from exc
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / np.maximum(norms, 1e-12)


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


# The frontend keeps the service's ranking only for engine names with this prefix, hence the name.
LOCAL_ENGINE = "huggingface-inference:local-fallback-tfidf"
LOCAL_EMBEDDING_ENGINE = "huggingface-inference:local-" + LOCAL_MODEL.split("/")[-1]

# Student-marketplace vocabulary so plain-language queries reach the right listings without an embedding model.
CONCEPTS = {
    "calculator": "calculator scientific casio exam engineering", "exam": "calculator guide previous papers question",
    "boil": "kettle electric immersion rod heater water", "water": "kettle bottle flask immersion heater",
    "cook": "induction cooktop rice cooker kettle microwave", "food": "induction rice cooker microwave kettle",
    "bike": "cycle bicycle geared helmet", "bicycle": "cycle geared helmet lock", "ride": "cycle bicycle scooter helmet",
    "commute": "cycle bicycle scooter helmet", "computer": "laptop monitor keyboard mouse", "coding": "laptop keyboard monitor programming",
    "laptop": "computer notebook dell hp lenovo", "phone": "smartphone mobile iphone samsung redmi", "mobile": "smartphone phone",
    "music": "headphones earphones earbuds speaker guitar keyboard", "listen": "headphones earphones earbuds speaker",
    "sleep": "mattress bed cot bean bag", "bed": "mattress cot", "study": "table desk chair lamp bookshelf books",
    "studying": "study table desk chair lamp", "sit": "chair stool sofa bean bag seat", "sitting": "chair stool sofa seat",
    "seat": "chair stool sofa", "chair": "seat stool study", "sofa": "couch seat bean bag", "furniture": "chair table desk shelf cupboard",
    "desk": "table study chair", "read": "books novel textbook lamp", "textbook": "book books", "maths": "mathematics engineering book",
    "math": "mathematics engineering book", "cool": "cooler fan", "hot": "heater cooler fan", "summer": "cooler fan",
    "winter": "heater jacket hoodie", "bag": "backpack laptop bag suitcase", "carry": "backpack laptop bag suitcase",
    "sport": "badminton cricket football racket bat", "play": "badminton cricket football guitar chess carrom",
    "draw": "drafter drawing board sketchbook art", "drawing": "drafter board sketchbook art geometry", "write": "pen notebook diary",
    "light": "lamp study led", "charge": "power bank extension board", "storage": "hard drive pen drive cabinet box",
    "clothes": "iron jacket hoodie wardrobe", "fitness": "dumbbell yoga mat gym", "gym": "dumbbell yoga mat",
}


def _expand(query: str) -> str:
    words = [w.strip(".,!?").casefold() for w in query.split()]
    return " ".join([query] + [CONCEPTS[w] for w in words if w in CONCEPTS])


def _correct(query: str, texts: list[str]) -> str:
    """Fix misspelled query words ("kettel", "cyle") against words that actually appear in the listings."""
    from difflib import get_close_matches
    import re
    from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
    vocab = {w for t in texts for w in re.findall(r"[a-z]{4,}", t.casefold())} | set(CONCEPTS)
    fixed = []
    for word in query.split():
        bare = word.strip(".,!?").casefold()
        # Ordinary English words are never typos: without this, "while" became "wiley" (a book publisher in the listings)
        if len(bare) >= 4 and bare.isalpha() and bare not in vocab and bare not in ENGLISH_STOP_WORDS:
            match = get_close_matches(bare, vocab, n=1, cutoff=0.78)
            fixed.append(match[0] if match else word)
        else:
            fixed.append(word)
    return " ".join(fixed)


def _local_scores(query: str, texts: list[str]) -> np.ndarray:
    """Cosine similarity over word and character n-gram TF-IDF, with domain concept expansion on the query."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from scipy.sparse import hstack
    corpus = [_expand(query), *texts]
    word = TfidfVectorizer(lowercase=True, ngram_range=(1, 2), sublinear_tf=True).fit_transform(corpus)
    char = TfidfVectorizer(lowercase=True, analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True).fit_transform(corpus)
    matrix = hstack([word * 0.7, char * 0.3]).tocsr()
    norms = np.sqrt(matrix.multiply(matrix).sum(axis=1)).A1
    dots = (matrix[1:] @ matrix[0].T).toarray().ravel()
    return dots / np.maximum(norms[1:] * norms[0], 1e-12)


def warmup_encoder() -> str:
    try:
        if EMBEDDING_PROVIDER == "huggingface":
            _embed(["CampusKart semantic search startup check"])
            return f"huggingface-inference:{MODEL_NAME}"
        _embed_local(["CampusKart semantic search startup check"])
        return LOCAL_EMBEDDING_ENGINE
    except RuntimeError:
        LOGGER.warning("Embeddings unavailable at startup; semantic search will use the keyword fallback ranker")
        return LOCAL_ENGINE



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

    texts = [_text(product) for product in candidates]
    searched = _correct(query, texts)
    lexical = _local_scores(searched, texts)
    try:
        if EMBEDDING_PROVIDER == "huggingface":
            vectors = _embed([searched, *texts])
            engine = f"huggingface-inference:{MODEL_NAME}"
        else:
            vectors = _embed_local([searched, *texts])
            engine = LOCAL_EMBEDDING_ENGINE
        # Meaning does most of the work; the lexical term rescues misspellings and exact model names.
        scores = 0.65 * (vectors[1:] @ vectors[0]) + 0.35 * lexical
    except RuntimeError:
        # Embeddings unavailable (no model, no credits, outage): keep search working on keywords alone.
        scores = lexical
        engine = LOCAL_ENGINE
    ranked = sorted(zip(candidates, scores.tolist()), key=lambda pair: pair[1], reverse=True)
    if engine == LOCAL_ENGINE:
        ranked = [pair for pair in ranked if pair[1] >= 0.05]  # lexical scores near 0 mean "unrelated", not "weakly related"
    ranked = ranked[:limit]
    return {
        "query": query,
        "engine": engine,
        "results": [{**product, "similarity": round(float(score), 6)} for product, score in ranked],
    }
