import type { Chat } from '../types';

interface Props {
  chats: Chat[];
  selectedChatId: string | null;
  onSelect: (chatId: string) => void;
}

function formatTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export function ChatList({ chats, selectedChatId, onSelect }: Props) {
  if (chats.length === 0) {
    return <div className="chat-list__empty">Чатов пока нет. Нажмите «+», чтобы создать новый.</div>;
  }
  return (
    <ul className="chat-list">
      {chats.map((chat) => (
        <li key={chat.chatId}>
          <button
            className={`chat-item ${chat.chatId === selectedChatId ? 'chat-item--active' : ''}`}
            onClick={() => onSelect(chat.chatId)}
          >
            <div className="avatar">{chat.title.replace(/\D/g, '').slice(-2) || '?'}</div>
            <div className="chat-item__body">
              <div className="chat-item__row">
                <span className="chat-item__title">{chat.title}</span>
                <span className="chat-item__time">{formatTime(chat.lastTime)}</span>
              </div>
              <div className="chat-item__preview">{chat.lastText || 'Нет сообщений'}</div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
