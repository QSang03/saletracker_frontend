import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    
    // Get authorization header from the incoming request
    const authHeader = request.headers.get('authorization');
    
    const response = await fetch(`${API_BASE_URL}/auto-greeting/customers/${customerId}/message-history`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching customer message history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer message history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}