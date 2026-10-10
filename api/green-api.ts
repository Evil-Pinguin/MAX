// Vercel Serverless Function: проксирует /green-api/* на адрес инстанса GREEN-API.
// Подключается через rewrite в vercel.json: /green-api/:path* -> /api/green-api?__p=:path*
import { forwardToGreenApi, isAllowedHost } from '../server/greenApiProxy';

/* eslint-disable @typescript-eslint/no-explicit-any */
async function readBody(req: any): Promise<Uint8Array> {
  if (req.method === 'GET' || req.method === 'HEAD') return new Uint8Array();
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export default async function handler(req: any, res: any) {
  const host = req.headers['x-green-api-host'];
  if (!isAllowedHost(host)) {
    res.status(400).json({ message: 'Некорректный адрес инстанса' });
    return;
  }
  const url = new URL(req.url, 'http://localhost');
  const rest = url.searchParams.get('__p') ?? '';
  url.searchParams.delete('__p');
  const qs = url.searchParams.toString();
  const path = `/${rest}${qs ? `?${qs}` : ''}`;

  const result = await forwardToGreenApi({
    method: req.method,
    host,
    path,
    contentType: req.headers['content-type'],
    body: await readBody(req),
  });
  if (result.contentType) res.setHeader('Content-Type', result.contentType);
  res.status(result.status).send(Buffer.from(result.body));
}
