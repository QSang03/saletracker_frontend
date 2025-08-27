import { NextRequest, NextResponse } from 'next/server';

// Helper function để lấy token từ request headers
function getTokenFromHeaders(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Lấy token từ request headers thay vì localStorage
    const token = getTokenFromHeaders(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    // Kiểm tra NEXT_PUBLIC_API_URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
      console.error('❌ NEXT_PUBLIC_API_URL is not defined');
      return NextResponse.json(
        { error: 'API URL not configured' }, 
        { status: 500 }
      );
    }

    // Lấy query parameters từ request
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const employeeId = searchParams.get('employeeId');
    const departmentId = searchParams.get('departmentId');

    // Tạo URL với query parameters
    const apiUrl = new URL(`${apiBaseUrl}/order-details/customer-count`);
    if (fromDate) apiUrl.searchParams.set('fromDate', fromDate);
    if (toDate) apiUrl.searchParams.set('toDate', toDate);
    if (employeeId) apiUrl.searchParams.set('employeeId', employeeId);
    if (departmentId) apiUrl.searchParams.set('departmentId', departmentId);

    console.log('📡 Calling backend URL:', apiUrl.toString());
    console.log('🔑 Token length:', token.length);

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend response error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Backend request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Backend response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error in customer-count API route:', error);
    
    // Kiểm tra nếu là lỗi kết nối backend
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'Backend server is not running' }, 
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
