import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const { id } = await params;
    
    const response = await fetch(`${API_BASE_URL}/web/conversation/${id}/members?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': process.env.NEXT_PUBLIC_MASTER_KEY || 'nkcai',
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
    console.error('Error fetching conversation members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation members', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}