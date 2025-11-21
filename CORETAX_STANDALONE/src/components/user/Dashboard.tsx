import React, { useEffect, useState } from 'react';
import { Car, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { syncTaxRecordsWithAssets, getTaxRecordsWithAssetData } from '../../utils/taxSync';
import { LocationStatus } from './LocationStatus';

interface DashboardProps {
  user: any;
}

export function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalTaxDue: 0,
    upcomingPayments: 0,
  });
  const [upcomingTaxes, setUpcomingTaxes] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user.id]);

  const loadDashboardData = () => {
    // Sync tax records with asset data first
    syncTaxRecordsWithAssets();
    
    const assets = JSON.parse(localStorage.getItem('assets') || '[]');
    const syncedTaxes = getTaxRecordsWithAssetData();

    const userAssets = assets.filter((a: any) => a.userId === user.id);
    const userTaxes = syncedTaxes.filter((t: any) => t.userId === user.id);

    const unpaidTaxes = userTaxes.filter((t: any) => t.status === 'unpaid');
    
    // Calculate total tax from assets with taxAmount
    const totalDue = userAssets.reduce((sum: number, asset: any) => {
      return sum + (asset.taxAmount || 0);
    }, 0);

    // Get upcoming taxes (within 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcoming = unpaidTaxes
      .filter((t: any) => {
        const dueDate = new Date(t.dueDate);
        return dueDate >= today && dueDate <= thirtyDaysFromNow;
      })
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3);

    setStats({
      totalAssets: userAssets.length,
      totalTaxDue: totalDue,
      upcomingPayments: upcoming.length,
    });

    setUpcomingTaxes(upcoming);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Selamat datang, {user.name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600">Total Aset</p>
              <p className="text-gray-900">{stats.totalAssets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-gray-600">Total Pajak Terutang</p>
              <p className="text-gray-900">{formatCurrency(stats.totalTaxDue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-gray-600">Jatuh Tempo (30 Hari)</p>
              <p className="text-gray-900">{stats.upcomingPayments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Location Status */}
      <LocationStatus userId={user.id} />

      {/* Upcoming Payments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Pajak Jatuh Tempo Terdekat</h2>
        </div>
        <div className="p-6">
          {upcomingTaxes.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Tidak ada pajak yang jatuh tempo dalam 30 hari ke depan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingTaxes.map((tax) => {
                const daysLeft = getDaysUntilDue(tax.dueDate);
                const isUrgent = daysLeft <= 7;

                return (
                  <div
                    key={tax.id}
                    className={`p-4 rounded-lg border-2 ${
                      isUrgent
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-gray-900">{tax.assetName}</p>
                        <p className="text-gray-600">{tax.taxNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900">{formatCurrency(tax.amount)}</p>
                        <p
                          className={`${
                            isUrgent ? 'text-red-600' : 'text-orange-600'
                          }`}
                        >
                          {daysLeft} hari lagi
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Jatuh tempo: {formatDate(tax.dueDate)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}