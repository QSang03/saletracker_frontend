import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    // Get authorization header from the incoming request
    const authHeader = request.headers.get('authorization');
    
    // Get form data from the request
    const formData = await request.formData();
    
    // Forward the request to backend
    const response = await fetch(`${API_BASE_URL}/auto-greeting/import-customers`, {
      method: 'POST',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: formData,
    });

    if (!response.ok) {
      console.error('Backend response not ok:', response.status, response.statusText);
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error importing customers:', error);
    return NextResponse.json(
      { error: 'Failed to import customers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}