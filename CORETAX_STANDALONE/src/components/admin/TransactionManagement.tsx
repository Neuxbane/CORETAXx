import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, Filter } from 'lucide-react';

export function TransactionManagement() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, dateFilter]);

  const loadData = () => {
    const allTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    setTransactions(allTransactions);
    setUsers(allUsers);
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      filtered = filtered.filter((t) => {
        const tDate = new Date(t.paymentDate);
        return tDate.toDateString() === now.toDateString();
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((t) => new Date(t.paymentDate) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((t) => new Date(t.paymentDate) >= monthAgo);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.taxNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getUserName(t.userId).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    setFilteredTransactions(filtered);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalRevenue = () => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const downloadReport = () => {
    // Simulate PDF download
    const reportData = {
      date: new Date().toISOString(),
      filter: dateFilter,
      totalTransactions: filteredTransactions.length,
      totalRevenue: getTotalRevenue(),
      transactions: filteredTransactions.map((t) => ({
        date: formatDate(t.paymentDate),
        user: getUserName(t.userId),
        asset: t.assetName,
        taxNumber: t.taxNumber,
        amount: formatCurrency(t.amount),
      })),
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `laporan-transaksi-${dateFilter}-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    alert('Laporan berhasil diunduh!\n\n(Dalam sistem sebenarnya, ini akan menghasilkan file PDF)');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Manajemen Transaksi</h1>
          <p className="text-gray-600">Kelola dan lihat semua transaksi pembayaran pajak</p>
        </div>
        <button
          onClick={downloadReport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Download className="w-5 h-5" />
          Download Laporan
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
              placeholder="Cari transaksi..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="week">7 Hari Terakhir</option>
              <option value="month">30 Hari Terakhir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">Total Transaksi</p>
          <p className="text-gray-900">{filteredTransactions.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">Total Pendapatan</p>
          <p className="text-gray-900">{formatCurrency(getTotalRevenue())}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">Tanggal</th>
                <th className="px-6 py-3 text-left text-gray-700">Pengguna</th>
                <th className="px-6 py-3 text-left text-gray-700">Aset</th>
                <th className="px-6 py-3 text-left text-gray-700">No. Pajak</th>
                <th className="px-6 py-3 text-left text-gray-700">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada transaksi yang ditemukan
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{formatDate(transaction.paymentDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{getUserName(transaction.userId)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{transaction.assetName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 font-mono">{transaction.taxNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-green-600">{formatCurrency(transaction.amount)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
