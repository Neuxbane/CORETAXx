import React, { useState, useEffect } from 'react';
import { Receipt, Search, Filter, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { syncTaxRecordsWithAssets, getTaxRecordsWithAssetData } from '../../utils/taxSync';

interface TaxManagementProps {
  user: any;
}

export function TaxManagement({ user }: TaxManagementProps) {
  const [taxes, setTaxes] = useState<any[]>([]);
  const [filteredTaxes, setFilteredTaxes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [payingTax, setPayingTax] = useState<any>(null);

  useEffect(() => {
    loadTaxes();
  }, [user.id]);

  useEffect(() => {
    filterTaxes();
  }, [taxes, searchTerm, filterStatus]);

  const loadTaxes = () => {
    // Sync tax records with asset data first
    syncTaxRecordsWithAssets();
    
    const syncedTaxes = getTaxRecordsWithAssetData();
    const userTaxes = syncedTaxes.filter((t: any) => t.userId === user.id);
    setTaxes(userTaxes);
  };

  const filterTaxes = () => {
    let filtered = [...taxes];

    if (filterStatus !== 'all') {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.taxNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by due date
    filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    setFilteredTaxes(filtered);
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

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (tax: any) => {
    if (tax.status === 'paid') {
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full">
          <CheckCircle className="w-4 h-4" />
          Sudah Bayar
        </span>
      );
    }

    const daysLeft = getDaysUntilDue(tax.dueDate);
    if (daysLeft < 0) {
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full">
          <AlertCircle className="w-4 h-4" />
          Terlambat
        </span>
      );
    } else if (daysLeft <= 7) {
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
          <AlertCircle className="w-4 h-4" />
          Segera Jatuh Tempo
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
          Belum Bayar
        </span>
      );
    }
  };

  const handlePaymentComplete = () => {
    setPayingTax(null);
    loadTaxes();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Manajemen Pajak</h1>
        <p className="text-gray-600">Lihat dan bayar pajak aset Anda</p>
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
              placeholder="Cari pajak..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="unpaid">Belum Bayar</option>
              <option value="paid">Sudah Bayar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tax List */}
      {filteredTaxes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm || filterStatus !== 'all'
              ? 'Tidak ada pajak yang sesuai dengan filter'
              : 'Belum ada tagihan pajak'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700">Nama Aset</th>
                  <th className="px-6 py-3 text-left text-gray-700">No. Pajak</th>
                  <th className="px-6 py-3 text-left text-gray-700">Jumlah</th>
                  <th className="px-6 py-3 text-left text-gray-700">Jatuh Tempo</th>
                  <th className="px-6 py-3 text-left text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTaxes.map((tax) => {
                  const daysLeft = getDaysUntilDue(tax.dueDate);
                  const isOverdue = daysLeft < 0 && tax.status === 'unpaid';

                  return (
                    <tr
                      key={tax.id}
                      className={`hover:bg-gray-50 ${
                        isOverdue ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{tax.assetName}</p>
                        {tax.taxType && (
                          <p className="text-xs text-gray-500 mt-1">{tax.taxType}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600 font-mono">{tax.taxNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{formatCurrency(tax.amount)}</p>
                        {tax.taxRate && (
                          <p className="text-xs text-blue-600 mt-1">Tarif: {tax.taxRate.toFixed(2)}%</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(tax.dueDate)}</span>
                        </div>
                        {tax.status === 'unpaid' && (
                          <p
                            className={`mt-1 ${
                              isOverdue
                                ? 'text-red-600'
                                : daysLeft <= 7
                                ? 'text-orange-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {isOverdue
                              ? `Terlambat ${Math.abs(daysLeft)} hari`
                              : `${daysLeft} hari lagi`}
                          </p>
                        )}
                        {tax.status === 'paid' && tax.paidDate && (
                          <p className="text-green-600 mt-1">
                            Dibayar: {formatDate(tax.paidDate)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(tax)}</td>
                      <td className="px-6 py-4">
                        {tax.status === 'unpaid' && (
                          <button
                            onClick={() => setPayingTax(tax)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Bayar
                          </button>
                        )}
                        {tax.status === 'paid' && (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {payingTax && (
        <PaymentModal
          tax={payingTax}
          onClose={() => setPayingTax(null)}
          onComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}