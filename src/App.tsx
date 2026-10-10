import { useCallback, useEffect, useReducer, useState } from 'react';
import type { Credentials, Message } from './types';
import { checkAccount, deleteNotification, extractText, getStateInstance, receiveNotification, sendMessage } from './api';
import type { NotificationBody } from './api';
import { reducer } from './store';
import { clearState, emptyState, loadCredentials, loadState, saveCredentials, saveState } from './storage';
import { LoginForm } from './components/LoginForm';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { NewChatForm } from './components/NewChatForm';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [creds, setCreds] = useState<Credentials | null>(() => loadCredentials());
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Сохранение состояния при каждом изменении
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Получение входящих: ReceiveNotification → обработка → DeleteNotification
  useEffect(() => {
    if (!creds) return;
    let active = true;

    const handle = (body: NotificationBody) => {
      if (body.typeWebhook !== 'incomingMessageReceived' && body.typeWebhook !== 'outgoingMessageReceived') return;
      const text = extractText(body);
      const chatId = body.senderData?.chatId;
      if (!text || !chatId || !body.idMessage) return;
      const fromMe = body.typeWebhook === 'outgoingMessageReceived';
      const title = body.senderData?.senderContactName || body.senderData?.senderName || body.senderData?.chatName;
      const message: Message = {
        id: body.idMessage,
        chatId,
        text,
        fromMe,
        timestamp: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
        status: 'sent',
      };
      dispatch({ type: 'message/add', chatId, title, message });
    };

    (async () => {
      while (active) {
        try {
          const notification = await receiveNotification(creds, 5);
          if (!active) break;
          if (notification) {
            handle(notification.body);
            await deleteNotification(creds, notification.receiptId);
          }
          setReceiveError(null);
        } catch (e) {
          if (!active) break;
          setReceiveError(e instanceof Error ? e.message : 'Ошибка получения сообщений');
          await sleep(3000);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [creds]);

  const handleLogin = useCallback(async (c: Credentials) => {
    const stateInstance = await getStateInstance(c);
    if (stateInstance !== 'authorized') {
      throw new Error(
        stateInstance === 'notAuthorized'
          ? 'Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API.'
          : `Инстанс недоступен (статус: ${stateInstance}).`,
      );
    }
    saveCredentials(c);
    dispatch({ type: 'state/reset', state: loadState() });
    setCreds(c);
  }, []);

  const handleLogout = () => {
    saveCredentials(null);
    clearState();
    dispatch({ type: 'state/reset', state: emptyState });
    setSelectedChatId(null);
    setShowNewChat(false);
    setCreds(null);
  };

  const handleCreateChat = async (phone: string) => {
    if (!creds) return;
    const res = await checkAccount(creds, phone);
    if (!res.exist || !res.chatId) {
      throw new Error('Аккаунт MAX с таким номером не найден');
    }
    dispatch({
      type: 'chat/ensure',
      chat: { chatId: res.chatId, title: `+${phone}`, lastText: '', lastTime: Date.now() },
    });
    setSelectedChatId(res.chatId);
    setShowNewChat(false);
  };

  const handleSend = async (text: string) => {
    if (!creds || !selectedChatId) return;
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const message: Message = {
      id: tmpId,
      chatId: selectedChatId,
      text,
      fromMe: true,
      timestamp: Date.now(),
      status: 'sending',
    };
    dispatch({ type: 'message/add', chatId: selectedChatId, message });
    setSendError(null);
    try {
      const res = await sendMessage(creds, selectedChatId, text);
      dispatch({
        type: 'message/update',
        chatId: selectedChatId,
        id: tmpId,
        patch: { id: res.idMessage, status: 'sent' },
      });
    } catch (e) {
      dispatch({ type: 'message/update', chatId: selectedChatId, id: tmpId, patch: { status: 'error' } });
      setSendError(e instanceof Error ? e.message : 'Не удалось отправить сообщение');
    }
  };

  if (!creds) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const selectedChat = state.chats.find((c) => c.chatId === selectedChatId) ?? null;

  return (
    <div className="app">
      <aside className={`sidebar ${selectedChat ? 'sidebar--hidden-mobile' : ''}`}>
        <div className="sidebar__header">
          <span className="sidebar__title">Чаты</span>
          <div className="sidebar__actions">
            <button className="btn btn--primary btn--small" onClick={() => setShowNewChat(true)}>
              + Новый чат
            </button>
            <button className="icon-btn" title="Выйти" onClick={handleLogout}>
              ⎋
            </button>
          </div>
        </div>
        {receiveError && <div className="banner banner--error">Получение: {receiveError}</div>}
        <ChatList chats={state.chats} selectedChatId={selectedChatId} onSelect={setSelectedChatId} />
      </aside>

      <main className="main">
        {selectedChat ? (
          <ChatView
            chat={selectedChat}
            messages={state.messages[selectedChat.chatId] ?? []}
            onSend={handleSend}
            onBack={() => setSelectedChatId(null)}
            sendError={sendError}
          />
        ) : (
          <div className="empty">
            <div className="empty__icon">💬</div>
            <div>Выберите чат или создайте новый</div>
          </div>
        )}
      </main>

      {showNewChat && (
        <NewChatForm onCreate={handleCreateChat} onClose={() => setShowNewChat(false)} />
      )}
    </div>
  );
}
