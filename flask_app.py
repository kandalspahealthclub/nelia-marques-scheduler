from flask import Flask, request, jsonify, send_from_directory, send_file
import os
import json

app = Flask(__name__, static_url_path='')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data.json')

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

@app.route('/')
def index():
    return send_file(os.path.join(BASE_DIR, 'index.html'))

@app.route('/mobile')
def mobile():
    return send_file(os.path.join(BASE_DIR, 'mobile_app.html'))

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(BASE_DIR, path)

@app.route('/api/state', methods=['GET'])
def get_state():
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({})

@app.route('/api/state', methods=['POST'])
def save_state():
    try:
        new_state = request.json
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(new_state, f, indent=2)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=8000)
