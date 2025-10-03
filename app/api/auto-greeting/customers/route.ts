import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header from the incoming request
    const authHeader = request.headers.get('authorization');
    
    // Forward query parameters from the request
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const backendUrl = new URL(`${API_BASE_URL}/auto-greeting/customers`);
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });
    
    const response = await fetch(backendUrl.toString(), {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    if (!response.ok) {
      console.error('Backend response not ok:', response.status, response.statusText);
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
