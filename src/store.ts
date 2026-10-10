import type { AppState, Chat, Message } from './types';

export type Action =
  | { type: 'chat/ensure'; chat: Chat }
  | { type: 'message/add'; chatId: string; title?: string; message: Message }
  | { type: 'message/update'; chatId: string; id: string; patch: Partial<Message> }
  | { type: 'state/reset'; state: AppState };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'chat/ensure': {
      if (state.chats.some((c) => c.chatId === action.chat.chatId)) return state;
      return { ...state, chats: [action.chat, ...state.chats] };
    }
    case 'message/add': {
      const { chatId, message, title } = action;
      const existing = state.messages[chatId] ?? [];
      // Дедупликация по id (например, одно и то же уведомление пришло повторно)
      if (existing.some((m) => m.id === message.id)) return state;
      const list = [...existing, message];
      const chats = [...state.chats];
      const idx = chats.findIndex((c) => c.chatId === chatId);
      const updated: Chat = {
        chatId,
        title: idx >= 0 ? chats[idx].title : title || chatId,
        lastText: message.text,
        lastTime: message.timestamp,
      };
      if (idx >= 0) chats.splice(idx, 1);
      chats.unshift(updated);
      return { chats, messages: { ...state.messages, [chatId]: list } };
    }
    case 'message/update': {
      const list = state.messages[action.chatId] ?? [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.chatId]: list.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)),
        },
      };
    }
    case 'state/reset':
      return action.state;
    default:
      return state;
  }
}
