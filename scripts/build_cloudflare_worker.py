#!/usr/bin/env python3
"""Build a minimal Cloudflare Worker from the generated HTML bundle."""

from __future__ import annotations

import json
import pathlib
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "frontend" / "Mon Coffre - Application (backend).html"
OUT = ROOT / "cloudflare" / "dist" / "server" / "index.js"


def main() -> int:
    if not BUNDLE.exists():
        print("Run frontend/build_mc.py before packaging Cloudflare Worker.")
        return 1
    html = BUNDLE.read_text(encoding="utf-8")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    worker = f"""const INDEX_HTML = {json.dumps(html, ensure_ascii=False)};

export default {{
  async fetch(request) {{
    if (request.method !== "GET" && request.method !== "HEAD") {{
      return new Response("Method Not Allowed", {{ status: 405 }});
    }}

    const url = new URL(request.url);
    if (url.pathname === "/favicon.ico") {{
      return new Response(null, {{
        status: 204,
        headers: {{
          "cache-control": "public, max-age=86400",
          "x-content-type-options": "nosniff"
        }}
      }});
    }}

    return new Response(request.method === "HEAD" ? null : INDEX_HTML, {{
      headers: {{
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        "permissions-policy": "geolocation=(), microphone=()"
      }}
    }});
  }}
}};
"""
    OUT.write_text(worker, encoding="utf-8")
    print(f"Cloudflare Worker built: {OUT.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

