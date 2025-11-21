import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Users, Clock, Navigation, Activity, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { getAllUserLocations, formatLocation } from '../../utils/geolocation';

export function UserLocationMap() {
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [mapCenter, setMapCenter] = useState({ lat: -6.2088, lng: 106.8456 }); // Jakarta
  const [zoom, setZoom] = useState(12);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLocations();
    // Refresh every 30 seconds
    const interval = setInterval(loadLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLocations = () => {
    const locations = getAllUserLocations();
    setUserLocations(locations);
    
    // Auto-center map on first user if available
    if (locations.length > 0 && mapCenter.lat === -6.2088) {
      const firstLoc = locations[0].currentLocation;
      setMapCenter({ lat: firstLoc.latitude, lng: firstLoc.longitude });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: 'Login',
      form_submit: 'Submit Form',
      periodic: 'Periodic Update',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      login: 'bg-green-100 text-green-700',
      form_submit: 'bg-blue-100 text-blue-700',
      periodic: 'bg-gray-100 text-gray-700',
    };
    return colors[action] || 'bg-gray-100 text-gray-700';
  };

  const filteredLocations = userLocations.filter((loc) => {
    if (filter === 'all') return true;
    return loc.role === filter;
  });

  const handleMarkerClick = (loc: any) => {
    setSelectedUser(loc);
    setMapCenter({ lat: loc.currentLocation.latitude, lng: loc.currentLocation.longitude });
    setZoom(15);
  };

  // Convert lat/lng to pixel position on the map
  const getMarkerPosition = (lat: number, lng: number) => {
    // Simple mercator projection
    const mapWidth = mapRef.current?.clientWidth || 800;
    const mapHeight = mapRef.current?.clientHeight || 600;
    
    // Calculate relative position from center
    const latDiff = (lat - mapCenter.lat) * zoom * 100;
    const lngDiff = (lng - mapCenter.lng) * zoom * 100;
    
    const x = mapWidth / 2 + lngDiff;
    const y = mapHeight / 2 - latDiff;
    
    return { x, y };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Peta Lokasi Pengguna</h1>
        <p className="text-gray-600">Tracking lokasi real-time pengguna sistem PWD</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600">Total User Tracked</p>
              <p className="text-gray-900">{userLocations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-600">Active Users</p>
              <p className="text-gray-900">
                {
                  userLocations.filter((loc) => {
                    const diffMs = new Date().getTime() - new Date(loc.currentLocation.timestamp).getTime();
                    return diffMs < 3600000; // Active in last hour
                  }).length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-600">Total Locations</p>
              <p className="text-gray-900">
                {userLocations.reduce((sum, loc) => sum + (loc.locationHistory?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">Daftar Pengguna</h3>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilter('user')}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                  filter === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                User
              </button>
              <button
                onClick={() => setFilter('admin')}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                  filter === 'admin'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Admin
              </button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredLocations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Belum ada data lokasi</p>
                </div>
              ) : (
                filteredLocations.map((loc) => (
                  <button
                    key={loc.userId}
                    onClick={() => handleMarkerClick(loc)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedUser?.userId === loc.userId
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-gray-900">{loc.fullName}</p>
                        <p className="text-xs text-gray-500">{loc.username}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          loc.role === 'admin'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {loc.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                      <Navigation className="w-3 h-3" />
                      <span>{formatLocation(loc.currentLocation.latitude, loc.currentLocation.longitude)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(loc.currentLocation.timestamp)}</span>
                    </div>
                    {loc.currentLocation.action && (
                      <div className="mt-2">
                        <span className={`px-2 py-1 rounded text-xs ${getActionColor(loc.currentLocation.action)}`}>
                          {getActionLabel(loc.currentLocation.action)}
                        </span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="relative h-[700px] bg-gray-100" ref={mapRef}>
              {/* Map Background - Using OpenStreetMap tiles via img */}
              <div className="absolute inset-0 overflow-hidden">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.1},${mapCenter.lat - 0.1},${mapCenter.lng + 0.1},${mapCenter.lat + 0.1}&layer=mapnik&marker=${mapCenter.lat},${mapCenter.lng}`}
                  className="w-full h-full border-0"
                  title="Map"
                />
              </div>

              {/* Map Controls */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button
                  onClick={() => setZoom(Math.min(zoom + 1, 18))}
                  className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={() => setZoom(Math.max(zoom - 1, 1))}
                  className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={() => {
                    if (filteredLocations.length > 0) {
                      const firstLoc = filteredLocations[0].currentLocation;
                      setMapCenter({ lat: firstLoc.latitude, lng: firstLoc.longitude });
                      setZoom(12);
                    }
                  }}
                  className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                  title="Fit All"
                >
                  <Maximize2 className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Info overlay */}
              <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md p-3 text-sm">
                <p className="text-gray-600">Center: {formatLocation(mapCenter.lat, mapCenter.lng)}</p>
                <p className="text-gray-600">Zoom: {zoom}</p>
                <p className="text-gray-600">Markers: {filteredLocations.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected User Details */}
      {selectedUser && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Detail Lokasi: {selectedUser.fullName}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-gray-600 mb-2">Informasi User</p>
              <div className="space-y-1 text-sm">
                <p><strong>Username:</strong> {selectedUser.username}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Role:</strong> <span className={`px-2 py-1 rounded ${selectedUser.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{selectedUser.role}</span></p>
              </div>
            </div>
            
            <div>
              <p className="text-gray-600 mb-2">Lokasi Terakhir</p>
              <div className="space-y-1 text-sm">
                <p><strong>Koordinat:</strong> {formatLocation(selectedUser.currentLocation.latitude, selectedUser.currentLocation.longitude)}</p>
                <p><strong>Akurasi:</strong> {selectedUser.currentLocation.accuracy.toFixed(0)} meter</p>
                <p><strong>Waktu:</strong> {formatTimestamp(selectedUser.currentLocation.timestamp)}</p>
                {selectedUser.currentLocation.action && (
                  <p><strong>Aksi:</strong> {getActionLabel(selectedUser.currentLocation.action)}</p>
                )}
              </div>
            </div>
          </div>

          {selectedUser.locationHistory && selectedUser.locationHistory.length > 0 && (
            <div>
              <p className="text-gray-600 mb-3">Riwayat Lokasi ({selectedUser.locationHistory.length})</p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {[...selectedUser.locationHistory].reverse().map((histLoc: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-gray-900">{formatLocation(histLoc.latitude, histLoc.longitude)}</span>
                      {histLoc.action && (
                        <span className={`px-2 py-1 rounded text-xs ${getActionColor(histLoc.action)}`}>
                          {getActionLabel(histLoc.action)}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500">{formatTimestamp(histLoc.timestamp)}</p>
                    <p className="text-gray-500">Akurasi: {histLoc.accuracy.toFixed(0)}m</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
