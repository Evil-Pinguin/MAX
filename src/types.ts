export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  /** Адрес API инстанса из кабинета, например https://3100.api.green-api.com */
  apiUrl?: string;
}

export type MessageStatus = 'sending' | 'sent' | 'error';

export interface Message {
  /** idMessage из GREEN-API (для отправленных — временный id до ответа API) */
  id: string;
  chatId: string;
  text: string;
  fromMe: boolean;
  timestamp: number;
  status?: MessageStatus;
}

export interface Chat {
  chatId: string;
  title: string;
  lastText: string;
  lastTime: number;
}

export interface AppState {
  chats: Chat[];
  messages: Record<string, Message[]>;
}
