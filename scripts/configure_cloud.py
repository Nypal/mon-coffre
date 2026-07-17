#!/usr/bin/env python3
"""Patch MC_CLOUD in the CI workspace without committing production config."""

from __future__ import annotations

import argparse
import pathlib
import re
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
LOGIC_FILE = ROOT / "frontend" / "mc_logic.js"

MC_CLOUD_RE = re.compile(
    r'MC_CLOUD\s*=\s*\{\s*enabled\s*:\s*(true|false)\s*,\s*url\s*:\s*"[^"]*"\s*,\s*anonKey\s*:\s*"[^"]*"\s*\}\s*;'
)


def validate_public_config(url: str, key: str) -> list[str]:
    errors: list[str] = []
    if not url.startswith("https://") or not url.endswith(".supabase.co"):
        errors.append("SUPABASE_URL must look like https://project-ref.supabase.co")
    if any(ch.isspace() for ch in url):
        errors.append("SUPABASE_URL must not contain whitespace")
    if not key.startswith("sb_publishable_"):
        errors.append("SUPABASE_PUBLISHABLE_KEY must start with sb_publishable_")
    lowered = key.lower()
    for forbidden in ("service_role", "sb_secret_", "secret"):
        if forbidden in lowered:
            errors.append(f"forbidden key marker detected: {forbidden}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--enable", action="store_true")
    parser.add_argument("--url", default="")
    parser.add_argument("--key", default="")
    args = parser.parse_args()

    text = LOGIC_FILE.read_text(encoding="utf-8")
    if not MC_CLOUD_RE.search(text):
        print("MC_CLOUD assignment not found.")
        return 1

    if args.enable:
        errors = validate_public_config(args.url, args.key)
        if errors:
            print("Invalid public Supabase config:")
            for error in errors:
                print(f"- {error}")
            return 1
        replacement = (
            f'MC_CLOUD = {{ enabled:true, url:"{args.url}", '
            f'anonKey:"{args.key}" }};'
        )
    else:
        replacement = (
            'MC_CLOUD = { enabled:false, url:"https://your-project.supabase.co", '
            'anonKey:"sb_publishable_your_public_key" };'
        )

    LOGIC_FILE.write_text(MC_CLOUD_RE.sub(replacement, text, count=1), encoding="utf-8")
    print("MC_CLOUD patched for CI workspace.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

