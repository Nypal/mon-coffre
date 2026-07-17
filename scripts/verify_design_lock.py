#!/usr/bin/env python3
"""Verify that the locked design source has not changed accidentally."""

from __future__ import annotations

import hashlib
import pathlib
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
LOCK_FILE = ROOT / "frontend" / "design-lock.sha256"
DESIGN_FILE = ROOT / "frontend" / "Mon Coffre - Application.html"


def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest().upper()


def main() -> int:
    expected = LOCK_FILE.read_text(encoding="utf-8").split()[0].upper()
    actual = sha256(DESIGN_FILE)
    if actual != expected:
        print("Locked design hash mismatch.")
        print(f"expected={expected}")
        print(f"actual={actual}")
        return 1
    print(f"Locked design hash OK: {actual}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

