import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const MASTER_KEY = process.env.NEXT_PUBLIC_MASTER_KEY || 'nkcai';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get authorization header from the incoming request
    const authHeader = request.headers.get('authorization');
    
    const response = await fetch(`${API_BASE_URL}/auto-greeting/customers/bulk-update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY,
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Backend response not ok:', response.status, response.statusText);
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error bulk updating customers:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update customers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
