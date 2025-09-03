import http.server
import socketserver
import requests
import json
import os

PORT = 8000
API_URL = "https://openrouter.ai/api/v1/chat/completions"

class CORSProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        if self.path == '/api/chat/completions':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Title, HTTP-Referer')
            self.end_headers()
        else:
            self.send_error(404, "Not found")

    def do_POST(self):
        # Handle the actual POST request
        if self.path == '/api/chat/completions':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                request_body = json.loads(post_data)
                
                # Forward the request to OpenRouter
                headers = {
                    'Authorization': self.headers.get('Authorization'),
                    'Content-Type': 'application/json',
                    'HTTP-Referer': self.headers.get('HTTP-Referer'),
                    'X-Title': self.headers.get('X-Title')
                }

                # Ensure Authorization header is present
                if not headers['Authorization']:
                    self.send_error(401, 'Authorization header is missing')
                    return

                response = requests.post(
                    API_URL, 
                    headers=headers, 
                    json=request_body,
                    timeout=30 # Set a timeout
                )

                self.send_response(response.status_code)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                for header, value in response.headers.items():
                    if header.lower() in ['content-type', 'access-control-allow-origin']:
                        continue
                    self.send_header(header, value)
                self.end_headers()
                self.wfile.write(response.content)

            except Exception as e:
                self.send_error(500, f'Internal Server Error: {str(e)}')
    
    def do_GET(self):
        # Serve the HTML file
        if self.path == '/':
            self.path = '/chat.html'
        
        try:
            # Check if the file exists and serve it
            full_path = self.translate_path(self.path)
            if os.path.exists(full_path) and os.path.isfile(full_path):
                return http.server.SimpleHTTPRequestHandler.do_GET(self)
            else:
                self.send_error(404, "File not found")
        except Exception as e:
            self.send_error(500, f'Internal Server Error: {str(e)}')
            
if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), CORSProxyHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print(f"CORS Proxy active for {API_URL}")
        httpd.serve_forever()
