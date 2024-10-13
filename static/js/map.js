let map;
let markers = [];

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
            data.forEach(landmark => {
                addMarker(landmark);
            });
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
    marker.bindPopup(`<b>${landmark.title}</b><br>${landmark.dist.toFixed(2)}m`);
    markers.push(marker);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing map');
    initMap();
});
console.log('map.js loaded');
