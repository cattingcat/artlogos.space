"""Check the built container's HTTP contract using only the Python standard library."""

import json
import sys
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener
from xml.etree import ElementTree


base_url = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080").rstrip("/")
canonical_url = "https://artlogos.space/"
artist_names = ("Alina Logos", "Alina Pliushcheva")
portfolio = json.loads((Path(__file__).resolve().parent.parent / "src/content/portfolio.json").read_text())


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


http = build_opener(NoRedirect())


def fetch(path, headers=None):
    try:
        request = Request(base_url + path, headers=headers or {})
        with http.open(request, timeout=5) as response:
            return response.status, response.headers, response.read()
    except HTTPError as error:
        return error.code, error.headers, error.read()


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
        self.canonicals = []
        self.metadata = {}
        self.title = []
        self.body_text = []
        self.schemas = []
        self.images = []
        self.links = []
        self.artwork_cards = 0
        self.prerendered = False
        self.in_body = False
        self.in_title = False
        self.in_script = False
        self.in_style = False
        self.schema_text = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "body":
            self.in_body = True
        elif tag == "title":
            self.in_title = True
        elif tag == "style":
            self.in_style = True
        elif tag == "script":
            self.in_script = True
            if attrs.get("type") == "application/ld+json":
                self.schema_text = []
        if tag == "div" and attrs.get("id") == "root":
            self.prerendered = attrs.get("data-prerendered") == "true"
        if tag == "article" and "artwork-card" in attrs.get("class", "").split():
            self.artwork_cards += 1
        if tag == "meta":
            self.metadata[attrs.get("name") or attrs.get("property")] = attrs.get("content", "")
        if tag == "img":
            self.images.append(attrs)
        if tag == "a":
            self.links.append(attrs.get("href"))
        if tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonicals.append(attrs.get("href"))
        path = attrs.get("src") if tag == "script" else attrs.get("href") if tag == "link" else None
        if path and path.startswith("/") and not path.startswith("//"):
            self.assets.append(path)

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.schema_text is not None:
            self.schema_text.append(data)
        if self.in_body and not self.in_script and not self.in_style:
            self.body_text.append(data)

    def handle_endtag(self, tag):
        if tag == "body":
            self.in_body = False
        elif tag == "title":
            self.in_title = False
        elif tag == "style":
            self.in_style = False
        elif tag == "script":
            self.in_script = False
            if self.schema_text is not None:
                self.schemas.append(json.loads("".join(self.schema_text)))
                self.schema_text = None


def schema_nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from schema_nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from schema_nodes(child)


for attempt in range(30):
    try:
        status, _, body = fetch("/healthz")
        if status == 200 and body == b"ok\n":
            break
    except (URLError, TimeoutError, ConnectionError):
        pass
    time.sleep(0.5)
else:
    raise SystemExit("Container did not become healthy")

status, headers, html = fetch("/")
assert status == 200, "Homepage is unavailable"
assert "text/html" in headers.get("Content-Type", ""), "Wrong HTML content type"
assert "no-cache" in headers.get("Cache-Control", ""), "HTML must be revalidated"
page = Page()
page.feed(html.decode())
assert page.prerendered, "Missing prerendered React entrypoint"
assert page.artwork_cards == len(portfolio) > 0, f"Expected {len(portfolio)} prerendered artworks, got {page.artwork_cards}"
for name in artist_names:
    assert name in " ".join(page.body_text), f"Artist name missing from visible HTML: {name}"
    assert name in "".join(page.title), f"Artist name missing from title: {name}"
    assert name in page.metadata.get("description", ""), f"Artist name missing from description: {name}"
assert page.canonicals == [canonical_url], "Homepage canonical must use the primary HTTPS domain"
assert page.metadata.get("og:url") == canonical_url, "Open Graph URL must match the canonical"
assert page.schemas, "Missing structured data"
assert any(schema.get("@context") == "https://schema.org" for schema in page.schemas), "Missing Schema.org context"
people = [node for node in schema_nodes(page.schemas) if node.get("@type") == "Person"]
assert any(
    person.get("name") == artist_names[0]
    and artist_names[1] in (
        person.get("alternateName", [])
        if isinstance(person.get("alternateName"), list)
        else [person.get("alternateName")]
    )
    for person in people
), "Structured data must connect both artist names to one Person"

assert any(path.endswith(".js") for path in page.assets), "No JavaScript bundle"
assert any(path.endswith(".css") for path in page.assets), "No CSS bundle"
for path in page.assets:
    status, headers, body = fetch(path)
    assert status == 200 and body, f"Missing asset: {path}"
    assert "text/html" not in headers.get("Content-Type", ""), f"HTML returned for asset: {path}"
    if path.startswith("/assets/"):
        assert "immutable" in headers.get("Cache-Control", ""), f"Missing immutable caching: {path}"

status, headers, body = fetch("/robots.txt")
assert status == 200 and "text/plain" in headers.get("Content-Type", ""), "Missing robots.txt"
robots = body.decode()
assert "User-agent: *" in robots, "robots.txt must address public crawlers"
assert "Sitemap: https://artlogos.space/sitemap.xml" in robots, "Wrong sitemap URL in robots.txt"
assert not any(line.strip().lower() == "disallow: /" for line in robots.splitlines()), "robots.txt blocks the entire site"
assert "max-age=3600" in headers.get("Cache-Control", ""), "robots.txt cache policy is incorrect"

