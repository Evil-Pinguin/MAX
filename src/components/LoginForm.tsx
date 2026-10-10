import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Credentials } from '../types';

interface Props {
  onLogin: (c: Credentials) => Promise<void>;
}

export function LoginForm({ onLogin }: Props) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setToken] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin({
        idInstance: idInstance.trim(),
        apiTokenInstance: apiTokenInstance.trim(),
        apiUrl: apiUrl.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__logo">MAX</div>
        <h1 className="login__title">Вход в чат</h1>
        <p className="login__hint">Параметры инстанса из личного кабинета GREEN-API (console.green-api.com)</p>

        <label className="field">
          <span>idInstance</span>
          <input
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            inputMode="numeric"
            placeholder="1101000001"
            required
          />
        </label>
        <label className="field">
          <span>apiTokenInstance</span>
          <input
            value={apiTokenInstance}
            onChange={(e) => setToken(e.target.value)}
            type="password"
            autoComplete="off"
            required
          />
        </label>

        <label className="field">
          <span>apiUrl (необязательно)</span>
          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://3100.api.green-api.com"
          />
        </label>

        {error && <div className="banner banner--error">{error}</div>}

        <button className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'Проверка…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
