import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    const url = userId 
      ? `${API_BASE_URL}/auto-greeting/export-customers?userId=${userId}`
      : `${API_BASE_URL}/auto-greeting/export-customers`;

    // Get authorization header from the incoming request
    const authHeader = request.headers.get('authorization');
    
    const response = await fetch(url, {
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
    
    // Convert buffer to Uint8Array
    const buffer = new Uint8Array(data.buffer);
    
    // Return file download response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': data.contentType,
        'Content-Disposition': `attachment; filename="${data.filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error exporting customers:', error);
    return NextResponse.json(
      { error: 'Failed to export customers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
