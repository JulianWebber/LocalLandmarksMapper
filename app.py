import os
from flask import Flask, render_template, jsonify, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import requests
from urllib.parse import urlencode
import logging

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///landmarks.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Set up logging
logging.basicConfig(level=logging.DEBUG)

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    favorites = db.relationship('Favorite', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    landmark_id = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lon = db.Column(db.Float, nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user:
            flash('Username already exists', 'danger')
            return redirect(url_for('register'))
        
        new_user = User(username=username)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        flash('Registered successfully', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            flash('Logged in successfully', 'success')
            next_page = request.args.get('next')
            return redirect(next_page or url_for('index'))
        else:
            flash('Invalid username or password', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully', 'success')
    return redirect(url_for('index'))

@app.route('/get_landmarks')
def get_landmarks():
    try:
        lat = request.args.get('lat')
        lon = request.args.get('lon')
        radius = request.args.get('radius', 10000)

        app.logger.debug(f"Received parameters: lat={lat}, lon={lon}, radius={radius}")

        if not lat or not lon:
            return jsonify({"landmarks": []}), 400

        try:
            lat = float(lat)
            lon = float(lon)
            radius = float(radius)
        except ValueError:
            return jsonify({"landmarks": []}), 400

        base_url = "https://en.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "format": "json",
            "list": "geosearch",
            "gscoord": f"{lat}|{lon}",
            "gsradius": min(int(radius), 10000),
            "gslimit": 50
        }
        url = f"{base_url}?{urlencode(params)}"

        app.logger.debug(f"Requesting URL: {url}")

        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        app.logger.debug(f"API response: {data}")

        landmarks = data['query']['geosearch']
        return jsonify({'landmarks': landmarks})
    except requests.RequestException as e:
        app.logger.error(f"Request error: {str(e)}")
        return jsonify({"landmarks": []}), 500
    except KeyError as e:
        app.logger.error(f"KeyError in API response: {str(e)}")
        return jsonify({"landmarks": []}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"landmarks": []}), 500

@app.route('/add_favorite', methods=['POST'])
@login_required
def add_favorite():
    data = request.json
    new_favorite = Favorite(
        user_id=current_user.id,
        landmark_id=data['pageid'],
        title=data['title'],
        lat=data['lat'],
        lon=data['lon']
    )
    db.session.add(new_favorite)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/remove_favorite', methods=['POST'])
@login_required
def remove_favorite():
    data = request.json
    favorite = Favorite.query.filter_by(user_id=current_user.id, landmark_id=data['pageid']).first()
    if favorite:
        db.session.delete(favorite)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 404

@app.route('/get_favorites')
@login_required
def get_favorites():
    favorites = Favorite.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'pageid': f.landmark_id,
        'title': f.title,
        'lat': f.lat,
        'lon': f.lon
    } for f in favorites])

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000)
