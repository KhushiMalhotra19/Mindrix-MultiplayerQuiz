import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('register'); // 'register' or 'login'
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isNextPage, setIsNextPage] = useState(false);

  // Check existing 7-day session cookie on mount
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
          setIsNextPage(true); // Jump directly to Multiplayer Dashboard
        }
      })
      .catch((err) => {
        console.error('Failed to check session:', err);
      })
      .finally(() => {
        setLoadingSession(false);
      });
  }, []);

  const openRegister = () => {
    setAuthMode('register');
    setModalOpen(true);
  };

  const openLogin = () => {
    setAuthMode('login');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      setIsNextPage(false); // Reset canvas fallout state when logged out
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setIsNextPage(true); // Jump directly to Multiplayer Dashboard after logging in
    setModalOpen(false);
  };

  const handleProfileUpdated = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    setUser,
    loadingSession,
    isNextPage,
    setIsNextPage,
    modalOpen,
    setModalOpen,
    authMode,
    setAuthMode,
    openRegister,
    openLogin,
    closeModal,
    handleLogout,
    handleAuthSuccess,
    handleProfileUpdated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
