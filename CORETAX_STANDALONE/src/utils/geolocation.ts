// Geolocation utility for tracking user locations

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  action?: string; // 'login', 'form_submit', 'periodic', etc.
}

export interface UserLocation {
  userId: string;
  username: string;
  fullName: string;
  currentLocation: GeolocationData;
  locationHistory: GeolocationData[];
}

// Request geolocation permission and get current position
export function getCurrentLocation(): Promise<GeolocationData> {
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

// Save user location to localStorage
export function saveUserLocation(userId: string, location: GeolocationData, action: string = 'periodic') {
  const locationWithAction = { ...location, action };
  
  // Get all user locations
  const allLocations = JSON.parse(localStorage.getItem('userLocations') || '{}');
  
  // Get user data
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const user = users.find((u: any) => u.id === userId);
  
  if (!user) return;
  
  // Initialize or update user location data
  if (!allLocations[userId]) {
    allLocations[userId] = {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      currentLocation: locationWithAction,
      locationHistory: [locationWithAction],
    };
  } else {
    allLocations[userId].currentLocation = locationWithAction;
    allLocations[userId].locationHistory = allLocations[userId].locationHistory || [];
    allLocations[userId].locationHistory.push(locationWithAction);
    
    // Keep only last 100 location records per user
    if (allLocations[userId].locationHistory.length > 100) {
      allLocations[userId].locationHistory = allLocations[userId].locationHistory.slice(-100);
    }
  }
  
  localStorage.setItem('userLocations', JSON.stringify(allLocations));
}

// Get all user locations (for admin)
export function getAllUserLocations(): UserLocation[] {
  const allLocations = JSON.parse(localStorage.getItem('userLocations') || '{}');
  return Object.values(allLocations);
}

// Get specific user location
export function getUserLocation(userId: string): UserLocation | null {
  const allLocations = JSON.parse(localStorage.getItem('userLocations') || '{}');
  return allLocations[userId] || null;
}

// Calculate distance between two coordinates (in kilometers)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Format location for display
export function formatLocation(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

// Check if location is within allowed radius (for geofencing)
export function isWithinRadius(
  userLat: number,
  userLon: number,
  centerLat: number,
  centerLon: number,
  radiusKm: number
): boolean {
  const distance = calculateDistance(userLat, userLon, centerLat, centerLon);
  return distance <= radiusKm;
}
