import os
from flask import Flask, render_template, jsonify
import requests
from urllib.parse import urlencode

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_landmarks')
def get_landmarks():
    # Get coordinates from request parameters
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    radius = float(request.args.get('radius', 10000))  # Default radius: 10km

    # Construct Wikipedia API URL
    base_url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "list": "geosearch",
        "gscoord": f"{lat}|{lon}",
        "gsradius": radius,
        "gslimit": 50
    }
    url = f"{base_url}?{urlencode(params)}"

    try:
        response = requests.get(url)
        data = response.json()
        landmarks = data['query']['geosearch']
        return jsonify(landmarks)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
