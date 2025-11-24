import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, CreditCard, Camera, Save, CheckCircle } from 'lucide-react';

interface ProfileProps {
  user: any;
  onUserUpdate: (user: any) => void;
}

export function Profile({ user, onUserUpdate }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
  });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
    });
  }, [user]);

  const handleSave = () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex((u: any) => u.id === user.id);

    if (userIndex !== -1) {
      const updatedUser = { ...users[userIndex], ...formData };
      users[userIndex] = updatedUser;
      localStorage.setItem('users', JSON.stringify(users));
      onUserUpdate(updatedUser);
      
      setSuccess(true);
      setIsEditing(false);
      
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex((u: any) => u.id === user.id);
        
        if (userIndex !== -1) {
          const updatedUser = {
            ...users[userIndex],
            profilePhoto: reader.result as string,
          };
          users[userIndex] = updatedUser;
          localStorage.setItem('users', JSON.stringify(users));
          onUserUpdate(updatedUser);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Data Diri</h1>
        <p className="text-gray-600">Kelola informasi profil Anda</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-700">Profil berhasil diperbarui!</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Photo Section */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900 mb-4">Foto Profil</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {user.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-blue-600" />
                </div>
              )}
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-gray-900">{user.name}</p>
              <p className="text-gray-600">Klik ikon kamera untuk mengganti foto</p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-gray-900">Informasi Pribadi</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Edit Profil
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-gray-700 mb-2">
                <User className="w-4 h-4" />
                Nama Lengkap
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{user.name}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-gray-700 mb-2">
                <CreditCard className="w-4 h-4" />
                NIK
              </label>
              <p className="text-gray-900">{user.nik}</p>
              <p className="text-gray-500">NIK tidak dapat diubah</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-gray-700 mb-2">
                <Calendar className="w-4 h-4" />
                Tanggal Lahir
              </label>
              <p className="text-gray-900">
                {new Date(user.dateOfBirth).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-gray-700 mb-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{user.email}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-gray-700 mb-2">
                <Phone className="w-4 h-4" />
                Nomor Telepon
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nomor telepon"
                />
              ) : (
                <p className="text-gray-900">{user.phone || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-gray-700 mb-2">
                <MapPin className="w-4 h-4" />
                Alamat
              </label>
              {isEditing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Alamat lengkap"
                />
              ) : (
                <p className="text-gray-900">{user.address || '-'}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Simpan Perubahan
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: user.name,
                    email: user.email,
                    phone: user.phone || '',
                    address: user.address || '',
                  });
                }}
                className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
