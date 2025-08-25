// Proxy GET /api/orders/[id]/messages -> {API_BASE}/orders/[id]/messages
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return new Response(JSON.stringify({ message: 'API base URL not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
  const resolved = await params;
  const { id } = resolved;
  const auth = req.headers.get('authorization') ?? '';
  const target = `${apiBase}/orders/${encodeURIComponent(id)}/messages`;

  try {
    const res = await fetch(target, {
      headers: { authorization: auth },
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
