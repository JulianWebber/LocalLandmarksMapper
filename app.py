import os
from flask import Flask, render_template, jsonify, request
import requests
from urllib.parse import urlencode
import logging

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

# Set up logging
logging.basicConfig(level=logging.DEBUG)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_landmarks')
def get_landmarks():
    try:
        # Get coordinates from request parameters
        lat = request.args.get('lat')
        lon = request.args.get('lon')
        radius = request.args.get('radius', 10000)  # Default radius: 10km

        # Log received parameters
        app.logger.debug(f"Received parameters: lat={lat}, lon={lon}, radius={radius}")

        # Validate parameters
        if not lat or not lon:
            return jsonify({"error": "Missing latitude or longitude"}), 400

        try:
            lat = float(lat)
            lon = float(lon)
            radius = float(radius)
        except ValueError:
            return jsonify({"error": "Invalid latitude, longitude, or radius"}), 400

        # Construct Wikipedia API URL
        base_url = "https://en.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "format": "json",
            "list": "geosearch",
            "gscoord": f"{lat}|{lon}",
            "gsradius": min(radius, 10000),  # Cap radius at 10km as per API limits
            "gslimit": 50
        }
        url = f"{base_url}?{urlencode(params)}"

        # Log API request URL
        app.logger.debug(f"Requesting URL: {url}")

        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for non-200 status codes
        data = response.json()

        # Log API response
        app.logger.debug(f"API response: {data}")

        landmarks = data['query']['geosearch']
        return jsonify(landmarks)
    except requests.RequestException as e:
        app.logger.error(f"Request error: {str(e)}")
        return jsonify({"error": "Failed to fetch landmarks from Wikipedia API"}), 500
    except KeyError as e:
        app.logger.error(f"KeyError in API response: {str(e)}")
        return jsonify({"error": "Unexpected API response format"}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