status, headers, body = fetch("/sitemap.xml")
assert status == 200 and "xml" in headers.get("Content-Type", ""), "Missing XML sitemap"
sitemap = ElementTree.fromstring(body)
namespace = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
assert sitemap.tag == namespace + "urlset", "Invalid sitemap root"
expected_pages = [canonical_url, *[f"{canonical_url}works/{work['id']}/" for work in portfolio]]
assert sorted(node.text for node in sitemap.findall(f"{namespace}url/{namespace}loc")) == sorted(expected_pages), "Sitemap must discover the homepage and every artwork"
assert "max-age=3600" in headers.get("Cache-Control", ""), "Sitemap cache policy is incorrect"

for work in portfolio:
    path = f"/works/{work['id']}/"
    assert path in page.links, f"Homepage does not link to the static artwork: {path}"
    status, headers, body = fetch(path)
    assert status == 200 and body != html, f"Artwork URL must return its own HTML: {path}"
    assert "text/html" in headers.get("Content-Type", ""), f"Wrong artwork content type: {path}"
    assert "no-cache" in headers.get("Cache-Control", ""), f"Artwork HTML must be revalidated: {path}"
    detail = Page()
    detail.feed(body.decode())
    assert detail.prerendered, f"Artwork must be prerendered: {path}"
    assert detail.canonicals == [canonical_url.rstrip("/") + path], f"Wrong artwork canonical: {path}"
    for name in (*artist_names, work["title"]):
        assert name in "".join(detail.title), f"Artwork title is missing {name}: {path}"
    visible = " ".join(" ".join(detail.body_text).split())
    if work.get("description"):
        assert " ".join(work["description"].split()) in visible, f"Artwork description is inaccessible without JS: {path}"
    for image in work["images"]:
        assert any(img.get("src") == image["src"] and img.get("alt") for img in detail.images), f"Full photograph is inaccessible without JS: {image['src']}"
        assert image["src"] in detail.links, f"Missing full image link: {image['src']}"
    assert any(node.get("@type") == "VisualArtwork" and node.get("name") == work["title"] for node in schema_nodes(detail.schemas)), f"Missing artwork schema: {path}"

# Test actual nginx routing, not only the existence of generated build files.
status, headers, _ = fetch("/works/church-interior?source=smoke")
assert status == 301 and headers.get("Location") == "/works/church-interior/?source=smoke", "Directory redirect must preserve HTTPS by staying relative, and preserve the query"
status, headers, _ = fetch("/works/azure/index.html?source=smoke")
assert status == 301 and headers.get("Location") == "/works/azure/?source=smoke", "Physical index URLs must canonicalize before client hydration"
for work_id in ("church-interior", "portrait-blue-scarf", "forest-figure"):
    work = next(work for work in portfolio if work["id"] == work_id)
    for image in work["images"]:
        for path in (image["src"], image["thumbnail"]):
            status, headers, body = fetch(path)
            assert status == 200 and body.startswith(b"RIFF") and body[8:12] == b"WEBP", f"Artwork file must be a real WebP: {path}"
            assert "image/webp" in headers.get("Content-Type", ""), f"Wrong image content type: {path}"

for path in ("/llms.txt", "/llms-full.txt"):
    status, headers, body = fetch(path)
    assert status == 200 and "text/plain" in headers.get("Content-Type", ""), f"Missing text catalogue: {path}"
    assert "no-cache" in headers.get("Cache-Control", ""), f"Text catalogue must be revalidated: {path}"
    text = body.decode()
    assert all(name in text for name in artist_names), f"Text catalogue must identify both names: {path}"
    assert all(f"{canonical_url}works/{work['id']}/" in text for work in portfolio), f"Text catalogue omits artwork links: {path}"

for category in ("all", "landscapes", "cityscapes", "figures", "portraits", "interiors"):
    for suffix in ("", "/"):
        path = f"/category/{category}{suffix}?work=example"
        status, _, body = fetch(path)
        assert status == 200 and body == html, f"Legacy category fallback is broken: {path}"
status, _, body = fetch("/?category=figures&work=example")
assert status == 200 and body == html, "Query-based artwork navigation is broken"

for path in (
    "/not-a-real-page",
    "/works/not-a-real-painting/",
    "/works/azure/not-a-real-page/",
    "/category/not-a-real-category",
    "/category/figures/not-a-real-page",
    "/assets/not-a-real-bundle.js",
    "/artworks/not-a-real-painting.avif",
    "/not-a-real-sitemap.xml",
):
    assert fetch(path)[0] == 404, f"Missing resource must return 404: {path}"

redirect_path = "/category/figures/?work=example&source=smoke"
status, headers, _ = fetch(redirect_path, {"Host": "www.artlogos.space"})
assert status == 301, "www host must permanently redirect"
assert headers.get("Location") == canonical_url.rstrip("/") + redirect_path, "www redirect must preserve path and query"

print(f"Smoke checks passed: health, {len(portfolio)} static artwork pages, descriptions and photographs without JS, text catalogues, metadata, assets, cache headers, routes, 404s and redirects")
