import React, { useState, useEffect } from 'react';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { TwoFactorAuth } from './components/auth/TwoFactorAuth';
import { MainLayout } from './components/layout/MainLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { getCurrentLocation, saveUserLocation } from './utils/geolocation';

type AuthPage = 'login' | 'register' | 'forgot-password' | '2fa';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  nik: string;
  dateOfBirth: string;
  phone?: string;
  address?: string;
  profilePhoto?: string;
  role: 'user' | 'admin';
  isActive: boolean;
}

function App() {
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const sessionToken = localStorage.getItem('sessionToken');
    if (sessionToken) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find((u: User) => u.id === sessionToken);
      if (user && user.isActive) {
        setCurrentUser(user);
      } else {
        localStorage.removeItem('sessionToken');
      }
    }

    // Initialize demo data if not exists
    initializeDemoData();
  }, []);

  // Periodic location tracking when user is logged in
  useEffect(() => {
    if (!currentUser) return;

    // Track location immediately on login
    const trackLocation = async () => {
      try {
        const location = await getCurrentLocation();
        saveUserLocation(currentUser.id, location, 'periodic');
      } catch (error) {
        // Silently ignore location errors - don't show to user
        // Location tracking is optional feature
      }
    };

    trackLocation();

    // Track location every 5 minutes
    const interval = setInterval(trackLocation, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const initializeDemoData = () => {
    // Initialize users with admin account
    if (!localStorage.getItem('users')) {
      const demoUsers = [
        {
          id: 'admin-1',
          name: 'Admin System',
          email: 'admin@pwd.go.id',
          username: 'admin',
          password: 'admin123', // In real app, this would be hashed
          nik: '0000000000000000',
          dateOfBirth: '1990-01-01',
          role: 'admin',
          isActive: true,
        },
      ];
      localStorage.setItem('users', JSON.stringify(demoUsers));
    }

    // Initialize assets
    if (!localStorage.getItem('assets')) {
      localStorage.setItem('assets', JSON.stringify([]));
    }

    // Initialize taxes
    if (!localStorage.getItem('taxes')) {
      localStorage.setItem('taxes', JSON.stringify([]));
    }

    // Initialize transactions
    if (!localStorage.getItem('transactions')) {
      localStorage.setItem('transactions', JSON.stringify([]));
    }
  };

  const handleLoginSuccess = (user: User) => {
    // Simulate 2FA requirement
    setPendingUser(user);
    setNeeds2FA(true);
  };

  const handle2FASuccess = () => {
    if (pendingUser) {
      localStorage.setItem('sessionToken', pendingUser.id);
      setCurrentUser(pendingUser);
      setNeeds2FA(false);
      setPendingUser(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sessionToken');
    setCurrentUser(null);
    setAuthPage('login');
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  if (!currentUser) {
    if (needs2FA && pendingUser) {
      return (
        <TwoFactorAuth
          email={pendingUser.email}
          onSuccess={handle2FASuccess}
          onBack={() => {
            setNeeds2FA(false);
            setPendingUser(null);
          }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        {authPage === 'login' && (
          <Login
            onSuccess={handleLoginSuccess}
            onRegisterClick={() => setAuthPage('register')}
            onForgotPasswordClick={() => setAuthPage('forgot-password')}
          />
        )}
        {authPage === 'register' && (
          <Register onBackToLogin={() => setAuthPage('login')} />
        )}
        {authPage === 'forgot-password' && (
          <ForgotPassword onBackToLogin={() => setAuthPage('login')} />
        )}
      </div>
    );
  }

  // Render admin or user layout based on role
  if (currentUser.role === 'admin') {
    return <AdminLayout user={currentUser} onLogout={handleLogout} />;
  }

  return (
    <MainLayout
      user={currentUser}
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
    />
  );
}

export default App;
