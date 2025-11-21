import React, { useState, useEffect } from 'react';
import { Search, Car, Home, MapPin, FileText, Image } from 'lucide-react';
import { ImageSlider } from '../ImageSlider';

export function AdminAssetManagement() {
  const [assets, setAssets] = useState<any[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAssets();
  }, [assets, searchTerm]);

  const loadData = () => {
    const allAssets = JSON.parse(localStorage.getItem('assets') || '[]');
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    setAssets(allAssets);
    setUsers(allUsers);
  };

  const filterAssets = () => {
    if (searchTerm) {
      const filtered = assets.filter(
        (a) =>
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssets(filtered);
    } else {
      setFilteredAssets(assets);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getAssetTypeBadge = (assetType: string) => {
    const badges = {
      'lancar': { color: 'bg-green-500', label: 'Aset Lancar' },
      'semi-lancar': { color: 'bg-yellow-500', label: 'Aset Semi Lancar' },
      'tidak-lancar': { color: 'bg-blue-500', label: 'Aset Tidak Lancar' },
    };
    const badge = badges[assetType as keyof typeof badges] || badges['tidak-lancar'];
    return <span className={`px-3 py-1 rounded-full text-white text-sm ${badge.color}`}>{badge.label}</span>;
  };

  const getAssetIcon = (assetKind: string) => {
    if (assetKind === 'Kendaraan') return <Car className="w-6 h-6 text-blue-600" />;
    if (assetKind === 'Bangunan' || assetKind === 'Tanah') return <Home className="w-6 h-6 text-blue-600" />;
    return <Car className="w-6 h-6 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Manajemen Aset</h1>
        <p className="text-gray-600">Kelola semua aset yang terdaftar</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari aset..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Tidak ada aset yang ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  {getAssetIcon(asset.assetKind || 'Kendaraan')}
                </div>
                {asset.assetType && getAssetTypeBadge(asset.assetType)}
              </div>

              {/* Image Slider for photos or old single photo */}
              {asset.photos && asset.photos.length > 0 ? (
                <div className="mb-3">
                  <ImageSlider 
                    images={asset.photos} 
                    showNavigation={true}
                    className="h-32"
                  />
                </div>
              ) : asset.photo ? (
                <img
                  src={asset.photo}
                  alt={asset.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              ) : null}

              {asset.assetKind && (
                <div className="mb-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {asset.assetKind}
                  </span>
                </div>
              )}

              <h3 className="text-gray-900 mb-2">{asset.assetName || asset.name}</h3>
              <p className="text-gray-600 mb-1">{asset.registrationNumber}</p>
              <p className="text-gray-900 mb-2">{formatCurrency(asset.acquisitionValue || asset.value || 0)}</p>

              {/* Tax information */}
              {asset.taxAmount > 0 && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">Pajak ({asset.taxRate?.toFixed(2) || 0}%):</span>
                    <span className="text-blue-600">{formatCurrency(asset.taxAmount)}/tahun</span>
                  </div>
                </div>
              )}

              {/* Kendaraan details */}
              {asset.assetKind === 'Kendaraan' && (
                <div className="space-y-1 mb-2 text-gray-600">
                  {asset.vehicleType && <p>Jenis: {asset.vehicleType}</p>}
                  {asset.engineType && <p>Mesin: {asset.engineType}</p>}
                  {asset.fuelType && <p>BBM: {asset.fuelType}</p>}
                </div>
              )}

              {/* Bangunan details */}
              {asset.assetKind === 'Bangunan' && (
                <div className="space-y-1 mb-2 text-gray-600">
                  {asset.buildingArea && <p>Luas Bangunan: {asset.buildingArea} m²</p>}
                  {asset.landArea && <p>Luas Tanah: {asset.landArea} m²</p>}
                </div>
              )}

              <div className="pt-3 border-t border-gray-200 space-y-2">
                <p className="text-gray-600">
                  Pemilik: <span className="text-gray-900">{getUserName(asset.userId)}</span>
                </p>
                <p className="text-gray-500">
                  Diperoleh: {formatDate(asset.acquisitionDate)}
                </p>
                {(asset.assetKind === 'Tanah' || asset.assetKind === 'Bangunan') && asset.latitude && asset.longitude && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {asset.latitude.toFixed(6)}, {asset.longitude.toFixed(6)}
                    </span>
                  </div>
                )}
                {(asset.attachments?.length > 0 || asset.photos?.length > 0) && (
                  <div className="flex items-center gap-3 text-gray-600">
                    {asset.attachments?.length > 0 && (
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{asset.attachments.length} Lampiran</span>
                      </div>
                    )}
                    {asset.photos?.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Image className="w-4 h-4" />
                        <span className="text-sm">{asset.photos.length} Foto</span>
                      </div>
                    )}
                  </div>
                )}
                {asset.transferHistory && asset.transferHistory.length > 0 && (
                  <p className="text-orange-600">
                    Transfer: {asset.transferHistory.length}x
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">Total Aset</p>
          <p className="text-gray-900">{assets.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">Kendaraan</p>
          <p className="text-gray-900">
            {assets.filter((a) => a.type === 'vehicle').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">Properti</p>
          <p className="text-gray-900">
            {assets.filter((a) => a.type === 'property').length}
          </p>
        </div>
      </div>
    </div>
  );
}