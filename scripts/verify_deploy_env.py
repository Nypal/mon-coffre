#!/usr/bin/env python3
"""Ensure deployment-only environment variables exist before deploying."""

from __future__ import annotations

import os
import sys


REQUIRED = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
]


def main() -> int:
    missing = [name for name in REQUIRED if not os.environ.get(name)]
    if missing:
        print("Deployment is blocked because required GitHub Secrets are missing:")
        for name in missing:
            print(f"- {name}")
        return 1
    print("Deployment environment OK. Secret values were not printed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

