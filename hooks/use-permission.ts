'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export function usePermission(required: string) {
  const { data: session, status } = useSession();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      const permissions = session?.user?.permissions || [];
      setHasPermission(permissions.includes(required));
      setIsLoading(false);
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [session, status, required]);

  return { hasPermission, isLoading };
}
