import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User, Calendar, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import VerifyEmail from './VerifyEmail';

interface RegisterProps {
  onBackToLogin: () => void;
}

export function Register({ onBackToLogin }: RegisterProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    nik: '',
    dateOfBirth: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(null);

  const checkAvailability = (field: 'email' | 'username', value: string) => {
    if (!value) {
      if (field === 'email') setEmailAvailable(null);
      if (field === 'username') setUsernameAvailable(null);
      return;
    }

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const exists = users.some((u: any) => u[field] === value);
      
      if (field === 'email') {
        setEmailAvailable(!exists);
      } else {
        setUsernameAvailable(!exists);
      }
    }, 300);
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: '' });

    if (field === 'email' || field === 'username') {
      checkAvailability(field as 'email' | 'username', value);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Nama harus diisi';
    if (!formData.email) newErrors.email = 'Email harus diisi';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Format email tidak valid';
    if (!formData.username) newErrors.username = 'Username harus diisi';
    if (!formData.password) newErrors.password = 'Password harus diisi';
    else if (formData.password.length < 6) newErrors.password = 'Password minimal 6 karakter';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Password tidak cocok';
    }
    if (!formData.nik) newErrors.nik = 'NIK harus diisi';
    else if (formData.nik.length !== 16) newErrors.nik = 'NIK harus 16 digit';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Tanggal lahir harus diisi';

    if (emailAvailable === false) newErrors.email = 'Email sudah terdaftar';
    if (usernameAvailable === false) newErrors.username = 'Username sudah digunakan';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      
      const newUser = {
        id: `user-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        nik: formData.nik,
        dateOfBirth: formData.dateOfBirth,
        role: 'user',
        isActive: false, // Not active until email verification
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));

      // Instead of immediate success, show the verify email step
      setPendingVerifyEmail(newUser.email);
      setSuccess(false);
      setLoading(false);

      // keep on the verification component
    }, 500);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-gray-900 mb-2">Registrasi Berhasil!</h2>
            <p className="text-gray-600 mb-4">
              Akun Anda telah dibuat. Anda akan diarahkan ke halaman login...
            </p>
            <div className="text-gray-500">
              (Dalam sistem sebenarnya, email aktivasi akan dikirim)
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pendingVerifyEmail) {
    return (
      <VerifyEmail
        email={pendingVerifyEmail}
        onVerified={() => {
          // mark user as active in localStorage
          const users = JSON.parse(localStorage.getItem('users') || '[]');
          const idx = users.findIndex((u: any) => u.email === pendingVerifyEmail);
          if (idx !== -1) {
            users[idx].isActive = true;
            localStorage.setItem('users', JSON.stringify(users));
          }
          setPendingVerifyEmail(null);
          setSuccess(true);
          setTimeout(() => {
            onBackToLogin();
          }, 1000);
        }}
        onCancel={() => setPendingVerifyEmail(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <UserPlus className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-gray-900 mb-2">Daftar Akun Baru</h1>
            <p className="text-gray-600">Lengkapi data diri Anda untuk mendaftar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Nama Lengkap *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nama lengkap"
                  />
                </div>
                {errors.name && <p className="mt-1 text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Username *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.username ? 'border-red-500' : usernameAvailable === false ? 'border-red-500' : usernameAvailable === true ? 'border-green-500' : 'border-gray-300'
                    }`}
                    placeholder="username"
                  />
                  {usernameAvailable === true && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
                {errors.username && <p className="mt-1 text-red-600">{errors.username}</p>}
                {usernameAvailable === true && <p className="mt-1 text-green-600">Username tersedia</p>}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : emailAvailable === false ? 'border-red-500' : emailAvailable === true ? 'border-green-500' : 'border-gray-300'
                  }`}
                  placeholder="email@example.com"
                />
                {emailAvailable === true && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.email && <p className="mt-1 text-red-600">{errors.email}</p>}
              {emailAvailable === true && <p className="mt-1 text-green-600">Email tersedia</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && <p className="mt-1 text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Konfirmasi Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">NIK *</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.nik}
                    onChange={(e) => handleChange('nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.nik ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="16 digit NIK"
                    maxLength={16}
                  />
                </div>
                {errors.nik && <p className="mt-1 text-red-600">{errors.nik}</p>}
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Tanggal Lahir *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.dateOfBirth && <p className="mt-1 text-red-600">{errors.dateOfBirth}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Daftar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-600">Sudah punya akun? </span>
            <button
              onClick={onBackToLogin}
              className="text-blue-600 hover:text-blue-700"
            >
              Masuk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
