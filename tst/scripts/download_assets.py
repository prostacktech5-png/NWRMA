#!/usr/bin/env python3
"""Download all NWRMA images referenced in page JSON and news data."""
import json
import re
import time
import urllib.request
from pathlib import Path

BASE = "https://nwrma.gov.sl"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "uploads"
PAGES = ROOT / "src" / "data" / "pages"
NEWS_TS = ROOT / "src" / "data" / "news.ts"

# Always include homepage / header assets
SEED = [
    "2020/02/11.jpg",
    "2020/02/Reservoir-lake-and-dam-dredging.jpg",
    "2020/02/River-No2-Village-Beach-Sierra-Leone.jpg",
    "2020/02/nw.png",
    "2020/02/bg-1.jpg",
    "2020/02/service.jpg",
    "2020/10/2-2.png",
    "2021/03/WRP.png",
    "2021/03/Download.png",
    "2021/03/CCA.png",
    "2025/12/IMG-20251224-WA0007-150x150.jpg",
    "2026/01/580989521_1345186810951397_4152158779342178514_n-150x150.jpg",
    "2025/06/IMG_3920-150x150.jpg",
]

PATTERNS = [
    re.compile(r'/assets/uploads/([^"\'\s\)]+)'),
    re.compile(r'wp-content/uploads/([^"\'\s\)]+)'),
    re.compile(r'https?://(?:www\.)?nwrma\.gov\.sl/wp-content/uploads/([^"\'\s\)]+)'),
    re.compile(r'//nwrma\.gov\.sl/+assets/uploads/([^"\'\s\)]+)'),
    re.compile(r'//nwrma\.gov\.sl/+wp-content/uploads/([^"\'\s\)]+)'),
]


def normalize_path(raw: str) -> str | None:
    path = raw.split("?")[0].strip().rstrip("]'\">")
    if not path or path.endswith((".php", ".html", ".js")):
        return None
    # Skip malformed paths from broken HTML parsing
    if any(c in path for c in '<>[]|*?"'):
        return None
    if len(path) > 200:
        return None
    return path


def collect_from_text(text: str) -> set[str]:
    found: set[str] = set()
    for pat in PATTERNS:
        for m in pat.finditer(text):
            p = normalize_path(m.group(1))
            if p:
                found.add(p)
    return found


def collect_all() -> set[str]:
    paths = set(SEED)
    if PAGES.exists():
        for f in PAGES.glob("*.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                html = data.get("html", "") if isinstance(data, dict) else ""
                paths |= collect_from_text(html)
            except Exception:
                paths |= collect_from_text(f.read_text(encoding="utf-8", errors="replace"))
    if NEWS_TS.exists():
        paths |= collect_from_text(NEWS_TS.read_text(encoding="utf-8", errors="replace"))
    crawl = ROOT / "scripts" / "crawl-output" / "html"
    if crawl.exists():
        for f in crawl.glob("*.html"):
            paths |= collect_from_text(f.read_text(encoding="utf-8", errors="replace"))
    return paths


def download(rel: str) -> bool:
    dest = OUT / rel
    if dest.exists() and dest.stat().st_size > 50:
        return True
    url = f"{BASE}/wp-content/uploads/{rel}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "NWRMA-Migration/1.0"})
        with urllib.request.urlopen(req, timeout=45) as r:
            data = r.read()
        if len(data) < 50:
            return False
        dest.write_bytes(data)
        return True
    except Exception as e:
        try:
            print(f"  FAIL {rel}: {e}")
        except UnicodeEncodeError:
            print("  FAIL (path encoding error)")
        return False


def main():
    paths = sorted(collect_all())
    print(f"Found {len(paths)} unique asset paths")
    ok = fail = 0
    for i, rel in enumerate(paths, 1):
        if download(rel):
            ok += 1
            if i % 25 == 0:
                print(f"  {i}/{len(paths)} downloaded...")
        else:
            fail += 1
        time.sleep(0.12)
    print(f"Done: {ok} ok, {fail} failed -> {OUT}")


if __name__ == "__main__":
    main()
