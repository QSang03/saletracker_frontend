import { NextResponse, type NextRequest } from 'next/server';
import { navItems } from './lib/nav-items';
import { getPermissionFromUrl } from './lib/url-permission-mapping';
import type { User } from './types';
import { base64UrlDecode } from './lib/auth';

function hasRole(userRoles: string[], requiredRoles: string[]): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  const userRolesLower = userRoles.map((r) => r.toString().toLowerCase());
  const requiredLower = requiredRoles.map((r) => r.toString().toLowerCase());

  return requiredLower.some((required) => {
    // Allow generic roles to match their department-scoped variants
    if (required === 'pm') {
      return userRolesLower.some((u) => u === 'pm' || u.startsWith('pm-'));
    }
    if (required === 'manager') {
      return userRolesLower.some((u) => u === 'manager' || u.startsWith('manager-'));
    }
    if (required === 'user') {
      return userRolesLower.some((u) => u === 'user' || u.startsWith('user-'));
    }
    // Exact match for other roles (e.g., admin, analysis, specific slugs like manager-cong-no)
    return userRolesLower.includes(required);
  });
}

function getFirstAccessibleUrl(userRoles: string[]): string | null {
  for (const group of navItems) {
    for (const item of group.items) {
      if (!item.roles || hasRole(userRoles, item.roles)) {
        return item.url;
      }
    }
  }
  return null;
}

