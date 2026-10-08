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
assert [node.text for node in sitemap.findall(f"{namespace}url/{namespace}loc")] == [canonical_url], "Sitemap must list only the canonical homepage"
assert "max-age=3600" in headers.get("Cache-Control", ""), "Sitemap cache policy is incorrect"

for category in ("all", "landscapes", "cityscapes", "figures", "portraits", "interiors"):
    for suffix in ("", "/"):
        path = f"/category/{category}{suffix}?work=example"
        status, _, body = fetch(path)
        assert status == 200 and body == html, f"Legacy category fallback is broken: {path}"
status, _, body = fetch("/?category=figures&work=example")
assert status == 200 and body == html, "Query-based artwork navigation is broken"

for path in (
    "/not-a-real-page",
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

print(f"Smoke checks passed: health, prerendered HTML, artist metadata, {len(page.assets)} assets, cache headers, crawler files, routes, 404s, www redirect")
