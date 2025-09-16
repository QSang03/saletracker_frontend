import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const url = new URL(`${API_BASE_URL}/auto-greeting/run-now`);
    if (userId) {
      url.searchParams.append('userId', userId);
    }

    // Get authorization header from the incoming request
    const authHeader = request.headers.get('authorization');
    
    const response = await fetch(url.toString(), {
      method: 'POST',
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
    console.error('Error running auto-greeting:', error);
    return NextResponse.json(
      { error: 'Failed to run auto-greeting', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