function isAccessible(userRoles: string[], url: string, userPermissions: any[] = []): boolean {
  // Kiểm tra role view có permissions cụ thể không
  const isViewRole = userRoles.includes('view');
  if (isViewRole && userPermissions.length > 0) {
    const permission = getPermissionFromUrl(url);
    if (permission) {
      // Debug log để kiểm tra
      console.log(`🔍 [Middleware] Checking permission for ${url}:`, {
        requiredPermission: permission,
        userPermissions: userPermissions.map(p => `${p.name}(${p.action})`),
        hasPermission: userPermissions.some(
          (perm: any) => perm.name === permission.name && perm.action === permission.action
        )
      });
      
      // Kiểm tra xem user có permission cho chức năng này không
      const hasPermission = userPermissions.some(
        (perm: any) => perm.name === permission.name && perm.action === permission.action
      );
      return hasPermission;
    }
  }

  // Fallback to role-based check
  for (const group of navItems) {
    for (const item of group.items) {
      if (item.url === url && (!item.roles || hasRole(userRoles, item.roles))) {
        return true;
      }
    }
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPaths = ['/login'];
  const zaloLinkPath = '/dashboard/link-account';
  const token = request.cookies.get('access_token')?.value;
  let isValid = false;
  let userRoles: string[] = [];
  let userPermissions: any[] = [];
  let zaloLinkStatus: number = 0;

  if (token) {
    try {
      const parts = token.split('.');
      if (!parts || parts.length < 2 || !parts[1]) {
        throw new Error('Invalid token format');
      }
      const decoded = base64UrlDecode(parts[1]);
      const payload = JSON.parse(decoded);
      const exp = payload.exp;
      if (exp && typeof exp === 'number' && exp > 0) {
        isValid = Date.now() < exp * 1000;
      }
      
      // Lấy roles từ payload - backend trả về array objects với name
      if (payload.roles && Array.isArray(payload.roles)) {
        // Normalize role names to lowercase for consistent comparisons
        userRoles = payload.roles.map((role: any) => (role.name || role).toString().toLowerCase());
      }

      // Lấy permissions từ payload cho role view
      if (payload.permissions && Array.isArray(payload.permissions)) {
        userPermissions = payload.permissions;
      }

      // Lấy zaloLinkStatus từ payload
      if (typeof payload.zaloLinkStatus === 'number') {
        zaloLinkStatus = payload.zaloLinkStatus;
      }

    } catch (error) {
      // Clear token cookies when middleware sees malformed token to avoid repeat errors
      console.error('Token decode error in middleware:', error);
      // Clear invalid cookies and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      return response;
    }
  }

  // Kiểm tra zaloLinkStatus = 2 (lỗi liên kết) - chỉ redirect nếu có lỗi liên kết
  if (isValid && zaloLinkStatus === 2) {
    // Chỉ cho phép truy cập route liên kết tài khoản khi có lỗi
    if (pathname !== zaloLinkPath) {
      return NextResponse.redirect(new URL(zaloLinkPath, request.url));
    }
    // Nếu đang ở route liên kết, cho phép tiếp tục
    return NextResponse.next();
  }

  // Cho phép truy cập trang liên kết tài khoản bình thường (không chỉ khi có lỗi)
  if (isValid && pathname === zaloLinkPath) {
    return NextResponse.next();
  }

  if (isValid && (pathname === '/' || pathname === '/login' || pathname === '/dashboard')) {
    const firstUrl = getFirstAccessibleUrl(userRoles);
    if (firstUrl) {
      return NextResponse.redirect(new URL(firstUrl, request.url));
    }
  }

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  if (!isValid) {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    
    // Nếu có refresh token, thử refresh access token
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          if (data.access_token) {
            const response = NextResponse.next();
            
            // Xử lý token quá dài như trong setAccessToken
            let cookieToken = data.access_token;
            if (data.access_token.length > 4000) {
              try {
                const parts = data.access_token.split(".");
                if (parts.length === 3) {
                  const payload = JSON.parse(base64UrlDecode(parts[1]));
                  // Remove large fields but keep essential ones
                  const essentialPayload = {
                    sub: payload.sub,
                    username: payload.username,
                    roles: payload.roles,
                    exp: payload.exp,
                    zaloLinkStatus: payload.zaloLinkStatus,
                    status: payload.status,
                    isBlock: payload.isBlock
                  };
                  
                  // Re-encode the essential payload
                  const essentialPayloadStr = JSON.stringify(essentialPayload);
                  const essentialPayloadBase64 = btoa(unescape(encodeURIComponent(essentialPayloadStr)))
                    .replace(/\+/g, "-")
                    .replace(/\//g, "_")
                    .replace(/=+$/, "");
                  
                  cookieToken = [parts[0], essentialPayloadBase64, "signature-removed"].join(".");
                  
                  // Nếu token rút gọn vẫn quá dài, cắt signature
                  if (cookieToken.length > 4000) {
                    cookieToken = parts[0] + "." + essentialPayloadBase64 + ".short";
                  }
                }
              } catch (e) {
                console.error("❌ [Middleware] Error creating shortened token:", e);
                // Fallback: tạo token minimal
                try {
                  const parts = data.access_token.split(".");
                  if (parts.length === 3) {
                    const payload = JSON.parse(base64UrlDecode(parts[1]));
                    const minimalPayload = {
                      sub: payload.sub,
                      exp: payload.exp,
                      roles: payload.roles || [],
                      zaloLinkStatus: payload.zaloLinkStatus || 0
                    };
                    const minimalPayloadStr = JSON.stringify(minimalPayload);
                    const minimalPayloadBase64 = btoa(unescape(encodeURIComponent(minimalPayloadStr)))
                      .replace(/\+/g, "-")
                      .replace(/\//g, "_")
                      .replace(/=+$/, "");
                    cookieToken = parts[0] + "." + minimalPayloadBase64 + ".minimal";
                  }
                } catch (fallbackError) {
                  console.error("❌ [Middleware] Fallback token creation failed:", fallbackError);
                  cookieToken = data.access_token.substring(0, 100); // Last resort
                }
              }
            }
            
            // Set processed token to cookie
            response.cookies.set('access_token', cookieToken, {
              httpOnly: false,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 30 * 24 * 60 * 60, // 30 days
            });
            
            console.log("✅ [Middleware] Set shortened token to cookie, length:", cookieToken.length);
            
            // Set new refresh token if provided
            if (data.refresh_token) {
              response.cookies.set('refresh_token', data.refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60, // 30 days
              });
            }
            return response;
          }
        }
      } catch (error) {
        console.error('Token refresh failed in middleware:', error);
      }
    }
    
    const loginUrl = new URL('/login', request.url);
    if (!pathname.startsWith('/login')) {
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.href);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  // Restrict configuration routes for 'view' role
  const isViewRole = userRoles.includes('view');
  const configRoutes = [
    '/dashboard/config-system',
    '/dashboard/service-monitor',
    '/dashboard/gpt-oss',
  ];
  if (isViewRole && configRoutes.includes(pathname)) {
    const firstUrl = getFirstAccessibleUrl(userRoles);
    if (firstUrl) {
      return NextResponse.redirect(new URL(firstUrl, request.url));
    }
  }
  
  // Kiểm tra quyền truy cập cho các URLs trong navItems
  const allUrls = navItems.flatMap((g: any) => g.items.map((i: any) => i.url));
  if (allUrls.includes(pathname) && !isAccessible(userRoles, pathname, userPermissions)) {
    const firstUrl = getFirstAccessibleUrl(userRoles);
    if (firstUrl) {
      return NextResponse.redirect(new URL(firstUrl, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
