// Vercel Serverless Function: проксирует /green-api/* на адрес инстанса GREEN-API.
const ALLOWED_HOST = /^[a-z0-9-]+\.api\.green-api\.com$/i;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function readBody(req: any): Promise<Uint8Array | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk));
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  if (total === 0) return undefined;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export default async function handler(req: any, res: any) {
  try {
    const host = req.headers['x-green-api-host'];
    if (typeof host !== 'string' || !ALLOWED_HOST.test(host)) {
      res.status(400).json({ message: 'Некорректный адрес инстанса' });
      return;
    }
    const url = new URL(req.url ?? '/', 'http://localhost');
    const rest = url.searchParams.get('__p') ?? '';
    url.searchParams.delete('__p');
    const qs = url.searchParams.toString();
    const target = `https://${host}/${rest}${qs ? `?${qs}` : ''}`;

    const headers: Record<string, string> = {};
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

    const body = await readBody(req);
    const upstream = await fetch(target, { method: req.method, headers, body: body as any });
    const buf = new Uint8Array(await upstream.arrayBuffer());

    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    res.status(upstream.status);
    res.end(Buffer.from(buf));
  } catch (e) {
    res.status(502).json({ message: e instanceof Error ? e.message : 'Ошибка прокси' });
  }
}