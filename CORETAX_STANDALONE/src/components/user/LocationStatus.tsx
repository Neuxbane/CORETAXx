import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getCurrentLocation } from '../../utils/geolocation';

interface LocationStatusProps {
  userId: string;
}

export function LocationStatus({ userId }: LocationStatusProps) {
  const [status, setStatus] = useState<'checking' | 'enabled' | 'disabled'>('checking');
  const [lastLocation, setLastLocation] = useState<any>(null);

  useEffect(() => {
    checkLocationStatus();
  }, []);

  const checkLocationStatus = async () => {
    try {
      const location = await getCurrentLocation();
      setStatus('enabled');
      setLastLocation(location);
    } catch (err) {
      setStatus('disabled');
    }
  };

  const requestLocation = async () => {
    setStatus('checking');
    await checkLocationStatus();
  };

  if (status === 'checking') {
    return (
      <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3 text-sm">
        <AlertTriangle className="w-5 h-5 text-gray-400 animate-pulse" />
        <span className="text-gray-600">Memeriksa status lokasi...</span>
      </div>
    );
  }

  if (status === 'disabled') {
    return (
      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-yellow-800 mb-1">
              <strong>Tracking lokasi nonaktif</strong>
            </p>
            <p className="text-xs text-yellow-700 mb-2">
              Aktifkan lokasi untuk fitur tracking yang lebih baik.
            </p>
            <button
              onClick={requestLocation}
              className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
            >
              Aktifkan Lokasi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-green-800 mb-1">
            <strong>Tracking lokasi aktif</strong>
          </p>
          {lastLocation && (
            <p className="text-xs text-green-700">
              Lokasi: {lastLocation.latitude.toFixed(4)}, {lastLocation.longitude.toFixed(4)}
              <br />
              Akurasi: {lastLocation.accuracy.toFixed(0)}m
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
