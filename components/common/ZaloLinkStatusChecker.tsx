import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

export default function ZaloLinkStatusChecker() {
  const { currentUser } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (currentUser?.zaloLinkStatus === 2 && pathname !== '/dashboard/link-account') {
      router.push('/dashboard/link-account');
    }
  }, [currentUser?.zaloLinkStatus, pathname, router]);
  return null;
}
