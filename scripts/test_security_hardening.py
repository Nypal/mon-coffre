#!/usr/bin/env python3
"""Verify production security hardening stays in place."""

from __future__ import annotations

import json
import pathlib
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]

LOGIC = ROOT / "frontend" / "mc_logic.js"
WORKER_BUILDER = ROOT / "scripts" / "build_cloudflare_worker.py"
WRANGLER = ROOT / "cloudflare" / "wrangler.toml"
GENERATED_WORKER = ROOT / "cloudflare" / "dist" / "server" / "index.js"

SUPABASE_SDK_URL = (
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.7/"
    "dist/umd/supabase.min.js"
)
SUPABASE_SDK_INTEGRITY = (
    "sha384-BmlQlKlDvXvKoxkn5OQuUo/aJQCTXeB+Kls6EccBmG4Kf8AXvp89RtO9MtPxP/r5"
)


def read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def require(condition: bool, message: str, findings: list[str]) -> None:
    if not condition:
        findings.append(message)


def main() -> int:
    findings: list[str] = []
    logic = read(LOGIC)
    builder = read(WORKER_BUILDER)
    wrangler = read(WRANGLER)
    generated = read(GENERATED_WORKER) if GENERATED_WORKER.exists() else ""

    require('workers_dev = false' in wrangler, "workers.dev must be disabled", findings)
    require('workers_dev = true' not in wrangler, "workers.dev is still enabled", findings)

    for marker in [
        "content-security-policy",
        "strict-transport-security",
        "x-frame-options",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "object-src 'none'",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    ]:
        require(marker in builder, f"missing Worker security marker: {marker}", findings)

    if generated:
        for marker in [
            "content-security-policy",
            "strict-transport-security",
            "x-frame-options",
            "frame-ancestors 'none'",
        ]:
            require(marker in generated, f"generated Worker missing marker: {marker}", findings)

    require(SUPABASE_SDK_URL in logic, "Supabase SDK URL must be pinned", findings)
    require(SUPABASE_SDK_INTEGRITY in logic, "Supabase SDK SRI must be pinned", findings)
    require('s.integrity=self.SUPABASE_SDK_INTEGRITY' in logic, "SDK integrity must be applied", findings)
    require('s.crossOrigin="anonymous"' in logic, "SDK crossorigin must be anonymous", findings)
    require(
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";' not in logic,
        "mutable Supabase SDK @2 URL must not be used",
        findings,
    )
    require("_safeImageUrl" in logic, "planned purchase images must be URL-filtered", findings)
    require('referrerpolicy="no-referrer"' in logic, "planned purchase images need no-referrer", findings)

    if findings:
        print(json.dumps({"ok": False, "findings": findings}, indent=2))
        return 1

    print(
        json.dumps(
            {
                "ok": True,
                "checks": [
                    "workers_dev disabled",
                    "Worker security headers configured",
                    "Supabase SDK pinned with SRI",
                    "planned purchase image URLs filtered",
                ],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
