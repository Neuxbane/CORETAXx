import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminDashboard } from '../admin/AdminDashboard';
import { UserManagement } from '../admin/UserManagement';
import { AdminAssetManagement } from '../admin/AdminAssetManagement';
import { TransactionManagement } from '../admin/TransactionManagement';
import { UserLocationMap } from '../admin/UserLocationMap';
import { Menu, X } from 'lucide-react';

interface AdminLayoutProps {
  user: any;
  onLogout: () => void;
}

type Page = 'dashboard' | 'users' | 'assets' | 'transactions' | 'location-map';

export function AdminLayout({ user, onLogout }: AdminLayoutProps) {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <UserManagement />;
      case 'assets':
        return <AdminAssetManagement />;
      case 'transactions':
        return <TransactionManagement />;
      case 'location-map':
        return <UserLocationMap />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-gray-900">Admin Panel</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar
          user={user}
          currentPage={currentPage}
          onPageChange={(page) => {
            setCurrentPage(page as Page);
            setSidebarOpen(false);
          }}
          onLogout={onLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <div className="flex-1 lg:ml-64">
          <div className="p-4 lg:p-8">
            {renderPage()}
          </div>
        </div>
      </div>
    </div>
  );
}