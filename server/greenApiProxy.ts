// Общая логика прокси до API инстанса GREEN-API.
const ALLOWED_HOST = /^[a-z0-9-]+\.api\.green-api\.com$/i;

export function isAllowedHost(host: string | undefined): host is string {
  return typeof host === 'string' && ALLOWED_HOST.test(host);
}

export interface ProxyResult {
  status: number;
  contentType: string | null;
  body: Uint8Array;
}

export async function forwardToGreenApi(opts: {
  method: string;
  host: string;
  path: string;
  contentType?: string;
  body?: Uint8Array;
}): Promise<ProxyResult> {
  const headers: Record<string, string> = {};
  if (opts.contentType) headers['Content-Type'] = opts.contentType;
  const hasBody = opts.body && opts.body.length > 0 && opts.method !== 'GET' && opts.method !== 'HEAD';
  const res = await fetch(`https://${opts.host}${opts.path}`, {
    method: opts.method,
    headers,
    body: hasBody ? (opts.body as BodyInit) : undefined,
  });
  return {
    status: res.status,
    contentType: res.headers.get('content-type'),
    body: new Uint8Array(await res.arrayBuffer()),
  };
}