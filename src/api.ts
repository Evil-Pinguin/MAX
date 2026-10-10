import type { Credentials } from './types';

/**
 * Базовый путь API. Запросы идут на /green-api/... и пересылаются прокси
 * (vite.config.ts в dev/preview, api/green-api.ts на Vercel) на адрес инстанса.
 */
const BASE: string = import.meta.env.VITE_API_BASE ?? '/green-api';

export class ApiError extends Error {}

/** Хост API инстанса: из apiUrl из кабинета либо по первым 4 цифрам idInstance. */
export function instanceHost(c: Credentials): string {
  if (c.apiUrl) {
    try {
      return new URL(c.apiUrl).host;
    } catch {
      /* fall through */
    }
  }
  return `${c.idInstance.slice(0, 4)}.api.green-api.com`;
}

function methodUrl(c: Credentials, method: string, suffix = ''): string {
  return `${BASE}/waInstance${encodeURIComponent(c.idInstance)}/${method}/${encodeURIComponent(
    c.apiTokenInstance,
  )}${suffix}`;
}

function call(c: Credentials, method: string, suffix: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('X-Green-Api-Host', instanceHost(c));
  return fetch(methodUrl(c, method, suffix), { ...init, headers });
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const d = data as Record<string, unknown> | string | null;
    const msg =
      (typeof d === 'object' && d && (d.message as string | undefined)) ||
      (typeof d === 'object' && d && (d.reason as string | undefined)) ||
      (typeof d === 'string' && d) ||
      `Ошибка запроса (HTTP ${res.status})`;
    throw new ApiError(String(msg));
  }
  return data as T;
}

/** Проверка авторизации инстанса. Возвращает stateInstance, например "authorized". */
export async function getStateInstance(c: Credentials): Promise<string> {
  const res = await call(c, 'getStateInstance', '');
  const data = await parse<{ stateInstance?: string }>(res);
  return data?.stateInstance ?? 'unknown';
}

/** Проверка наличия аккаунта MAX по номеру телефона (RU/BY). Возвращает chatId. */
export async function checkAccount(
  c: Credentials,
  phoneNumber: string,
): Promise<{ exist: boolean; chatId: string }> {
  const res = await call(c, 'checkAccount', '', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: Number(phoneNumber) }),
  });
  return parse(res);
}

/** Отправка текстового сообщения. Возвращает idMessage. */
export async function sendMessage(
  c: Credentials,
  chatId: string,
  message: string,
): Promise<{ idMessage: string }> {
  const res = await call(c, 'sendMessage', '', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });
  return parse(res);
}

export interface IncomingNotification {
  receiptId: number;
  body: NotificationBody;
}

/** Получение одного уведомления из очереди (long polling, до 5 секунд). null — если очередь пуста. */
export async function receiveNotification(
  c: Credentials,
  receiveTimeout = 5,
): Promise<IncomingNotification | null> {
  const res = await call(c, 'receiveNotification', `?receiveTimeout=${receiveTimeout}`);
  const data = await parse<IncomingNotification | null>(res);
  return data && typeof data === 'object' && 'receiptId' in data ? data : null;
}

/** Подтверждение обработки уведомления. */
export async function deleteNotification(c: Credentials, receiptId: number): Promise<boolean> {
  const res = await call(c, 'deleteNotification', `/${receiptId}`, { method: 'DELETE' });
  const data = await parse<{ result?: boolean }>(res);
  return Boolean(data?.result);
}

/* ---------- Типы уведомлений (нужные поля) ---------- */

export interface NotificationBody {
  typeWebhook: string;
  timestamp?: number;
  idMessage?: string;
  senderData?: {
    chatId?: string;
    chatName?: string;
    sender?: string;
    senderName?: string;
    senderContactName?: string;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
  };
}

/** Извлекает текст из текстового входящего/исходящего уведомления или null, если это не текст. */
export function extractText(body: NotificationBody): string | null {
  const md = body.messageData;
  if (!md) return null;
  if (md.typeMessage === 'textMessage') return md.textMessageData?.textMessage ?? null;
  if (md.typeMessage === 'extendedTextMessage') return md.extendedTextMessageData?.text ?? null;
  return null;
}
