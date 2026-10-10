import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Chat, Message } from '../types';

const MAX_LENGTH = 4000;

interface Props {
  chat: Chat;
  messages: Message[];
  onSend: (text: string) => Promise<void>;
  onBack: () => void;
  sendError: string | null;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function ChatView({ chat, messages, onSend, onBack, sendError }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setText('');
    try {
      await onSend(value);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="chat">
      <header className="chat__header">
        <button className="icon-btn chat__back" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <div className="avatar avatar--sm">{chat.title.replace(/\D/g, '').slice(-2) || '?'}</div>
        <div className="chat__title">{chat.title}</div>
      </header>

      <div className="chat__messages">
        {messages.length === 0 && <div className="chat__placeholder">Сообщений пока нет</div>}
        {messages.map((m) => (
          <div key={m.id + m.timestamp} className={`bubble-row ${m.fromMe ? 'bubble-row--out' : ''}`}>
            <div className={`bubble ${m.fromMe ? 'bubble--out' : 'bubble--in'} ${m.status === 'error' ? 'bubble--error' : ''}`}>
              <div className="bubble__text">{m.text}</div>
              <div className="bubble__meta">
                {formatTime(m.timestamp)}
                {m.fromMe && m.status === 'sending' && ' · отправка…'}
                {m.fromMe && m.status === 'error' && ' · не отправлено'}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {sendError && <div className="banner banner--error chat__error">{sendError}</div>}

      <form className="composer" onSubmit={submit}>
        <textarea
          className="composer__input"
          value={text}
          maxLength={MAX_LENGTH}
          rows={1}
          placeholder="Написать сообщение"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="btn btn--primary composer__send" disabled={!text.trim() || sending} type="submit">
          Отправить
        </button>
      </form>
    </div>
  );
}
