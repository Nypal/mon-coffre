#!/usr/bin/env python3
"""Build a minimal Cloudflare Worker from the generated HTML bundle."""

from __future__ import annotations

import base64
import json
import pathlib
import struct
import sys
import zlib


ROOT = pathlib.Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "frontend" / "Mon Coffre - Application (backend).html"
OUT = ROOT / "cloudflare" / "dist" / "server" / "index.js"

APP_NAME = "Mon Coffre"
THEME_COLOR = "#1e5081"
BACKGROUND_COLOR = "#f4f7f3"

CSP = (
    "default-src 'none'; "
    "base-uri 'none'; "
    "object-src 'none'; "
    "frame-src 'none'; "
    "frame-ancestors 'none'; "
    "form-action 'none'; "
    # The locked design bundle rehydrates compressed JS/font assets as object URLs
    # and evaluates the injected DCLogic class through the generated runtime.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://unpkg.com; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob: https:; "
    "font-src 'self' data: blob:; "
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co; "
    "worker-src 'self'; "
    "manifest-src 'self'; "
    "upgrade-insecure-requests"
)

SECURITY_HEADERS = {
    "content-security-policy": CSP,
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "geolocation=(), microphone=(), camera=(), payment=()",
    "cross-origin-opener-policy": "same-origin",
}

HTML_HEADERS = {
    **SECURITY_HEADERS,
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
}

PWA_HEAD = f"""
<meta name="application-name" content="{APP_NAME}">
<meta name="apple-mobile-web-app-title" content="{APP_NAME}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="{THEME_COLOR}">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
""".strip()

PWA_BOOT = """
<script>
(() => {
  const tags = [
    ["meta", "meta[name='application-name']", { name: "application-name", content: "Mon Coffre" }],
    ["meta", "meta[name='apple-mobile-web-app-title']", { name: "apple-mobile-web-app-title", content: "Mon Coffre" }],
    ["meta", "meta[name='apple-mobile-web-app-capable']", { name: "apple-mobile-web-app-capable", content: "yes" }],
    ["meta", "meta[name='mobile-web-app-capable']", { name: "mobile-web-app-capable", content: "yes" }],
    ["meta", "meta[name='apple-mobile-web-app-status-bar-style']", { name: "apple-mobile-web-app-status-bar-style", content: "default" }],
    ["meta", "meta[name='theme-color']", { name: "theme-color", content: "#1e5081" }],
    ["link", "link[rel='manifest']", { rel: "manifest", href: "/manifest.webmanifest" }],
    ["link", "link[rel='icon'][sizes='192x192']", { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" }],
    ["link", "link[rel='apple-touch-icon']", { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }]
  ];
  function ensurePwaMetadata() {
    const head = document.head || document.documentElement.appendChild(document.createElement("head"));
    tags.forEach(([tag, selector, attrs]) => {
      if (head.querySelector(selector)) return;
      const element = document.createElement(tag);
      Object.keys(attrs).forEach((name) => element.setAttribute(name, attrs[name]));
      head.appendChild(element);
    });
  }
  ensurePwaMetadata();
  window.addEventListener("load", () => {
    ensurePwaMetadata();
    setTimeout(ensurePwaMetadata, 250);
    setTimeout(ensurePwaMetadata, 1000);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  });
})();
</script>
""".strip()

MANIFEST = {
    "name": APP_NAME,
    "short_name": APP_NAME,
    "description": "Votre espace financier personnel.",
    "lang": "fr",
    "start_url": "/",
    "scope": "/",
    "display": "standalone",
    "orientation": "portrait",
    "theme_color": THEME_COLOR,
    "background_color": BACKGROUND_COLOR,
    "categories": ["finance", "productivity"],
    "icons": [
        {
            "src": "/icons/icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable",
        },
        {
            "src": "/icons/icon-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable",
        },
    ],
}

SERVICE_WORKER = """
const CACHE_NAME = "mon-coffre-pwa-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
""".strip()


