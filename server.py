import http.server
import socketserver
import json
import os

PORT = 8000
DATA_FILE = 'data.json'

# Initialize data file if not exists
if not os.path.exists(DATA_FILE):
    default_state = {
        "appointments": [],
        "clients": [
            { "id": 1, "name": "Sarah Connor", "phone": "11999999991" },
            { "id": 2, "name": "John Wick", "phone": "11999999992" }
        ],
        "services": [
            { "id": 1, "name": "Consulta", "duration": 30, "price": 150 },
            { "id": 2, "name": "Exame", "duration": 45, "price": 200 }
        ],
        "messages": [],
        "currentView": "dashboard"
    }
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(default_state, f, indent=2)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/state':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*') # Allow CORS
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            self.end_headers()
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    self.wfile.write(f.read().encode('utf-8'))
            except Exception as e:
                print(f"Error reading DB: {e}")
                self.wfile.write(b'{}')
        else:
            # Serve static files
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/state':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                new_state = json.loads(post_data.decode('utf-8'))
                
                # Basic validation/merging could go here, but we'll trust the client for this simple app
                with open(DATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(new_state, f, indent=2)
                    
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"status": "success"}')
            except Exception as e:
                print(f"Error saving DB: {e}")
                self.send_response(500)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

print(f"Serving at http://localhost:{PORT}")
print("To access from other devices, use your IP Address")

# Allow reuse address to prevent 'Address already in use' errors during restarts
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("0.0.0.0", PORT), CustomHandler) as httpd:
    httpd.serve_forever()
