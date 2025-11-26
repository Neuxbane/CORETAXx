// Geolocation utilities (mirrors React version behavior)
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation tidak didukung oleh browser Anda'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
      },
      (error) => {
        let errorMessage = 'Gagal mendapatkan lokasi';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Izin akses lokasi ditolak. Mohon aktifkan lokasi di browser Anda.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informasi lokasi tidak tersedia';
            break;
          case error.TIMEOUT:
            errorMessage = 'Waktu permintaan lokasi habis';
            break;
          default:
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

function saveUserLocation(userId, location, action = 'periodic') {
  const locationWithAction = { ...location, action };
  const allLocations = storage.getUserLocations();
  const users = storage.getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return;

  if (!allLocations[userId]) {
    allLocations[userId] = {
      userId: user.id,
      username: user.username,
      fullName: user.fullName || user.name,
      email: user.email,
      role: user.role,
      currentLocation: locationWithAction,
      locationHistory: [locationWithAction],
    };
  } else {
    allLocations[userId].currentLocation = locationWithAction;
    const history = allLocations[userId].locationHistory || [];
    history.push(locationWithAction);
    allLocations[userId].locationHistory = history.slice(-100);
  }

  storage.setUserLocations(allLocations);
}

function getAllUserLocations() {
  const allLocations = storage.getUserLocations();
  return Object.values(allLocations);
}

function getUserLocation(userId) {
  const allLocations = storage.getUserLocations();
  return allLocations[userId] || null;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function formatLocation(lat, lon) {
  return lat.toFixed(6) + ', ' + lon.toFixed(6);
}

function isWithinRadius(userLat, userLon, centerLat, centerLon, radiusKm) {
  return calculateDistance(userLat, userLon, centerLat, centerLon) <= radiusKm;
}

window.geo = {
  getCurrentLocation,
  saveUserLocation,
  getAllUserLocations,
  getUserLocation,
  calculateDistance,
  formatLocation,
  isWithinRadius,
};
