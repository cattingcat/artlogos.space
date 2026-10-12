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
locales = ("en", "ru", "fr", "de", "it", "es", "ja")
og_locales = dict(zip(locales, ("en_US", "ru_RU", "fr_FR", "de_DE", "it_IT", "es_ES", "ja_JP")))
root = Path(__file__).resolve().parent.parent
dictionaries = {locale: json.loads((root / f"src/i18n/locales/{locale}.json").read_text()) for locale in locales}
portfolio = json.loads((root / "src/content/portfolio.json").read_text())


def artist_names_for(locale):
    return ("Alina Logos", "Алина Плющева" if locale == "ru" else "Alina Pliushcheva")


def verify_name_localization(text, locale, context):
    if locale != "ru":
        assert not any(name in text for name in ("Алина Плющева", "Алины Плющевой")), f"Russian artist name leaked into another language: {context}"


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
        self.lang = None
        self.alternates = []
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
        if tag == "html":
            self.lang = attrs.get("lang")
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
        if tag == "link" and "alternate" in attrs.get("rel", "").split() and "hreflang" in attrs:
            self.alternates.append((attrs["hreflang"], attrs.get("href")))
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

def absolute(path):
    return canonical_url.rstrip("/") + path


def page_path(locale, work=None):
    return f"/{locale}/works/{work['id']}/" if work else f"/{locale}/"


def expected_alternates(work=None):
    return {
        **{locale: absolute(page_path(locale, work)) for locale in locales},
        "x-default": absolute(page_path("en", work)) if work else canonical_url,
    }


def verify_alternates(links, work, context):
    expected = expected_alternates(work)
    assert len(links) == len(expected), f"Missing or duplicate hreflang links: {context}"
    assert dict(links) == expected, f"Incorrect language alternatives: {context}"


def verify_page(path, locale, work=None):
    status, headers, body = fetch(path)
    assert status == 200, f"Page is unavailable: {path} ({status})"
    assert "text/html" in headers.get("Content-Type", ""), f"Wrong HTML content type: {path}"
    assert "no-cache" in headers.get("Cache-Control", ""), f"HTML must be revalidated: {path}"
    page = Page()
    page.feed(body.decode())
    expected_url = absolute(page_path(locale, work))
    messages = dictionaries[locale]
    artist_names = artist_names_for(locale)
    assert messages["site"]["fullName"] == artist_names[1], f"Wrong localized artist full name: {path}"
    translated = messages["artworks"][work["id"]] if work else None
    assert page.prerendered, f"Missing prerendered React entrypoint: {path}"
    assert page.lang == locale, f"Wrong HTML language: {path}"
    assert page.canonicals == [expected_url], f"Wrong page canonical: {path}"
    assert page.metadata.get("og:url") == expected_url, f"Open Graph URL must match the canonical: {path}"
    assert page.metadata.get("og:locale") == og_locales[locale], f"Wrong Open Graph locale: {path}"
    assert page.metadata.get("description"), f"Missing page description: {path}"
    assert page.metadata.get("og:description") == page.metadata["description"], f"Open Graph description mismatch: {path}"
    assert page.metadata.get("twitter:description") == page.metadata["description"], f"Twitter description mismatch: {path}"
    verify_alternates(page.alternates, work, path)
    title = "".join(page.title)
    visible = " ".join(" ".join(page.body_text).split())
    for field in ("og:title", "twitter:title"):
        assert page.metadata.get(field) == title, f"Wrong social title {field}: {path}"
    assert page.metadata.get("author") == f"{artist_names[0]} ({artist_names[1]})", f"Untranslated or incorrect author: {path}"
    for field, value in (("title", title), ("description", page.metadata["description"]), ("author", page.metadata["author"]), ("visible text", visible)):
        verify_name_localization(value, locale, f"{path}: {field}")
    for name in artist_names:
        assert name in visible, f"Artist name missing from visible HTML: {name}: {path}"
        assert name in title, f"Artist name missing from title: {name}: {path}"
        assert name in page.metadata["description"], f"Artist name missing from description: {name}: {path}"
    assert page.schemas, f"Missing structured data: {path}"
    assert any(schema.get("@context") == "https://schema.org" for schema in page.schemas), f"Missing Schema.org context: {path}"
    nodes = list(schema_nodes(page.schemas))
    people = [node for node in nodes if node.get("@type") == "Person"]
    assert any(
        person.get("name") == artist_names[0]
        and artist_names[1] in (
            person.get("alternateName", [])
            if isinstance(person.get("alternateName"), list)
            else [person.get("alternateName")]
        )
        for person in people
    ), f"Structured data must connect both artist names to one Person: {path}"
    if locale == "ru":
        assert any(
            person.get("name") == artist_names[0]
            and isinstance(person.get("alternateName"), list)
            and all(name in person["alternateName"] for name in ("Алина Плющева", "Alina Pliushcheva"))
            for person in people
        ), f"Russian Person schema must retain the Latin artist alias: {path}"
    verify_name_localization(json.dumps(page.schemas, ensure_ascii=False), locale, f"{path}: schema")
    assert any(node.get("@type") == "WebSite" and node.get("inLanguage") == list(locales) for node in nodes), f"Website schema must declare all languages: {path}"
    page_type = "WebPage" if work else "ProfilePage"
    assert any(node.get("@type") == page_type and node.get("url") == expected_url and node.get("inLanguage") == locale and node.get("name") == title for node in nodes), f"Missing or incorrect localized page schema: {path}"
    if work:
        assert title == f'{translated["title"]} — {artist_names[0]} ({artist_names[1]})', f"Wrong localized artwork page title: {path}"
        assert translated["title"] in title and translated["title"] in visible, f"Missing localized artwork title: {path}"
        if translated.get("description"):
            assert " ".join(translated["description"].split()) in visible, f"Description inaccessible without JavaScript: {path}"
        for image, translation in zip(work["images"], translated["images"]):
            assert any(img.get("src") == image["src"] and img.get("alt") == translation["alt"] for img in page.images), f"Photograph or translated alt missing: {path}: {image['src']}"
            assert image["src"] in page.links, f"Missing full image link: {path}: {image['src']}"
        artwork_schemas = [node for node in nodes if node.get("@type") == "VisualArtwork"]
        assert len(artwork_schemas) == 1, f"Missing or duplicate artwork schema: {path}"
        artwork = artwork_schemas[0]
        assert artwork.get("name") == translated["title"] and artwork.get("url") == expected_url and artwork.get("inLanguage") == locale, f"Wrong localized artwork schema: {path}"
        assert artwork.get("description") == translated.get("description"), f"Schema description does not match the artwork: {path}"
        assert artwork.get("keywords") == [messages["tags"][tag] for tag in work["tags"]], f"Schema subjects must be translated: {path}"
    else:
        assert page.artwork_cards == len(portfolio) > 0, f"Expected {len(portfolio)} prerendered artworks, got {page.artwork_cards}: {path}"
        assert title == messages["site"]["pageTitle"], f"Wrong translated homepage title: {path}"
        assert page.metadata["description"] == messages["site"]["description"], f"Wrong translated homepage description: {path}"
        for artwork in portfolio:
            assert page_path(locale, artwork) in page.links, f"Homepage does not link to a localized artwork: {path}: {artwork['id']}"
    return page, body


