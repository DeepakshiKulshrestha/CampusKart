"""Restore and verify a private model bundle during a production service start."""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse

REQUIRED = [
    "price/current/model.joblib", "price/current/metrics.json", "price/current/MODEL_CARD.md",
    "fraud/current/model.joblib", "fraud/current/metrics.json", "fraud/current/MODEL_CARD.md",
]
MAX_BUNDLE_BYTES = 500_000_000
MAX_EXPANDED_BUNDLE_BYTES = 500_000_000


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def restore_if_needed() -> None:
    root = Path(os.getenv("MODEL_STORAGE_ROOT", Path(__file__).resolve().parents[1] / "model_artifacts"))
    price_path = Path(os.getenv("PRICE_MODEL_PATH", root / "price" / "current" / "model.joblib"))
    fraud_path = Path(os.getenv("FRAUD_MODEL_PATH", root / "fraud" / "current" / "model.joblib"))
    if price_path.is_file() and fraud_path.is_file():
        return
    url = os.getenv("MODEL_ARTIFACT_BUNDLE_URL", "")
    if not url:
        raise RuntimeError(f"Model files are missing under {root}; train locally and set MODEL_ARTIFACT_BUNDLE_URL to a private HTTPS bundle.")
    if urlparse(url).scheme.lower() != "https":
        raise RuntimeError("MODEL_ARTIFACT_BUNDLE_URL must use HTTPS")
    root.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": "CampusKart-ML-artifact-loader/1"}
    token = os.getenv("MODEL_ARTIFACT_BUNDLE_TOKEN", "")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    with tempfile.NamedTemporaryFile(dir=root, suffix=".zip", delete=False) as temp:
        temp_path = Path(temp.name)
    try:
        total = 0
        with urllib.request.urlopen(request, timeout=90) as response, temp_path.open("wb") as target:
            if urlparse(response.geturl()).scheme.lower() != "https":
                raise RuntimeError("Model bundle download redirected away from HTTPS")
            while True:
                block = response.read(1024 * 1024)
                if not block:
                    break
                total += len(block)
                if total > MAX_BUNDLE_BYTES:
                    raise RuntimeError("Model bundle exceeds the 500 MB safety limit")
                target.write(block)
        _extract_verified(temp_path, root)
    finally:
        temp_path.unlink(missing_ok=True)


def _extract_verified(bundle_path: Path, root: Path) -> None:
    with zipfile.ZipFile(bundle_path) as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if len(names) > 1000 or len(names) != len(set(names)):
            raise RuntimeError("Model bundle has too many entries or duplicate paths")
        if sum(info.file_size for info in infos) > MAX_EXPANDED_BUNDLE_BYTES:
            raise RuntimeError("Expanded model bundle exceeds the 500 MB safety limit")
        for name in names:
            item = PurePosixPath(name)
            if item.is_absolute() or ".." in item.parts or name.startswith(("/", "\\")):
                raise RuntimeError("Unsafe path found in model bundle")
        if "bundle-manifest.json" not in names:
            raise RuntimeError("Model bundle has no checksum manifest")
        if archive.getinfo("bundle-manifest.json").file_size > 1_000_000:
            raise RuntimeError("Model bundle manifest is too large")
        manifest = json.loads(archive.read("bundle-manifest.json"))
        if manifest.get("format") != "campuskart-model-bundle-v1":
            raise RuntimeError("Unsupported model bundle format")
        checksums = manifest.get("files", {})
        if any(name not in names or name not in checksums for name in REQUIRED):
            raise RuntimeError("Model bundle is incomplete")
        for name in REQUIRED:
            actual = hashlib.sha256(archive.read(name)).hexdigest()
            if actual != checksums[name]:
                raise RuntimeError(f"Checksum mismatch in model bundle entry: {name}")
        for name in REQUIRED:
            destination = root.joinpath(*PurePosixPath(name).parts)
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = destination.with_suffix(destination.suffix + ".tmp")
            temporary.write_bytes(archive.read(name))
            temporary.replace(destination)
