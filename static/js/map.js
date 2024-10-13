let map;
let markers = [];

function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.on('moveend', fetchLandmarks);
    
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            map.setView([lat, lon], 13);
        });
    }
}

function fetchLandmarks() {
    const bounds = map.getBounds();
    const center = bounds.getCenter();
    const radius = bounds.getNorthEast().distanceTo(center);

    fetch(`/get_landmarks?lat=${center.lat}&lon=${center.lng}&radius=${radius}`)
        .then(response => response.json())
        .then(data => {
            clearMarkers();
            data.forEach(landmark => {
                addMarker(landmark);
            });
        })
        .catch(error => console.error('Error:', error));
}

function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

function addMarker(landmark) {
    const marker = L.marker([landmark.lat, landmark.lon]).addTo(map);
    marker.bindPopup(`<b>${landmark.title}</b><br>${landmark.dist.toFixed(2)}m`);
    markers.push(marker);
}

document.addEventListener('DOMContentLoaded', initMap);
