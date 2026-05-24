#!/usr/bin/env python3
"""Build site-map.json and page content from crawled HTML."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML_DIR = ROOT / "scripts" / "crawl-output" / "html"
OUT = ROOT / "src" / "data" / "site-map.json"
PAGES_DIR = ROOT / "src" / "data" / "pages"


def file_to_path(name: str) -> str:
    if name == "index.html":
        return "/"
    return "/" + name.replace(".html", "").replace("_", "/") + "/"


def classify(path: str, html: str) -> str:
    if path == "/":
        return "home"
    if path in ("/news/", "/category/news/"):
        return "news-list"
    if path.startswith("/category/"):
        return "news-list"
    if re.search(r"type-post|single-post|post-\d+", html):
        return "news-article"
    if path.count("/") >= 2 and "/news/" not in path and "sitemap" not in path:
        if re.search(r"<article", html):
            return "news-article"
    if "sitemap" in path or path.endswith(".xml/"):
        return "skip"
    return "standard"


def extract_title(html: str) -> str:
    m = re.search(r"<title>([^<]+)</title>", html, re.I)
    if m:
        return re.sub(r"\s*-\s*National Water.*$", "", m.group(1)).strip()
    return "NWRMA"


def extract_main(html: str) -> str:
    m = re.search(r'<main[^>]*>(.*?)</main>', html, re.DOTALL | re.I)
    content = m.group(1) if m else ""
    content = re.sub(r"//nwrma\.gov\.sl/+/?assets/uploads/", "/assets/uploads/", content)
    content = re.sub(r"//nwrma\.gov\.sl/+wp-content/uploads/", "/assets/uploads/", content)
    content = re.sub(r"https?://(?:www\.)?nwrma\.gov\.sl/wp-content/uploads/", "/assets/uploads/", content)
    content = content.replace("wp-content/uploads/", "/assets/uploads/")
    content = re.sub(r'src="https?://[^"]*?/wp-content/', 'src="/assets/', content)
    content = re.sub(r"href=\"https://nwrma\.gov\.sl", 'href="', content)
    content = re.sub(r"href='https://nwrma\.gov\.sl", "href='", content)
    return content.strip()


def main():
    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    site_map = []
    skip_patterns = ("sitemap", "author_", "default-sitemap", "post_tag", "post-sitemap", "page-sitemap", "category-sitemap", "thjm_")

    for html_file in sorted(HTML_DIR.glob("*.html")):
        name = html_file.name
        path = file_to_path(name)
        if any(p in name for p in skip_patterns):
            continue
        html = html_file.read_text(encoding="utf-8", errors="replace")
        template = classify(path, html)
        if template == "skip":
            continue
        slug = "home" if path == "/" else path.strip("/").replace("/", "_")
        content_path = PAGES_DIR / f"{slug}.json"
        title = extract_title(html)
        main_html = extract_main(html)
        content_path.write_text(json.dumps({"title": title, "html": main_html}, ensure_ascii=False), encoding="utf-8")
        site_map.append({
            "path": path.rstrip("/") if path != "/" else "/",
            "route": path.rstrip("/") if path != "/" else "/",
            "template": template,
            "title": title,
            "contentFile": f"src/data/pages/{slug}.json",
        })

    OUT.write_text(json.dumps(site_map, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Built {len(site_map)} pages -> {OUT}")


if __name__ == "__main__":
    main()