# Each translated page must work for crawlers without JavaScript or language headers.
localized_bodies = {}
for locale in locales:
    homepage, body = verify_page(page_path(locale), locale)
    localized_bodies[locale] = body
    for work in portfolio:
        verify_page(page_path(locale, work), locale, work)

# Previously published URLs remain usable English aliases, canonicalized to /en/.
page, html = verify_page("/", "en")
assert html == localized_bodies["en"], "Root must preserve the English fallback HTML"
verify_page("/index.html", "en")
for work in portfolio:
    verify_page(f"/works/{work['id']}/", "en", work)

assert any(path.endswith(".js") for path in page.assets), "No JavaScript bundle"
assert any(path.endswith(".css") for path in page.assets), "No CSS bundle"
for path in set(page.assets):
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
xhtml_namespace = "{http://www.w3.org/1999/xhtml}"
assert sitemap.tag == namespace + "urlset", "Invalid sitemap root"
expected_pages = {
    absolute(page_path(locale, work)): work
    for locale in locales
    for work in [None, *portfolio]
}
entries = sitemap.findall(f"{namespace}url")
assert sorted(node.find(f"{namespace}loc").text for node in entries) == sorted(expected_pages), "Sitemap must discover every localized homepage and artwork, without duplicate legacy URLs"
for node in entries:
    url = node.find(f"{namespace}loc").text
    links = [(link.get("hreflang"), link.get("href")) for link in node.findall(f"{xhtml_namespace}link")]
    verify_alternates(links, expected_pages[url], f"sitemap: {url}")
assert "max-age=3600" in headers.get("Cache-Control", ""), "Sitemap cache policy is incorrect"

# Test nginx's actual routing, including relative redirects behind an HTTPS proxy.
redirects = {
    "/works/church-interior": "/works/church-interior/",
    "/works/azure/index.html": "/works/azure/",
}
for locale in locales:
    redirects.update({
        f"/{locale}": f"/{locale}/",
        f"/{locale}/index.html": f"/{locale}/",
        f"/{locale}/works/church-interior": f"/{locale}/works/church-interior/",
        f"/{locale}/works/azure/index.html": f"/{locale}/works/azure/",
    })
