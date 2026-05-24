#!/usr/bin/env python3
"""Crawl nwrma.gov.sl pages and assets for React migration."""
import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

BASE = "https://nwrma.gov.sl"
ROOT = Path(__file__).resolve().parent.parent
HTML_DIR = ROOT / "scripts" / "crawl-output" / "html"
ASSETS_DIR = ROOT / "public" / "assets"
SITE_MAP_PATH = ROOT / "src" / "data" / "site-map.json"

USER_AGENT = "NWRMA-Migration-Bot/1.0"
DELAY = 0.35
MAX_PAGES = 500


def fetch(url: str, timeout=60) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except Exception as e:
        print(f"  FAIL {url}: {e}")
        return None


def normalize_path(url: str) -> str | None:
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc and parsed.netloc not in ("nwrma.gov.sl", "www.nwrma.gov.sl"):
        return None
    path = parsed.path or "/"
    if path != "/":
        path = path.rstrip("/") + "/"
    skip_ext = (
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf", ".css", ".js",
        ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".zip", ".xml",
    )
    if any(path.lower().endswith(ext) for ext in skip_ext):
        return None
    if "/wp-admin" in path or "/wp-json" in path or "/feed" in path or "xmlrpc" in path:
        return None
    return path


def collect_sitemap_urls() -> set[str]:
    urls: set[str] = {"/"}
    for sm_url in (
        f"{BASE}/wp-sitemap.xml",
        f"{BASE}/sitemap.xml",
        f"{BASE}/wp-sitemap-posts-post-1.xml",
        f"{BASE}/wp-sitemap-posts-page-1.xml",
    ):
        data = fetch(sm_url)
        if not data:
            continue
        try:
            root = ET.fromstring(data)
        except ET.ParseError:
            continue
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        for loc in root.findall(".//sm:loc", ns):
            if loc.text:
                p = normalize_path(loc.text)
                if p:
                    urls.add(p)
        for loc in root.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
            if loc.text:
                p = normalize_path(loc.text)
                if p:
                    urls.add(p)
        for loc in root.findall(".//loc"):
            if loc.text and "nwrma.gov.sl" in loc.text:
                p = normalize_path(loc.text)
                if p:
                    urls.add(p)
    return urls


def extract_internal_links(html: str) -> set[str]:
    paths: set[str] = set()
    for m in re.finditer(r'href=["\']([^"\']+)["\']', html, re.I):
        href = m.group(1)
        if href.startswith("/"):
            p = normalize_path(BASE + href)
        elif href.startswith(BASE) or href.startswith("https://nwrma.gov.sl"):
            p = normalize_path(href)
        else:
            p = None
        if p:
            paths.add(p)
    return paths


def extract_asset_urls(html: str) -> set[str]:
    assets: set[str] = set()
    patterns = [
        r'src=["\']([^"\']+)["\']',
        r'url\(["\']?([^"\')\s]+)["\']?\)',
        r'srcset=["\']([^"\']+)["\']',
        r'data-bg=["\']([^"\']+)["\']',
        r'background-image:\s*url\(["\']?([^"\')\s]+)["\']?\)',
    ]
    for pat in patterns:
        for m in re.finditer(pat, html, re.I):
            raw = m.group(1).split(",")[0].strip().split()[0]
            if "wp-content/uploads" in raw or raw.startswith("/wp-content/"):
                if raw.startswith("//"):
                    raw = "https:" + raw
                elif raw.startswith("/"):
                    raw = BASE + raw
                elif not raw.startswith("http"):
                    if raw.startswith("wp-content"):
                        raw = BASE + "/" + raw
                if "nwrma.gov.sl" in raw or raw.startswith("/wp-content"):
                    assets.add(raw.replace(BASE, "").lstrip("/"))
    return assets


def classify_template(path: str, html: str) -> str:
    if path == "/":
        return "home"
    if path == "/news/" or path.endswith("/category/news/"):
        return "news-list"
    if re.search(r'class="[^"]*single-post|type-post status-publish', html):
        return "news-article"
    if "/news/" in path and path != "/news/":
        return "news-article"
    if "layout_blog" in html or 'post_type":["post"]' in html:
        return "news-list"
    return "standard"


def extract_title(html: str) -> str:
    m = re.search(r"<title>([^<]+)</title>", html, re.I)
    if m:
        t = re.sub(r"\s*-\s*National Water.*$", "", m.group(1)).strip()
        return t
    return "NWRMA"


