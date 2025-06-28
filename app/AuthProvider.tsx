'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    
    if (!accessToken) {
      router.push('/login');
      return;
    }

    try {
      const { exp } = jwtDecode(accessToken) as { exp: number };
      const currentTime = Date.now() / 1000;
      
      if (currentTime >= exp) {
        localStorage.removeItem('access_token');
        router.push('/login');
      }
    } catch (error) {
      console.error('JWT decode error:', error);
      localStorage.removeItem('access_token');
      router.push('/login');
    } finally {
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
