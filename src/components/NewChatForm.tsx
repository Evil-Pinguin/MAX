import { useState } from 'react';
import type { FormEvent } from 'react';

/** Приводит номер к виду 7XXXXXXXXXX (РФ) или 375XXXXXXXXX (РБ). Возвращает null, если формат неверный. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (/^8\d{10}$/.test(digits)) digits = '7' + digits.slice(1);
  if (/^7\d{10}$/.test(digits)) return digits;
  if (/^375\d{9}$/.test(digits)) return digits;
  return null;
}

interface Props {
  onCreate: (phone: string) => Promise<void>;
  onClose: () => void;
}

export function NewChatForm({ onCreate, onClose }: Props) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const digits = normalizePhone(phone);
    if (!digits) {
      setError('Введите номер в формате 79991234567 (РФ) или 375291234567 (РБ). Номер с 8 тоже подойдёт.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onCreate(digits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать чат');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="modal__title">Новый чат</h2>
        <label className="field">
          <span>Номер телефона получателя</span>
          <input
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="79991234567 или 89991234567"
          />
        </label>
        <p className="login__hint">Номер должен быть зарегистрирован в MAX (поддерживаются номера РФ и РБ).</p>
        {error && <div className="banner banner--error">{error}</div>}
        <div className="modal__actions">
          <button type="button" className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn--primary" disabled={loading}>
            {loading ? 'Проверка…' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  );
}
