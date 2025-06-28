import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPaths = ['/login'];

  // Cho phép truy cập public paths
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Kiểm tra token từ cookie
  const token = request.cookies.get('access_token')?.value;
  
  let isValid = false;
  
  if (token) {
    try {
      // Giải mã payload để lấy thời hạn (không cần verify)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      
      if (exp && typeof exp === 'number' && exp > 0) {
        // Kiểm tra thời gian hết hạn
        isValid = Date.now() < exp * 1000;
      }
    } catch (error) {
      console.error('Token decode error:', error);
    }
  }

  // Nếu không hợp lệ, chuyển hướng về login
  if (!isValid) {
    const loginUrl = new URL('/login', request.url);
    
    // Chỉ set callbackUrl nếu không phải là trang login
    if (!request.nextUrl.pathname.startsWith('/login')) {
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.href);
    }
    
    // Xóa cookie token nếu có
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
