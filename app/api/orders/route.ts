import { NextRequest } from 'next/server';

// Proxy GET /api/orders -> {API_BASE}/orders
export async function GET(req: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return new Response(JSON.stringify({ message: 'API base URL not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const auth = req.headers.get('authorization') ?? '';
  const url = new URL(req.url);
  const target = `${apiBase}/orders?${url.searchParams.toString()}`;

  try {
    const res = await fetch(target, {
      headers: {
        authorization: auth,
      },
      cache: 'no-store',
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: 'Upstream request failed' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}
