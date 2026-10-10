import type { AppState, Credentials } from './types';

const CREDS_KEY = 'maxchat.credentials';
const STATE_KEY = 'maxchat.state';
const MAX_MESSAGES_PER_CHAT = 300;

export function loadCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? (JSON.parse(raw) as Credentials) : null;
  } catch {
    return null;
  }
}

export function saveCredentials(c: Credentials | null): void {
  if (c) localStorage.setItem(CREDS_KEY, JSON.stringify(c));
  else localStorage.removeItem(CREDS_KEY);
}

export const emptyState: AppState = { chats: [], messages: {} };

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as AppState;
    return { chats: parsed.chats ?? [], messages: parsed.messages ?? {} };
  } catch {
    return emptyState;
  }
}

export function saveState(state: AppState): void {
  const trimmed: AppState = { chats: state.chats, messages: {} };
  for (const [chatId, list] of Object.entries(state.messages)) {
    trimmed.messages[chatId] = list.slice(-MAX_MESSAGES_PER_CHAT);
  }
  localStorage.setItem(STATE_KEY, JSON.stringify(trimmed));
}

export function clearState(): void {
  localStorage.removeItem(STATE_KEY);
}
