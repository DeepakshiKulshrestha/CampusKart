"""Package active price/fraud models for private artifact storage or deployment."""

from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_ROOT = ROOT / "model_artifacts"
REQUIRED = [
    "price/current/model.joblib", "price/current/metrics.json", "price/current/MODEL_CARD.md",
    "fraud/current/model.joblib", "fraud/current/metrics.json", "fraud/current/MODEL_CARD.md",
]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def package(model_root: Path, output: Path) -> Path:
    missing = [rel for rel in REQUIRED if not (model_root / rel).is_file()]
    if missing:
        raise FileNotFoundError("Train both models first; missing: " + ", ".join(missing))
    manifest = {"format": "campuskart-model-bundle-v1", "files": {rel: sha256_file(model_root / rel) for rel in REQUIRED}}
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        archive.writestr("bundle-manifest.json", json.dumps(manifest, indent=2))
        for relative in REQUIRED:
            archive.write(model_root / relative, arcname=relative)
    print(f"Bundle: {output}")
    print(f"Bytes: {output.stat().st_size:,}")
    print(f"SHA-256: {sha256_file(output)}")
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-root", type=Path, default=DEFAULT_MODEL_ROOT)
    parser.add_argument("--output", type=Path, default=ROOT / "model_artifacts" / "campuskart-model-bundle.zip")
    args = parser.parse_args()
    package(args.model_root, args.output)
