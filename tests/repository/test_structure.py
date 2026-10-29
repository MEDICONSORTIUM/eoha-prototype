"""Check local links, assets and route aliases after feature-folder moves."""
import json
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]


class ReferenceParser(HTMLParser):
    """Collect local resource references in page markup."""
    def __init__(self):
        super().__init__()
        self.references = []

    def handle_starttag(self, tag, attributes):
        self.references.extend(value for name, value in attributes
                               if name in ('src', 'href', 'poster') and value)


def local_target(source, reference):
    """
    local_target()
    --------------
    Resolve a local file reference; ignore external URLs and same-page anchors.

    Parameters:
    -----------
    source: Path
        The file containing the reference.
    reference: str
        The linked resource URL.

    Returns:
    --------
    Path | None
        The local target, or None for an external URL or anchor.
    """
    url = urlsplit(reference)
    if url.scheme or url.netloc or not url.path:
        return None
    return (ROOT / unquote(url.path.lstrip('/')) if url.path.startswith('/')
            else source.parent / unquote(url.path)).resolve()


class StructureTests(unittest.TestCase):
    def test_html_references(self):
        for source in [ROOT / 'index.html', *sorted((ROOT / 'pages').rglob('*.html'))]:
            parser = ReferenceParser()
            parser.feed(source.read_text())
            for reference in parser.references:
                target = local_target(source, reference)
                if target is not None:
                    with self.subTest(page=str(source.relative_to(ROOT)), url=reference):
                        self.assertTrue(target.is_file(), f'Missing target: {target}')

    def test_css_references(self):
        for source in (ROOT / 'styles').rglob('*.css'):
            for reference in re.findall(r'url\([\'\"]?([^\)\'\"]+)', source.read_text()):
                target = local_target(source, reference)
                if target is not None:
                    with self.subTest(file=str(source.relative_to(ROOT)), url=reference):
                        self.assertTrue(target.is_file(), f'Missing target: {target}')

    def test_legacy_routes(self):
        for old, new in json.loads((ROOT / 'config/routes.json').read_text()).items():
            with self.subTest(route=old):
                self.assertNotEqual(old, new)
                self.assertTrue((ROOT / new.lstrip('/')).is_file())

    def test_no_demo_files_or_runtime(self):
        for directory in ['scripts', 'data', 'pages', 'tools']:
            for source in (ROOT / directory).rglob('*'):
                if source.is_file():
                    self.assertNotRegex(source.name, r'ncd[-_]mock|ncd[-_]demo|generate_ncd_mock')
        for source in (ROOT / 'scripts').rglob('*.js'):
            if 'vendor' not in source.parts:
                self.assertNotRegex(source.read_text(), r'\b(?:Math\.random|FORECAST_DATA|NcdDemo|isDemo)\b')


if __name__ == '__main__':
    unittest.main()
