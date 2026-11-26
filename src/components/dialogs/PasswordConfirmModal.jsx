import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';

const PasswordConfirmModal = ({ open, title, email, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!password || loading) return;
    setError('');
    setLoading(true);
    const result = await onConfirm(password);
    if (result?.error) {
      setError(result.error === 'invalid_password' ? t('settings.security.wrongPassword') : (result.error || t('settings.security.wrongPassword')));
      setLoading(false);
    }
  }, [password, loading, onConfirm, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <Lock size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title || t('settings.security.confirmPassword')}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('settings.security.confirmPasswordDesc')}</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <input type="email" autoComplete="username" value={email || ''} readOnly className="hidden" tabIndex={-1} aria-hidden="true" />
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('settings.security.currentPassword')}
            autoComplete="current-password"
            className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-800"
            onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
          />
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={!password || loading}
              className="flex-1 h-9 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? '...' : t('settings.security.confirm')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-9 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('dialogs.delete.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordConfirmModal;
