import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserWithPermissions } from '../types';
import { clearAllTokens, getAccessToken, getUserFromToken } from '@/lib/auth';

interface AuthContextType {
  user: UserWithPermissions | null;
  isLoading: boolean;
  login: (userData: UserWithPermissions) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  login: () => {},
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = getAccessToken();
        if (token) {
            const userData = getUserFromToken(token);
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

  const login = (userData: UserWithPermissions) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    clearAllTokens();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