def _mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def _inside_round_rect(
    x: float,
    y: float,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    radius: float,
) -> bool:
    if x1 + radius <= x <= x2 - radius and y1 <= y <= y2:
        return True
    if x1 <= x <= x2 and y1 + radius <= y <= y2 - radius:
        return True
    for cx, cy in (
        (x1 + radius, y1 + radius),
        (x2 - radius, y1 + radius),
        (x1 + radius, y2 - radius),
        (x2 - radius, y2 - radius),
    ):
        if (x - cx) ** 2 + (y - cy) ** 2 <= radius**2:
            return True
    return False


def _distance_to_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    dx = bx - ax
    dy = by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    sx = ax + t * dx
    sy = ay + t * dy
    return ((px - sx) ** 2 + (py - sy) ** 2) ** 0.5


def _blend_pixel(pixels: bytearray, index: int, color: tuple[int, int, int], alpha: float) -> None:
    inv = 1.0 - alpha
    pixels[index] = round(pixels[index] * inv + color[0] * alpha)
    pixels[index + 1] = round(pixels[index + 1] * inv + color[1] * alpha)
    pixels[index + 2] = round(pixels[index + 2] * inv + color[2] * alpha)
    pixels[index + 3] = 255


def _png_chunk(kind: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + kind
        + data
        + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    )


def _encode_png_rgba(width: int, height: int, pixels: bytes) -> bytes:
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw.extend(pixels[y * stride : (y + 1) * stride])
    return (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + _png_chunk(b"IDAT", zlib.compress(bytes(raw), level=9))
        + _png_chunk(b"IEND", b"")
    )


def _make_icon_png(size: int) -> bytes:
    scale = 4
    n = size * scale
    pixels = bytearray(n * n * 4)
    bg_a = (30, 80, 129)
    bg_b = (10, 39, 66)
    green = (111, 178, 121)
    white = (248, 251, 249)
    navy = (20, 54, 88)

    for y in range(n):
        for x in range(n):
            t = (x + y) / max(1, 2 * (n - 1))
            r, g, b = _mix(bg_a, bg_b, t)
            idx = (y * n + x) * 4
            pixels[idx : idx + 4] = bytes((r, g, b, 255))

    card = (0.22 * n, 0.22 * n, 0.78 * n, 0.78 * n)
    card_radius = 0.14 * n
    shadow = (card[0] + 0.025 * n, card[1] + 0.04 * n, card[2] + 0.025 * n, card[3] + 0.04 * n)
    shadow_radius = card_radius

    for y in range(n):
        py = y + 0.5
        for x in range(n):
            px = x + 0.5
            idx = (y * n + x) * 4
            if _inside_round_rect(px, py, *shadow, shadow_radius):
                _blend_pixel(pixels, idx, (4, 16, 28), 0.22)
            if _inside_round_rect(px, py, *card, card_radius):
                _blend_pixel(pixels, idx, white, 0.96)

    cx = 0.50 * n
    cy = 0.49 * n
    ring_radius = 0.17 * n
    ring_width = 0.038 * n
    check_width = 0.052 * n
    p1 = (0.39 * n, 0.52 * n)
    p2 = (0.47 * n, 0.60 * n)
    p3 = (0.63 * n, 0.41 * n)

    for y in range(n):
        py = y + 0.5
        for x in range(n):
            px = x + 0.5
            idx = (y * n + x) * 4
            dist = ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5
            if abs(dist - ring_radius) <= ring_width / 2:
                _blend_pixel(pixels, idx, navy, 0.95)
            if (
                _distance_to_segment(px, py, *p1, *p2) <= check_width / 2
                or _distance_to_segment(px, py, *p2, *p3) <= check_width / 2
            ):
                _blend_pixel(pixels, idx, green, 1.0)

    small = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            total = [0, 0, 0, 0]
            for sy in range(scale):
                for sx in range(scale):
                    source = ((y * scale + sy) * n + (x * scale + sx)) * 4
                    total[0] += pixels[source]
                    total[1] += pixels[source + 1]
                    total[2] += pixels[source + 2]
                    total[3] += pixels[source + 3]
            target = (y * size + x) * 4
            small[target : target + 4] = bytes(round(channel / (scale * scale)) for channel in total)

    return _encode_png_rgba(size, size, bytes(small))


