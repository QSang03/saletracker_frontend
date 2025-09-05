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
    // Forward all supported filters
    const apiUrl = new URL(`${apiBaseUrl}/order-details/customer-count`);
    const forwardKeys = [
  'fromDate','toDate','employeeId','departmentId',
      'search','status','date','dateRange','employee','employees','departments','products','warningLevel','quantity'
  ,'countMode'
    ];
    for (const key of forwardKeys) {
      const v = searchParams.get(key);
      if (v !== null) apiUrl.searchParams.set(key, v);
    }

    console.log('📡 Calling backend URL:', apiUrl.toString());
    console.log('🔑 Token length:', token.length);

    // Helper: fetch with timeout and simple retries for transient errors
    async function fetchWithRetries(url: string, options: RequestInit, retries = 2, timeoutMs = 5000) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(id);
          return res;
        } catch (err) {
          clearTimeout(id);
          console.error(`Fetch attempt ${attempt + 1} failed for ${url}:`, err);
          // If last attempt, rethrow
          if (attempt === retries) throw err;
          // Backoff before retrying
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }
      // Shouldn't reach here
      throw new Error('Unreachable');
    }

    const response = await fetchWithRetries(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }, 2, 5000);

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

    // Robust detection of upstream connection/fetch errors.
    // Node fetch may throw a TypeError with message 'fetch failed' or wrap an error with cause.code === 'ECONNREFUSED'.
    const msg = error instanceof Error ? error.message : String(error);
    const causeCode = (error as any)?.cause?.code ?? (error as any)?.code ?? null;
    const isConnectionError =
      msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || causeCode === 'ECONNREFUSED' || (error as any)?.name === 'FetchError';

    if (isConnectionError) {
      return NextResponse.json(
        { error: 'Backend server is not reachable' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
