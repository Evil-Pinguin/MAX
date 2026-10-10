# testMAX — MAX Chat (тестовое задание: Frontend React)

Простой веб-интерфейс для отправки и получения **текстовых** сообщений в мессенджере MAX через [GREEN-API](https://green-api.com/max).
Внешний вид вдохновлён [web.max.ru](https://web.max.ru/).

## Возможности

- Вход по `idInstance` и `apiTokenInstance` из личного кабинета GREEN-API.
- Создание нового чата по номеру телефона получателя (проверка через метод `checkAccount`).
- Отправка текстовых сообщений методом `sendMessage`.
- Получение входящих текстовых сообщений методами `receiveNotification` + `deleteNotification` (HTTP API, long polling).
- История сообщений и список чатов сохраняются в `localStorage` браузера.

Не реализовано (намеренно, по требованиям): медиа, группы, редактирование, реакции.

## Стек

React 18, TypeScript, Vite. Без внешних UI-библиотек и без бэкенда (прокси только для обхода CORS).

## Локальный запуск

Требования: Node.js 18+ (рекомендуется 20+), npm.

```bash
git clone https://github.com/Evil-Pinguin/testMAX.git
cd testMAX
git checkout arena/c0d91606-testmax
npm install
npm run dev
```

Открыть http://localhost:5173 и ввести:

1. `idInstance`, `apiTokenInstance` и `apiUrl` из [личного кабинета](https://console.green-api.com/) GREEN-API (`apiUrl` вида `https://3100.api.green-api.com`; если поле не заполнить, адрес определяется по первым 4 цифрам `idInstance`).
2. Инстанс должен быть **авторизован** (QR-код из приложения MAX, см. [инструкцию](https://green-api.com/v3/docs/before-start/)).
3. Для получения ответов в настройках инстанса должна быть включена отправка входящих уведомлений
   (`incomingWebhook: yes`), а поле **webhookUrl должно быть пустым** — иначе `receiveNotification` вернёт ошибку.
   Настроить можно в личном кабинете или методом [SetSettings](https://green-api.com/v3/docs/api/account/SetSettings/).

Для production-сборки:

```bash
npm run build      # проверка типов + сборка в dist/
npm run preview    # предпросмотр на порту 4173 (тоже с прокси)
```

## Как это работает

- Все запросы к API идут на относительный путь `/green-api/...` с заголовком `X-Green-Api-Host` (адрес инстанса). Dev/preview-сервер Vite пересылает их прокси-плагином (`vite.config.ts`), на Vercel — serverless-функцией `api/green-api.ts` (rewrite в `vercel.json`). Браузер не упирается в CORS, а прокси принимает только хосты `*.api.green-api.com`.
- Netlify и другие статические хостинги без серверных функций этим прокси не поддерживаются.
- Поток получения: `GET receiveNotification?receiveTimeout=5` → обработка (`incomingMessageReceived` / `outgoingMessageReceived`, тип `textMessage` или `extendedTextMessage`) → `DELETE deleteNotification/{receiptId}`. Дубликаты отсекаются по `idMessage`.
- Параметры инстанса хранятся в `localStorage` — это удобно для теста, но не для продакшена. Кнопка «⎋» очищает данные.

## Структура

```
src/
  api.ts                 — вызовы GREEN-API (checkAccount, sendMessage, receiveNotification, deleteNotification, getStateInstance)
  store.ts               — reducer состояния чатов и сообщений
  storage.ts             — сохранение в localStorage
  types.ts               — типы
  App.tsx                — основная логика, цикл получения уведомлений
  components/            — LoginForm, ChatList, ChatView, NewChatForm
  styles.css
```

## Ограничения

- Номера для `checkAccount` — только РФ (+7) и РБ (+375) (ограничение GREEN-API).
- Один инстанс = один аккаунт MAX.
- Сообщения, пришедшие до входа, в очереди GREEN-API хранятся 24 часа.
