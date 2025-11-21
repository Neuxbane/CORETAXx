import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../user/Dashboard';
import { Profile } from '../user/Profile';
import { AssetManagement } from '../user/AssetManagement';
import { TaxManagement } from '../user/TaxManagement';
import { Settings } from '../user/Settings';
import { Menu, X } from 'lucide-react';

interface MainLayoutProps {
  user: any;
  onLogout: () => void;
}

type Page = 'dashboard' | 'profile' | 'assets' | 'taxes' | 'settings';

export function MainLayout({ user, onLogout }: MainLayoutProps) {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'profile':
        return <Profile user={user} />;
      case 'assets':
        return <AssetManagement user={user} />;
      case 'taxes':
        return <TaxManagement user={user} />;
      case 'settings':
        return <Settings user={user} />;
      default:
        return <Dashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-gray-900">Sistem PWD</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
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
