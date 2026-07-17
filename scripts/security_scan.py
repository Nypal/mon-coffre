#!/usr/bin/env python3
"""Fail the build when high-confidence secrets or production-only markers leak."""

from __future__ import annotations

import hashlib
import pathlib
import re
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]

SKIP_DIRS = {
    ".git",
    "__pycache__",
    "node_modules",
    ".wrangler",
    "dist",
}

# SHA-256 hashes of known project/test markers that must not be committed.
# The plaintext values are intentionally not stored in this public repository.
KNOWN_FORBIDDEN_TOKEN_HASHES = {
    "d690864cd0673c32217c8050865e73d5e3c4e3893f01e0c18241555d517f6c4c",
    "2d53bdd78d852eb90239aa807a506ed33f4ecc4063a388b06016d388f3ae4a49",
    "162b6580764a6d8b63b94add4bd224fab1fb3aaedbd96d9de1bb9a022c54f960",
    "daeb34f486131d0d45ba33f5ea85e8bfbed18b71ebc858a133c434ac034f9758",
    "20910ffd4da3143fb4c1aa0b72cc7317c56bd895928ddf591a80cce215a1bf45",
    "5f5fbd029b88a003822da32d539ed861e8207750b418d79b20d522af8a1db582",
}

SECRET_PATTERNS = [
    re.compile(r"gho_[A-Za-z0-9_]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"sb_secret_[A-Za-z0-9_-]{8,}"),
    re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}"),
    re.compile(r"(?i)(service_role|secret|token|password)\s*[:=]\s*['\"][^'\"]{8,}['\"]"),
]


def iter_files() -> list[pathlib.Path]:
    files: list[pathlib.Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts):
            continue
        files.append(path)
    return files


def read_text(path: pathlib.Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return None


def token_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def token_candidates(text: str) -> set[str]:
    tokens = set(re.findall(r"[A-Za-z0-9_@.\-]+", text))
    for token in list(tokens):
        if token.endswith(".supabase.co"):
            tokens.add(token[: -len(".supabase.co")])
    return tokens


def main() -> int:
    findings: list[str] = []
    for path in iter_files():
        text = read_text(path)
        if text is None:
            continue
        rel = path.relative_to(ROOT).as_posix()
        for token in token_candidates(text):
            if token_hash(token) in KNOWN_FORBIDDEN_TOKEN_HASHES:
                findings.append(f"{rel}: known forbidden token hash matched")
        for pattern in SECRET_PATTERNS:
            for match in pattern.finditer(text):
                snippet = match.group(0)[:36]
                findings.append(f"{rel}: secret-like pattern {snippet!r}")

    if findings:
        print("Security scan failed:")
        for item in findings:
            print(f"- {item}")
        return 1

    print("Security scan passed: no high-confidence secrets found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
