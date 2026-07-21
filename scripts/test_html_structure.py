#!/usr/bin/env python3
"""Verify the HTML served by the Cloudflare Worker has a valid document structure."""

from __future__ import annotations

import re
import sys

from build_cloudflare_worker import APP_LANG, BUNDLE, _with_pwa_metadata


def require(condition: bool, message: str, findings: list[str]) -> None:
    if not condition:
        findings.append(message)


def main() -> int:
    findings: list[str] = []
    html = _with_pwa_metadata(BUNDLE.read_text(encoding="utf-8"))

    html_open = re.search(r"<html\b([^>]*)>", html, flags=re.IGNORECASE)
    require(html_open is not None, "missing html element", findings)
    require(
        bool(html_open and re.search(rf'\blang=["\']{re.escape(APP_LANG)}["\']', html_open.group(1), flags=re.IGNORECASE)),
        f'html element must declare lang="{APP_LANG}"',
        findings,
    )

    head_match = re.search(r"<head\b[^>]*>(.*?)</head\s*>", html, flags=re.IGNORECASE | re.DOTALL)
    body_match = re.search(r"<body\b[^>]*>(.*?)</body\s*>", html, flags=re.IGNORECASE | re.DOTALL)
    require(head_match is not None, "missing head element", findings)
    require(body_match is not None, "missing body element", findings)

    head = head_match.group(1) if head_match else ""
    body = body_match.group(1) if body_match else ""
    head_noscripts = re.findall(
        r"<noscript\b[^>]*>(.*?)</noscript\s*>",
        head,
        flags=re.IGNORECASE | re.DOTALL,
    )
    for content in head_noscripts:
        require("<div" not in content.lower(), "head noscript must not contain div elements", findings)

    for marker in [
        '<meta name="application-name"',
        '<meta name="theme-color"',
        '<link rel="manifest"',
        '<link rel="icon"',
        '<link rel="apple-touch-icon"',
    ]:
        require(marker in head, f"PWA metadata must remain in head: {marker}", findings)

    require(
        "This page requires JavaScript to display." in body,
        "the visual no-JavaScript message must be in body",
        findings,
    )

    if findings:
        print("HTML structure validation failed:")
        for finding in findings:
            print(f"- {finding}")
        return 1

    print("HTML structure validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