def extract_main_content(html: str) -> str:
    """Extract main page content between header and footer."""
    m = re.search(
        r'<main[^>]*id="page-content"[^>]*>(.*?)</main>',
        html,
        re.DOTALL | re.I,
    )
    if m:
        content = m.group(1)
    else:
        m = re.search(r'<main[^>]*>(.*?)</main>', html, re.DOTALL | re.I)
        content = m.group(1) if m else html
    # Rewrite asset paths for React public folder
    content = content.replace("wp-content/uploads/", "/assets/uploads/")
    content = content.replace('href="https://nwrma.gov.sl/', 'href="')
    content = content.replace("href='https://nwrma.gov.sl/", "href='")
    content = re.sub(r'src="https://nwrma\.gov\.sl/wp-content/', 'src="/assets/', content)
    content = re.sub(r"src='https://nwrma\.gov\.sl/wp-content/", "src='/assets/", content)
    return content.strip()


def path_to_file(path: str) -> Path:
    if path == "/":
        return HTML_DIR / "index.html"
    rel = path.strip("/").replace("/", "_")
    return HTML_DIR / f"{rel}.html"


def main():
    HTML_DIR.mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    SITE_MAP_PATH.parent.mkdir(parents=True, exist_ok=True)

    print("Collecting URLs from sitemap...")
    to_visit = collect_sitemap_urls()
    print(f"  Sitemap: {len(to_visit)} URLs")

    # Seed from local index.html nav
    local_index = ROOT / "index.html"
    if local_index.exists():
        local_html = local_index.read_text(encoding="utf-8", errors="replace")
        to_visit |= extract_internal_links(local_html)

    visited: set[str] = set()
    all_assets: set[str] = set()
    site_map: list[dict] = []
    queue = sorted(to_visit)

    while queue and len(visited) < MAX_PAGES:
        path = queue.pop(0)
        if path in visited:
            continue
        visited.add(path)

        url = BASE + (path if path != "/" else "/")
        print(f"[{len(visited)}] {path}")
        data = fetch(url)
        time.sleep(DELAY)
        if not data:
            continue

        html = data.decode("utf-8", errors="replace")
        out_file = path_to_file(path)
        out_file.parent.mkdir(parents=True, exist_ok=True)
        out_file.write_text(html, encoding="utf-8")

        for link in extract_internal_links(html):
            if link not in visited and link not in queue:
                queue.append(link)

        for asset in extract_asset_urls(html):
            all_assets.add(asset)

        template = classify_template(path, html)
        site_map.append({
            "path": path.rstrip("/") if path != "/" else "/",
            "route": path.rstrip("/") if path != "/" else "/",
            "template": template,
            "title": extract_title(html),
            "htmlFile": str(out_file.relative_to(ROOT)).replace("\\", "/"),
            "contentFile": None,
        })

    print(f"\nDownloading {len(all_assets)} assets...")
    downloaded = 0
    for rel in sorted(all_assets):
        if not rel.startswith("wp-content/uploads"):
            continue
        dest = ASSETS_DIR / rel.replace("wp-content/uploads/", "uploads/")
        if dest.exists() and dest.stat().st_size > 0:
            continue
        asset_url = f"{BASE}/{rel}"
        data = fetch(asset_url)
        time.sleep(0.15)
        if data:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            downloaded += 1
            if downloaded % 20 == 0:
                print(f"  {downloaded} assets...")

    # Write extracted content JSON for each page
    for entry in site_map:
        html_path = ROOT / entry["htmlFile"]
        if html_path.exists():
            html = html_path.read_text(encoding="utf-8", errors="replace")
            content = extract_main_content(html)
            content_path = ROOT / "src" / "data" / "pages" / (
                "home.json" if entry["path"] == "/" else f"{entry['path'].strip('/').replace('/', '_')}.json"
            )
            content_path.parent.mkdir(parents=True, exist_ok=True)
            content_path.write_text(
                json.dumps({"title": entry["title"], "html": content}, ensure_ascii=False),
                encoding="utf-8",
            )
            entry["contentFile"] = str(content_path.relative_to(ROOT)).replace("\\", "/")

    SITE_MAP_PATH.write_text(json.dumps(site_map, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nDone: {len(site_map)} pages, {downloaded} assets, site-map at {SITE_MAP_PATH}")


if __name__ == "__main__":
    main()
