#!/usr/bin/env python3
import http.server
import socketserver
import urllib.request
import json
from urllib.parse import urlparse, parse_qs

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/'):
            # Proxy API requests to FastAPI backend
            try:
                url = f'http://localhost:5000{self.path}'
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req) as response:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(response.read())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            # Serve the main HTML file for all other requests
            self.path = '/index.html'
            return super().do_GET()

PORT = 3000
Handler = DashboardHandler

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"Dashboard server running at http://0.0.0.0:{PORT}")
    httpd.serve_forever()