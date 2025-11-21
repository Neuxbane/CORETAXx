import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle } from 'lucide-react';

interface TransferOwnershipModalProps {
  asset: any;
  onClose: () => void;
  onComplete: () => void;
}

export function TransferOwnershipModal({ asset, onClose, onComplete }: TransferOwnershipModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    // Filter out current owner and admin users
    const availableUsers = allUsers.filter(
      (u: any) => u.id !== asset.userId && u.role === 'user' && u.isActive
    );
    setUsers(availableUsers);
    setFilteredUsers(availableUsers);
  }, [asset.userId]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.nik.includes(searchTerm)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const handleTransfer = () => {
    if (!selectedUser) return;

    setLoading(true);

    setTimeout(() => {
      // Update asset ownership
      const allAssets = JSON.parse(localStorage.getItem('assets') || '[]');
      const assetIndex = allAssets.findIndex((a: any) => a.id === asset.id);
      
      if (assetIndex !== -1) {
        allAssets[assetIndex].userId = selectedUser.id;
        allAssets[assetIndex].transferHistory = allAssets[assetIndex].transferHistory || [];
        allAssets[assetIndex].transferHistory.push({
          fromUserId: asset.userId,
          toUserId: selectedUser.id,
          date: new Date().toISOString(),
        });
        localStorage.setItem('assets', JSON.stringify(allAssets));

        // Update related taxes
        const allTaxes = JSON.parse(localStorage.getItem('taxes') || '[]');
        const updatedTaxes = allTaxes.map((t: any) => {
          if (t.assetId === asset.id) {
            return { ...t, userId: selectedUser.id };
          }
          return t;
        });
        localStorage.setItem('taxes', JSON.stringify(updatedTaxes));

        setSuccess(true);
        setTimeout(() => {
          onComplete();
        }, 2000);
      }

      setLoading(false);
    }, 500);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-gray-900 mb-2">Transfer Berhasil!</h2>
          <p className="text-gray-600">
            Kepemilikan aset telah berhasil dipindahkan ke {selectedUser.name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900">Transfer Kepemilikan</h2>
            <p className="text-gray-600">{asset.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama, email, atau NIK..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm
                  ? 'Tidak ada pengguna yang sesuai dengan pencarian'
                  : 'Tidak ada pengguna lain yang tersedia'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedUser?.id === user.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="user"
                    checked={selectedUser?.id === user.id}
                    onChange={() => setSelectedUser(user)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900">{user.name}</p>
                      <p className="text-gray-600">{user.email}</p>
                      <p className="text-gray-500">NIK: {user.nik}</p>
                    </div>
                    {selectedUser?.id === user.id && (
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleTransfer}
            disabled={!selectedUser || loading}
            className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Transfer Kepemilikan'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
