import React, { useEffect, useState } from 'react';
import { Users, Car, DollarSign, TrendingUp, Activity } from 'lucide-react';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalAssets: 0,
    totalRevenue: 0,
    unpaidTaxes: 0,
    recentTransactions: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentActivities();
  }, []);

  const loadStats = () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const assets = JSON.parse(localStorage.getItem('assets') || '[]');
    const taxes = JSON.parse(localStorage.getItem('taxes') || '[]');
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');

    const activeUsers = users.filter((u: any) => u.role === 'user' && u.isActive).length;
    const unpaidTaxes = taxes.filter((t: any) => t.status === 'unpaid').length;
    const totalRevenue = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);

    // Get recent transactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTransactions = transactions.filter(
      (t: any) => new Date(t.paymentDate) >= sevenDaysAgo
    ).length;

    setStats({
      totalUsers: users.filter((u: any) => u.role === 'user').length,
      activeUsers,
      totalAssets: assets.length,
      totalRevenue,
      unpaidTaxes,
      recentTransactions,
    });
  };

  const loadRecentActivities = () => {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const users = JSON.parse(localStorage.getItem('users') || '[]');

    const activities = transactions
      .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .slice(0, 5)
      .map((t: any) => {
        const user = users.find((u: any) => u.id === t.userId);
        return {
          ...t,
          userName: user?.name || 'Unknown User',
        };
      });

    setRecentActivities(activities);
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
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Dashboard Admin</h1>
        <p className="text-gray-600">Ringkasan sistem dan aktivitas terkini</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600">Total Pengguna</p>
              <p className="text-gray-900">{stats.totalUsers}</p>
              <p className="text-green-600">{stats.activeUsers} aktif</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-600">Total Aset Terdaftar</p>
              <p className="text-gray-900">{stats.totalAssets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-600">Total Pendapatan</p>
              <p className="text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-gray-600">Pajak Belum Dibayar</p>
              <p className="text-gray-900">{stats.unpaidTaxes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-gray-600">Transaksi (7 Hari)</p>
              <p className="text-gray-900">{stats.recentTransactions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Aktivitas Terkini</h2>
        </div>
        <div className="p-6">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Belum ada aktivitas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">
                      <span>{activity.userName}</span> membayar pajak
                    </p>
                    <p className="text-gray-600">{activity.assetName}</p>
                    <p className="text-gray-900 mt-1">{formatCurrency(activity.amount)}</p>
                    <p className="text-gray-500 mt-1">{formatDate(activity.paymentDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
