#!/usr/bin/env python3
"""Validate the generated backend HTML bundle."""

from __future__ import annotations

import pathlib
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "frontend" / "Mon Coffre - Application (backend).html"

FORBIDDEN = [
    "sb_secret_",
    "service_role",
    "gho_",
    "github_pat_",
]


def main() -> int:
    if not BUNDLE.exists():
        print(f"Generated bundle is missing: {BUNDLE}")
        return 1
    text = BUNDLE.read_text(encoding="utf-8")
    if len(text) < 100_000:
        print("Generated bundle is unexpectedly small.")
        return 1
    for marker in FORBIDDEN:
        if marker in text:
            print(f"Generated bundle contains forbidden marker: {marker}")
            return 1
    if "<\\u002Fscript>" not in text:
        print("Generated bundle does not contain the expected escaped script close.")
        return 1
    print("Generated bundle validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
