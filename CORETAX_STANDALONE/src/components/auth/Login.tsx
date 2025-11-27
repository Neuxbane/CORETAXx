import React, { useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle, MapPin } from 'lucide-react';
import { getCurrentLocation, saveUserLocation } from '../../utils/geolocation';

interface LoginProps {
  onSuccess: (user: any) => void;
  onRegisterClick: () => void;
  onForgotPasswordClick: () => void;
}

export function Login({ onSuccess, onRegisterClick, onForgotPasswordClick }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationWarning, setLocationWarning] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLocationWarning('');
    setLoading(true);

    // Try to get location, but don't block login if it fails
    let location = null;
    try {
      location = await getCurrentLocation();
    } catch (err: any) {
      // Location access denied - continue without tracking
      setLocationWarning('Lokasi tidak dapat diakses. Login tetap dilanjutkan tanpa tracking lokasi.');
    }
    
    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(
        (u: any) =>
          (u.email === identifier || u.username === identifier) &&
          u.password === password
      );

      if (user) {
        if (!user.isActive) {
          setError('Akun Anda belum diaktivasi. Silakan cek email Anda.');
          setLoading(false);
          return;
        }
        
        // Save login location if available
        if (location) {
          saveUserLocation(user.id, location, 'login');
        }
        
        onSuccess(user);
      } else {
        setError('Email/Username atau Password salah');
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-gray-900 mb-2">CORETAX</h1>
            <p className="text-gray-600">Masuk ke akun Anda</p>
          </div>

          {/* Geolocation Notice */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Lokasi Diperlukan</p>
              <p className="text-blue-700">Sistem akan meminta akses lokasi Anda untuk keamanan dan tracking aktivitas.</p>
            </div>
          </div>

          {locationWarning && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <span className="text-yellow-700">{locationWarning}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">
                Email atau Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="text-blue-600 hover:text-blue-700"
              >
                Lupa Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-600">Belum punya akun? </span>
            <button
              onClick={onRegisterClick}
              className="text-blue-600 hover:text-blue-700"
            >
              Daftar Sekarang
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-500">
              Demo: admin / admin123
            </p>
          </div>
          {error === 'Akun Anda belum diaktivasi. Silakan cek email Anda.' && (
            <div className="mt-4 text-center">
              <button
                onClick={async () => {
                  setLoading(true);
                  setError('');
                  const users = JSON.parse(localStorage.getItem('users') || '[]');
                  const user = users.find((u: any) => u.email === identifier || u.username === identifier);
                  if (!user) {
                    setError('Akun tidak ditemukan');
                    setLoading(false);
                    return;
                  }
                  try {
                    const res = await fetch('/CORETAX/api/otp.php?action=send', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: user.email }),
                    });
                    if (res.ok) {
                      setError('Kode verifikasi telah dikirim ulang ke email Anda.');
                    } else {
                      const d = await res.json();
                      setError(d.error || 'Gagal mengirim ulang');
                    }
                  } catch (err) {
                    setError('Gagal mengirim ulang');
                  }
                  setLoading(false);
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                Kirim Ulang Kode Verifikasi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