for source, target in redirects.items():
    status, headers, _ = fetch(source + "?source=smoke&check=1")
    assert status == 301 and headers.get("Location") == target + "?source=smoke&check=1", f"Relative redirect must normalize the path and preserve its query: {source}"

for work_id in ("church-interior", "portrait-blue-scarf", "forest-figure"):
    work = next(work for work in portfolio if work["id"] == work_id)
    for image in work["images"]:
        for path in (image["src"], image["thumbnail"]):
            status, headers, body = fetch(path)
            assert status == 200 and body.startswith(b"RIFF") and body[8:12] == b"WEBP", f"Artwork file must be a real WebP: {path}"
            assert "image/webp" in headers.get("Content-Type", ""), f"Wrong image content type: {path}"

for prefix, locale in [("", "en"), *[(f"/{locale}", locale) for locale in locales]]:
    for filename in ("llms.txt", "llms-full.txt"):
        path = f"{prefix}/{filename}"
        status, headers, body = fetch(path)
        assert status == 200 and "text/plain" in headers.get("Content-Type", ""), f"Missing text catalogue: {path}"
        assert "no-cache" in headers.get("Cache-Control", ""), f"Text catalogue must be revalidated: {path}"
        text = body.decode()
        assert all(name in text for name in artist_names_for(locale)), f"Text catalogue must identify both names: {path}"
        verify_name_localization(text, locale, path)
        assert all(absolute(page_path(locale, work)) in text for work in portfolio), f"Text catalogue omits localized artwork links: {path}"
        assert dictionaries[locale]["site"]["aboutParagraphs"][0] in text, f"Text catalogue introduction must be translated: {path}"
        for work in portfolio:
            translated = dictionaries[locale]["artworks"][work["id"]]
            if filename == "llms-full.txt":
                assert f"## {translated['title']}" in text, f"Text catalogue omits the translated title: {path}: {work['id']}"
                if translated.get("description"):
                    assert translated["description"] in text, f"Text catalogue omits translated description: {path}: {work['id']}"

for category in ("all", "landscapes", "cityscapes", "figures", "portraits", "interiors"):
    for suffix in ("", "/"):
        path = f"/category/{category}{suffix}?work=example"
        status, headers, body = fetch(path)
        assert status == 200 and body == html, f"Legacy category fallback is broken: {path}"
        assert "no-cache" in headers.get("Cache-Control", ""), f"Legacy HTML must be revalidated: {path}"
status, _, body = fetch("/?category=figures&work=example")
assert status == 200 and body == html, "Query-based artwork navigation is broken"

# The server must never select a language from Accept-Language or a crawler agent.
for path, expected_body in [("/", html), *[(f"/{locale}/", localized_bodies[locale]) for locale in locales]]:
    status, headers, body = fetch(path, {"Accept-Language": "ja-JP,ru;q=0.9", "User-Agent": "Googlebot"})
    assert status == 200 and body == expected_body, f"Language URLs must be stable regardless of request headers: {path}"
    assert "Location" not in headers, f"Unexpected server language redirect: {path}"

missing_paths = [
    "/not-a-real-page",
    "/works/",
    "/works/not-a-real-painting/",
    "/works/not-a-real-painting/index.html",
    "/works/azure/not-a-real-page/",
    "/category/not-a-real-category",
    "/category/figures/not-a-real-page",
    "/assets/not-a-real-bundle.js",
    "/artworks/not-a-real-painting.avif",
    "/not-a-real-sitemap.xml",
    "/pt/",
    "/pt/works/azure/",
    "/pt/llms.txt",
    "/xx/works/azure/index.html",
]
for locale in locales:
    missing_paths.extend([
        f"/{locale}/not-a-real-page",
        f"/{locale}/works/",
        f"/{locale}/works/not-a-real-painting/",
        f"/{locale}/works/not-a-real-painting/index.html",
        f"/{locale}/works/azure/not-a-real-page/",
        f"/{locale}/assets/not-a-real-bundle.js",
        f"/{locale}/not-a-real-file.txt",
    ])
for path in missing_paths:
    assert fetch(path)[0] == 404, f"Missing resource must return 404: {path}"

for redirect_path in ("/category/figures/?work=example&source=smoke", "/ja/works/azure/?source=smoke", "/ru/?category=portraits"):
    status, headers, _ = fetch(redirect_path, {"Host": "www.artlogos.space"})
    assert status == 301, "www host must permanently redirect"
    assert headers.get("Location") == absolute(redirect_path), "www redirect must preserve the language, path and query"

print(f"Smoke checks passed: health, {len(expected_pages)} localized pages and 37 English aliases, translated content without JavaScript, hreflang, schemas, multilingual sitemap and catalogues, assets, cache headers, stable language routes, 404s and redirects")
