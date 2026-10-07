"""Check the built container's HTTP contract using only the Python standard library."""

import sys
import time
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.request import urlopen


base_url = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080").rstrip("/")


def fetch(path):
    try:
        with urlopen(base_url + path, timeout=5) as response:
            return response.status, response.headers, response.read()
    except HTTPError as error:
        return error.code, error.headers, error.read()


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
assert status == 200 and b'<div id="root"></div>' in html, "Missing React entrypoint"
assert "text/html" in headers.get("Content-Type", ""), "Wrong HTML content type"
assert "no-cache" in headers.get("Cache-Control", ""), "HTML must be revalidated"


class Assets(HTMLParser):
    paths = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        path = attrs.get("src") if tag == "script" else attrs.get("href") if tag == "link" else None
        if path and path.startswith("/") and not path.startswith("//"):
            self.paths.append(path)


assets = Assets()
assets.feed(html.decode())
assert any(path.endswith(".js") for path in assets.paths), "No JavaScript bundle"
assert any(path.endswith(".css") for path in assets.paths), "No CSS bundle"
for path in assets.paths:
    status, headers, body = fetch(path)
    assert status == 200 and body, f"Missing asset: {path}"
    assert "text/html" not in headers.get("Content-Type", ""), f"HTML returned for asset: {path}"
    if path.startswith("/assets/"):
        assert "immutable" in headers.get("Cache-Control", ""), f"Missing immutable caching: {path}"

status, _, body = fetch("/category/figures?work=example")
assert status == 200 and body == html, "SPA deep-link fallback is broken"
for path in ["/assets/not-a-real-bundle.js", "/artworks/not-a-real-painting.avif"]:
    assert fetch(path)[0] == 404, f"Missing asset must return 404: {path}"

print(f"Smoke checks passed: health, HTML, {len(assets.paths)} assets, cache headers, SPA route, missing files")
