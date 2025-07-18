import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserWithPermissions } from '../types';
import { clearAllTokens, getAccessToken, getUserFromToken } from '@/lib/auth';

interface AuthContextType {
  user: UserWithPermissions | null;
  isLoading: boolean;
  token: string | null;
  login: (userData: UserWithPermissions) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  token: null,
  login: () => {},
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const t = getAccessToken();
        setToken(t);
        if (t) {
          const userData = getUserFromToken(t);
          if (userData) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Lắng nghe thay đổi token qua localStorage (storage event) để sync giữa các tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        const t = getAccessToken();
        setToken((prev) => (prev !== t ? t : prev));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = (userData: UserWithPermissions) => {
    setUser(userData);
    setToken(getAccessToken());
  };

  const logout = () => {
    setUser(null);
    clearAllTokens();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