def _insert_before(html: str, closing_tag: str, payload: str) -> str:
    index = html.lower().rfind(closing_tag)
    if index == -1:
        raise ValueError(f"Missing {closing_tag} in generated bundle")
    return html[:index] + payload + "\n" + html[index:]


def _with_pwa_metadata(html: str) -> str:
    if "/manifest.webmanifest" not in html:
        html = _insert_before(html, "</head>", PWA_HEAD)
    if "/sw.js" not in html:
        html = _insert_before(html, "</body>", PWA_BOOT)
    return html


def _build_icon_map() -> dict[str, str]:
    icons = {
        "/apple-touch-icon.png": _make_icon_png(180),
        "/icons/icon-192.png": _make_icon_png(192),
        "/icons/icon-512.png": _make_icon_png(512),
        "/favicon.ico": _make_icon_png(192),
    }
    return {path: base64.b64encode(data).decode("ascii") for path, data in icons.items()}


def main() -> int:
    if not BUNDLE.exists():
        print("Run frontend/build_mc.py before packaging Cloudflare Worker.")
        return 1
    html = _with_pwa_metadata(BUNDLE.read_text(encoding="utf-8"))
    security_headers = json.dumps(SECURITY_HEADERS, ensure_ascii=False, indent=6)
    html_headers = json.dumps(HTML_HEADERS, ensure_ascii=False, indent=6)
    manifest = json.dumps(MANIFEST, ensure_ascii=False, separators=(",", ":"))
    icon_map = json.dumps(_build_icon_map(), ensure_ascii=False, indent=2)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    worker = f"""const INDEX_HTML = {json.dumps(html, ensure_ascii=False)};
const MANIFEST_JSON = {json.dumps(manifest, ensure_ascii=False)};
const SERVICE_WORKER = {json.dumps(SERVICE_WORKER, ensure_ascii=False)};
const ICONS = {icon_map};
const SECURITY_HEADERS = {security_headers};
const HTML_HEADERS = {html_headers};

function withHeaders(extra) {{
  return {{ ...SECURITY_HEADERS, ...extra }};
}}

function bytesFromBase64(value) {{
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}}

export default {{
  async fetch(request) {{
    if (request.method !== "GET" && request.method !== "HEAD") {{
      return new Response("Method Not Allowed", {{ status: 405, headers: SECURITY_HEADERS }});
    }}

    const url = new URL(request.url);

    if (url.pathname === "/manifest.webmanifest" || url.pathname === "/manifest.json") {{
      return new Response(request.method === "HEAD" ? null : MANIFEST_JSON, {{
        headers: withHeaders({{
          "content-type": "application/manifest+json; charset=utf-8",
          "cache-control": "no-store"
        }})
      }});
    }}

    if (url.pathname === "/sw.js") {{
      return new Response(request.method === "HEAD" ? null : SERVICE_WORKER, {{
        headers: withHeaders({{
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "no-store",
          "service-worker-allowed": "/"
        }})
      }});
    }}

    const icon = ICONS[url.pathname];
    if (icon) {{
      return new Response(request.method === "HEAD" ? null : bytesFromBase64(icon), {{
        headers: withHeaders({{
          "content-type": "image/png",
          "cache-control": "public, max-age=86400"
        }})
      }});
    }}

    return new Response(request.method === "HEAD" ? null : INDEX_HTML, {{
      headers: HTML_HEADERS
    }});
  }}
}};
"""
    OUT.write_text(worker, encoding="utf-8")
    print(f"Cloudflare Worker built: {OUT.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

