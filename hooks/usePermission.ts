import { useSession } from 'next-auth/react';

export function usePermission(required: string) {
  const { data } = useSession();
  const perms = data?.user?.permissions ?? [];
  return perms.includes(required);
}
