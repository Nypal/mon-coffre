#!/usr/bin/env python3
"""Build a minimal Cloudflare Worker from the generated HTML bundle."""

from __future__ import annotations

import json
import pathlib
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "frontend" / "Mon Coffre - Application (backend).html"
OUT = ROOT / "cloudflare" / "dist" / "server" / "index.js"

CSP = (
    "default-src 'none'; "
    "base-uri 'none'; "
    "object-src 'none'; "
    "frame-src 'none'; "
    "frame-ancestors 'none'; "
    "form-action 'none'; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob: https:; "
    "font-src 'self' data:; "
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co; "
    "worker-src 'none'; "
    "manifest-src 'none'; "
    "upgrade-insecure-requests"
)

SECURITY_HEADERS = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "content-security-policy": CSP,
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "geolocation=(), microphone=(), camera=(), payment=()",
    "cross-origin-opener-policy": "same-origin",
}


def main() -> int:
    if not BUNDLE.exists():
        print("Run frontend/build_mc.py before packaging Cloudflare Worker.")
        return 1
    html = BUNDLE.read_text(encoding="utf-8")
    headers = json.dumps(SECURITY_HEADERS, ensure_ascii=False, indent=6)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    worker = f"""const INDEX_HTML = {json.dumps(html, ensure_ascii=False)};
const SECURITY_HEADERS = {headers};

export default {{
  async fetch(request) {{
    if (request.method !== "GET" && request.method !== "HEAD") {{
      return new Response("Method Not Allowed", {{ status: 405 }});
    }}

    return new Response(request.method === "HEAD" ? null : INDEX_HTML, {{
      headers: SECURITY_HEADERS
    }});
  }}
}};
"""
    OUT.write_text(worker, encoding="utf-8")
    print(f"Cloudflare Worker built: {OUT.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

