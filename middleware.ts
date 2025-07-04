import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPaths = ['/login'];

  // Lấy token từ cookie
  const token = request.cookies.get('access_token')?.value;

  let isValid = false;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (exp && typeof exp === 'number' && exp > 0) {
        isValid = Date.now() < exp * 1000;
      }
    } catch (error) {
      console.error('Token decode error:', error);
    }
  }

  // Nếu đã đăng nhập, vào / hoặc /login thì chuyển sang dashboard/transactions
  if (isValid && (pathname === '/' || pathname === '/login')) {
    return NextResponse.redirect(new URL('/dashboard/transactions', request.url));
  }

  // Nếu là public path thì cho qua
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Nếu chưa đăng nhập hoặc token hết hạn thì chuyển về login
  if (!isValid) {
    const loginUrl = new URL('/login', request.url);
    if (!pathname.startsWith('/login')) {
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.href);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};