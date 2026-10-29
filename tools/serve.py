"""Serve static EOHA pages and proxy read-only API requests to the local backend."""
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[1]
LEGACY_ROUTES = json.loads((PROJECT_ROOT / 'config/routes.json').read_text())


class Handler(SimpleHTTPRequestHandler):
    """Handle canonical pages, bookmarked legacy URLs and backend requests."""

    def redirect_legacy_page(self):
        """
        redirect_legacy_page()
        ----------------------
        Redirect a bookmarked page URL to its feature folder, preserving the query.

        Parameters:
        -----------
        none

        Returns:
        --------
        bool
            True when a redirect response was sent.
        """
        current = urlsplit(self.path)
        destination = LEGACY_ROUTES.get(current.path)
        if destination is None:
            return False
        if current.query:
            destination += '?' + current.query
        self.send_response(308)
        self.send_header('Location', destination)
        self.send_header('Content-Length', '0')
        self.end_headers()
        return True

    def forward_api_request(self):
        """
        forward_api_request()
        ---------------------
        Fetch a read-only backend response and relay its status and JSON body.

        Parameters:
        -----------
        none

        Returns:
        --------
        None
        """
        try:
            request = Request(self.server.backend + self.path, headers={'Accept': 'application/json'})
            with urlopen(request, timeout=60) as response:
                payload = response.read()
                self.send_response(response.status)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                self.wfile.write(payload)
        except HTTPError as error:
            self.send_response(error.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(error.read())
        except (URLError, TimeoutError):
            self.send_error(502, 'EOHA backend unavailable')

    def do_GET(self):
        """
        do_GET()
        --------
        Route a GET request to a legacy redirect, API proxy or static file.

        Parameters:
        -----------
        none

        Returns:
        --------
        None
        """
        if self.redirect_legacy_page():
            return
        if self.path.startswith('/api/'):
            self.forward_api_request()
            return
        super().do_GET()

    def do_HEAD(self):
        """
        do_HEAD()
        ---------
        Preserve legacy redirects for header-only requests and serve file headers.

        Parameters:
        -----------
        none

        Returns:
        --------
        None
        """
        if not self.redirect_legacy_page():
            super().do_HEAD()


def main():
    """
    main()
    ------
    Start the local preview with an optional port and backend origin.

    Parameters:
    -----------
    none

    Returns:
    --------
    None
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8766)
    parser.add_argument('--backend', default='http://127.0.0.1:8080')
    args = parser.parse_args()
    handler = partial(Handler, directory=str(PROJECT_ROOT))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    server.backend = args.backend.rstrip('/')
    print(f'EOHA preview: http://localhost:{args.port}', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
