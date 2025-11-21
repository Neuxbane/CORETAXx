import React, { useState, useEffect } from 'react';
import { Plus, Car, Home, Edit2, Trash2, Search, Filter, MapPin, FileText, Image } from 'lucide-react';
import { AssetForm } from './AssetForm';
import { TransferOwnershipModal } from './TransferOwnershipModal';
import { ImageSlider } from '../ImageSlider';

interface AssetManagementProps {
  user: any;
}

export function AssetManagement({ user }: AssetManagementProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAsset, setTransferAsset] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vehicle' | 'property'>('all');

  useEffect(() => {
    loadAssets();
  }, [user.id]);

  useEffect(() => {
    filterAssets();
  }, [assets, searchTerm, filterType]);

  const loadAssets = () => {
    const allAssets = JSON.parse(localStorage.getItem('assets') || '[]');
    const userAssets = allAssets.filter((a: any) => a.userId === user.id);
    setAssets(userAssets);
  };

  const filterAssets = () => {
    let filtered = [...assets];

    if (filterType !== 'all') {
      filtered = filtered.filter((a) => a.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAssets(filtered);
  };

  const handleDelete = (assetId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus aset ini?')) {
      const allAssets = JSON.parse(localStorage.getItem('assets') || '[]');
      const updatedAssets = allAssets.filter((a: any) => a.id !== assetId);
      localStorage.setItem('assets', JSON.stringify(updatedAssets));
      
      // Also delete related taxes
      const allTaxes = JSON.parse(localStorage.getItem('taxes') || '[]');
      const updatedTaxes = allTaxes.filter((t: any) => t.assetId !== assetId);
      localStorage.setItem('taxes', JSON.stringify(updatedTaxes));
      
      loadAssets();
    }
  };

  const handleEdit = (asset: any) => {
    setEditingAsset(asset);
    setShowForm(true);
  };

  const handleTransfer = (asset: any) => {
    setTransferAsset(asset);
    setShowTransferModal(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAsset(null);
    loadAssets();
  };

  const handleTransferComplete = () => {
    setShowTransferModal(false);
    setTransferAsset(null);
    loadAssets();
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
    return <span className={`px-3 py-1 rounded-full text-white ${badge.color}`}>{badge.label}</span>;
  };

  const getAssetIcon = (assetKind: string) => {
    if (assetKind === 'Kendaraan') return <Car className="w-6 h-6 text-blue-600" />;
    if (assetKind === 'Bangunan' || assetKind === 'Tanah') return <Home className="w-6 h-6 text-blue-600" />;
    return <Car className="w-6 h-6 text-blue-600" />;
  };

  if (showForm) {
    return (
      <AssetForm
        user={user}
        asset={editingAsset}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Data Kepemilikan</h1>
          <p className="text-gray-600">Kelola aset kendaraan dan properti Anda</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Tambah Aset
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari aset..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Jenis</option>
              <option value="vehicle">Kendaraan</option>
              <option value="property">Properti</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assets List */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {searchTerm || filterType !== 'all'
              ? 'Tidak ada aset yang sesuai dengan filter'
              : 'Belum ada aset yang terdaftar'}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Tambah Aset Pertama
          </button>
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
                  {getAssetIcon(asset.assetKind)}
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
                  alt={asset.assetName || asset.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              ) : null}

              <div className="mb-2">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                  {asset.assetKind}
                </span>
              </div>

              <h3 className="text-gray-900 mb-2">{asset.assetName || asset.name}</h3>
              <p className="text-gray-600 mb-1">
                {asset.registrationNumber}
              </p>
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

              <p className="text-gray-500 mb-2">
                Diperoleh: {formatDate(asset.acquisitionDate)}
              </p>

              {(asset.assetKind === 'Tanah' || asset.assetKind === 'Bangunan') && asset.latitude && asset.longitude && (
                <div className="flex items-center gap-1 text-gray-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {asset.latitude.toFixed(6)}, {asset.longitude.toFixed(6)}
                  </span>
                </div>
              )}

              {/* Attachments and Photos indicators */}
              {(asset.attachments?.length > 0 || asset.photos?.length > 0) && (
                <div className="flex items-center gap-3 text-gray-600 mb-2">
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

              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => handleEdit(asset)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleTransfer(asset)}
                  className="flex-1 px-3 py-2 border border-blue-600 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                >
                  Transfer
                </button>
                <button
                  onClick={() => handleDelete(asset.id)}
                  className="px-3 py-2 border border-red-600 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showTransferModal && transferAsset && (
        <TransferOwnershipModal
          asset={transferAsset}
          onClose={() => setShowTransferModal(false)}
          onComplete={handleTransferComplete}
        />
      )}
    </div>
  );
}