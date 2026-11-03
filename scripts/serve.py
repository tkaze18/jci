#!/usr/bin/env python3
"""Build the site and serve it locally.

    python3 scripts/serve.py            # http://127.0.0.1:8000
    python3 scripts/serve.py --port 3000

Rebuilds once on start. Re-run after editing content/site.json, the
templates or scripts/build.py.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import os
import socketserver
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    """Serves clean URLs the way a static host does, and a real 404 page."""

    def send_error(self, code, message=None, explain=None):
        if code == 404:
            page = os.path.join(self.directory, "404.html")
            if os.path.exists(page):
                with open(page, "rb") as handle:
                    body = handle.read()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
        super().send_error(code, message, explain)

    def log_message(self, fmt, *args):  # quieter output
        if "200" not in (args[1] if len(args) > 1 else ""):
            super().log_message(fmt, *args)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--out", default="dist")
    parser.add_argument("--no-build", action="store_true")
    args = parser.parse_args()

    if not args.no_build:
        result = subprocess.run(
            [sys.executable, os.path.join(ROOT, "scripts", "build.py"), "--out", args.out]
        )
        if result.returncode:
            return result.returncode

    directory = os.path.join(ROOT, args.out)
    handler = functools.partial(Handler, directory=directory)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as server:
        print(f"serving {directory} at http://127.0.0.1:{args.port}  (ctrl-c to stop)")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
