import React, { useEffect, useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { getCurrentLocation, saveUserLocation } from './utils/geolocation';

type EmbeddedUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  name: string;
  role: 'admin' | 'user';
  layout: string;
  isActive: boolean;
  nik?: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  profilePhoto?: string;
};

type SessionResponse = {
  success: boolean;
  user: any;
  users?: any[];
  message?: string;
};

type EmbeddedState =
  | { status: 'loading'; error?: string }
  | { status: 'error'; error: string }
  | { status: 'ready'; user: EmbeddedUser; users: EmbeddedUser[] };

const DEFAULT_ERROR = 'Sesi tidak ditemukan. Silakan login ulang.';

const mapSessionUser = (raw: any): EmbeddedUser => {
  const id = String(raw?.id ?? '');
  const fullName = raw?.fullName || raw?.name || raw?.username || 'Pengguna';
  return {
    id,
    username: raw?.username || '',
    email: raw?.email || '',
    fullName,
    name: fullName,
    role: raw?.role === 'admin' ? 'admin' : 'user',
    layout: raw?.layout || raw?.role || 'user',
    isActive: raw?.isActive !== false,
    nik: raw?.nik || '',
    dateOfBirth: raw?.dateOfBirth || raw?.birthDate || '',
    phone: raw?.phone || '',
    address: raw?.address || '',
    profilePhoto: raw?.profilePhoto || '',
  };
};

const ensureClientStores = () => {
  if (!localStorage.getItem('assets')) {
    localStorage.setItem('assets', '[]');
  }
  if (!localStorage.getItem('taxes')) {
    localStorage.setItem('taxes', '[]');
  }
  if (!localStorage.getItem('transactions')) {
    localStorage.setItem('transactions', '[]');
  }
  if (!localStorage.getItem('userLocations')) {
    localStorage.setItem('userLocations', '{}');
  }
};

const seedUsersStore = (users: EmbeddedUser[], currentUserId: string) => {
  if (!users.length) {
    return;
  }
  ensureClientStores();
  localStorage.setItem('users', JSON.stringify(users));
  localStorage.setItem('sessionToken', currentUserId);
};

const logoutRequest = async () => {
  try {
    await fetch('/api/logout.php', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Gagal menghubungi endpoint logout', error);
  } finally {
    localStorage.removeItem('sessionToken');
  }
};

const persistProfile = async (user: EmbeddedUser) => {
  try {
    await fetch('/api/profile.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        fullName: user.fullName || user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        profilePhoto: user.profilePhoto || '',
      }),
    });
  } catch (error) {
    console.warn('Gagal menyimpan profil ke server', error);
  }
};

const useSessionState = (): EmbeddedState => {
  const [state, setState] = useState<EmbeddedState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      try {
        const response = await fetch('/api/session.php', {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(DEFAULT_ERROR);
        }
        const payload: SessionResponse = await response.json();
        if (!payload?.success || !payload?.user) {
          throw new Error(payload?.message || DEFAULT_ERROR);
        }
        if (!active) {
          return;
        }
        const currentUser = mapSessionUser(payload.user);
        const otherUsers = (payload.users || []).map(mapSessionUser);
        setState({
          status: 'ready',
          user: currentUser,
          users: otherUsers.length ? otherUsers : [currentUser],
        });
      } catch (error: any) {
        if (active) {
          setState({
            status: 'error',
            error: error?.message || DEFAULT_ERROR,
          });
        }
      }
    };

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  return state;
};

const LoadingView = ({ message }: { message: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center space-y-3">
      <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mx-auto" />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  </div>
);

const ErrorView = ({ message }: { message: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center space-y-4 max-w-md">
      <h1 className="text-xl font-semibold text-gray-900">CORETAX</h1>
      <p className="text-gray-600">{message}</p>
      <button
        type="button"
        onClick={() => {
          window.location.href = '/auth';
        }}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
      >
        Ke Halaman Login
      </button>
    </div>
  </div>
);

const EmbeddedApp = ({ initialUser, initialUsers }: { initialUser: EmbeddedUser; initialUsers: EmbeddedUser[] }) => {
  const [user, setUser] = useState<EmbeddedUser>(initialUser);
  const [knownUsers, setKnownUsers] = useState<EmbeddedUser[]>(initialUsers);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const usersToPersist = knownUsers.length ? knownUsers : [user];
    seedUsersStore(usersToPersist, user.id);
  }, [knownUsers, user]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isMounted = true;

    const trackLocation = async () => {
      try {
        const location = await getCurrentLocation();
        if (isMounted) {
          saveUserLocation(user.id, location, 'session');
        }
      } catch (error) {
        // Geolocation optional, ignore error silently
      }
    };

    trackLocation();
    const interval = window.setInterval(trackLocation, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  const handleLogout = async () => {
    await logoutRequest();
    window.location.href = '/auth';
  };

  const handleUserUpdate = async (updatedUser: EmbeddedUser) => {
    setUser(updatedUser);
    setKnownUsers((prev) => {
      const next = prev.map((item) => (item.id === updatedUser.id ? updatedUser : item));
      return next;
    });
    await persistProfile(updatedUser);
  };

  if (!user) {
    return <LoadingView message="Menyiapkan data pengguna..." />;
  }

  if (user.role === 'admin') {
    return <AdminLayout user={user} onLogout={handleLogout} />;
  }

  return <MainLayout user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
};

export function EmbeddedRoot() {
  const state = useSessionState();

  if (state.status === 'loading') {
    return <LoadingView message="Memuat tampilan CORE-TAX..." />;
  }

  if (state.status === 'error' || !('user' in state)) {
    return <ErrorView message={state.error || DEFAULT_ERROR} />;
  }

  return <EmbeddedApp initialUser={state.user} initialUsers={state.users} />;
}
