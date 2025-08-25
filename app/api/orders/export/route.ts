import { NextRequest } from 'next/server';

// Proxy GET /api/orders/export -> {API_BASE}/orders/export (streams file)
export async function GET(req: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return new Response('API base URL not configured', { status: 500 });
  }

  const auth = req.headers.get('authorization') ?? '';
  const url = new URL(req.url);
  const target = `${apiBase}/orders/export?${url.searchParams.toString()}`;

  try {
    const res = await fetch(target, {
      headers: { authorization: auth },
      cache: 'no-store',
    });

    // Pass through headers for file download
    const headers = new Headers();
    const contentType = res.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
    const disposition = res.headers.get('content-disposition');
    if (disposition) headers.set('content-disposition', disposition);

    return new Response(res.body, { status: res.status, headers });
  } catch (err) {
    return new Response('Upstream request failed', { status: 502 });
  }
}
