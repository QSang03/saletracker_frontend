import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchTerm, statusFilter, conversationTypeFilter, dateFilter } = body;

    // Get authorization header from the incoming request
    const authHeader = request.headers.get('authorization');
    
    const response = await fetch(`${API_BASE_URL}/auto-greeting/export-customers-filtered`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify({
        searchTerm,
        statusFilter,
        conversationTypeFilter,
        dateFilter
      }),
    });

    if (!response.ok) {
      console.error('Backend response not ok:', response.status, response.statusText);
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

      const data = await response.json();
      
      // If this is a request for data only (not file download), return the data
      if (request.headers.get('accept')?.includes('application/json')) {
        return NextResponse.json(data);
      }
      
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
    console.error('Error exporting filtered customers:', error);
    return NextResponse.json(
      { error: 'Failed to export filtered customers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
