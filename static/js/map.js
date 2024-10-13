let map;
let markers = [];
let favoriteMarkers = [];

function initMap() {
    console.log('Initializing map');
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.on('moveend', function() {
        console.log('Map moved or zoomed');
        if (map.getZoom() > 10) {
            console.log('Zoom level sufficient, fetching landmarks');
            fetchLandmarks();
        } else {
            console.log('Zoom level too low, not fetching landmarks');
        }
    });
    
    if ("geolocation" in navigator) {
        console.log('Geolocation available, requesting position');
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            console.log('Geolocation set:', lat, lon);
            map.setView([lat, lon], 13);
        }, function(error) {
            console.error('Geolocation error:', error);
        });
    } else {
        console.log('Geolocation not available');
    }

    if (isAuthenticated) {
        document.getElementById('showFavorites').addEventListener('click', showFavorites);
    }
}

function fetchLandmarks() {
    const bounds = map.getBounds();
    const center = bounds.getCenter();
    const radius = bounds.getNorthEast().distanceTo(center);

    console.log('Fetching landmarks:', center.lat, center.lng, radius);

    fetch(`/get_landmarks?lat=${center.lat}&lon=${center.lng}&radius=${radius}`)
        .then(response => {
            console.log('API Response:', response);
            return response.json();
        })
        .then(data => {
            console.log('Landmarks data:', data);
            clearMarkers();
            if (Array.isArray(data.landmarks)) {
                data.landmarks.forEach(landmark => {
                    addMarker(landmark);
                });
            } else {
                console.error('Invalid landmarks data format:', data);
            }
        })
        .catch(error => console.error('Error fetching landmarks:', error));
}

function clearMarkers() {
    console.log('Clearing markers');
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

function addMarker(landmark) {
    console.log('Adding marker:', landmark);
    const marker = L.marker([landmark.lat, landmark.lon]).addTo(map);
    const popupContent = `
        <b>${landmark.title}</b><br>
        ${landmark.dist.toFixed(2)}m
        ${isAuthenticated ? `<br><button onclick="toggleFavorite(${landmark.pageid}, '${landmark.title}', ${landmark.lat}, ${landmark.lon})">Add to Favorites</button>` : ''}
    `;
    marker.bindPopup(popupContent);
    markers.push(marker);
}

function toggleFavorite(pageid, title, lat, lon) {
    fetch('/add_favorite', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageid, title, lat, lon }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Landmark added to favorites');
            // Update the popup content to show it's a favorite
            const marker = markers.find(m => m.getLatLng().lat === lat && m.getLatLng().lng === lon);
            if (marker) {
                const popupContent = `
                    <b>${title}</b><br>
                    Added to Favorites
                    <br><button onclick="removeFavorite(${pageid}, '${title}', ${lat}, ${lon})">Remove from Favorites</button>
                `;
                marker.setPopupContent(popupContent);
            }
        }
    })
    .catch(error => console.error('Error adding favorite:', error));
}

function removeFavorite(pageid, title, lat, lon) {
    fetch('/remove_favorite', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageid }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Landmark removed from favorites');
            // Update the popup content to show it's not a favorite anymore
            const marker = markers.find(m => m.getLatLng().lat === lat && m.getLatLng().lng === lon);
            if (marker) {
                const popupContent = `
                    <b>${title}</b><br>
                    ${marker.getPopup().getContent().split('<br>')[1]}
                    <br><button onclick="toggleFavorite(${pageid}, '${title}', ${lat}, ${lon})">Add to Favorites</button>
                `;
                marker.setPopupContent(popupContent);
            }
        }
    })
    .catch(error => console.error('Error removing favorite:', error));
}

function showFavorites() {
    fetch('/get_favorites')
        .then(response => response.json())
        .then(favorites => {
            clearMarkers();
            favoriteMarkers = favorites.map(favorite => {
                const marker = L.marker([favorite.lat, favorite.lon]).addTo(map);
                const popupContent = `
                    <b>${favorite.title}</b><br>
                    Favorite
                    <br><button onclick="removeFavorite(${favorite.pageid}, '${favorite.title}', ${favorite.lat}, ${favorite.lon})">Remove from Favorites</button>
                `;
                marker.bindPopup(popupContent);
                return marker;
            });
            if (favorites.length > 0) {
                const bounds = L.latLngBounds(favorites.map(f => [f.lat, f.lon]));
                map.fitBounds(bounds);
            }
        })
        .catch(error => console.error('Error fetching favorites:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing map');
    initMap();
});
console.log('map.js loaded');
