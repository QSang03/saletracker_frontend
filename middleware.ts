import { NextResponse, type NextRequest } from 'next/server';
import { navItems } from './lib/nav-items';
import type { User } from './types';

function hasRole(userRoles: string[], requiredRoles: string[]): boolean {
  return requiredRoles.some(role => userRoles.includes(role));
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

function isAccessible(userRoles: string[], url: string): boolean {
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
  const token = request.cookies.get('access_token')?.value;
  let isValid = false;
  let userRoles: string[] = [];

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (exp && typeof exp === 'number' && exp > 0) {
        isValid = Date.now() < exp * 1000;
      }
      
      // Lấy roles từ payload - backend trả về array objects với name
      if (payload.roles && Array.isArray(payload.roles)) {
        userRoles = payload.roles.map((role: any) => role.name || role);
      }
    } catch (error) {
      console.error('Token decode error:', error);
    }
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
    const loginUrl = new URL('/login', request.url);
    if (!pathname.startsWith('/login')) {
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.href);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    return response;
  }

  const allUrls = navItems.flatMap((g: any) => g.items.map((i: any) => i.url));
  if (allUrls.includes(pathname) && !isAccessible(userRoles, pathname)) {
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