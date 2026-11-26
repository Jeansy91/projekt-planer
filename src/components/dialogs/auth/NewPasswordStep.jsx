import { Lock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const INPUT_CLASS = "w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700";

const NewPasswordStep = ({ email, password, setPassword, passwordConfirm, setPasswordConfirm, error, loading, onSubmit }) => {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="email" autoComplete="username" value={email} readOnly className="hidden" tabIndex={-1} aria-hidden="true" />
      <div className="text-sm text-slate-500 dark:text-slate-400">{t('auth.setNewPasswordDesc')}</div>
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.newPasswordPlaceholder')}
          aria-label={t('auth.newPasswordPlaceholder')}
          className={INPUT_CLASS}
          autoComplete="new-password"
          required
          autoFocus
        />
      </div>
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <input
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder={t('auth.passwordConfirmPlaceholder')}
          aria-label={t('auth.passwordConfirmPlaceholder')}
          className={INPUT_CLASS}
          autoComplete="new-password"
          required
        />
      </div>
      {error && <div className="text-xs text-red-500">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {t('auth.savePassword')}
      </button>
    </form>
  );
};

export default NewPasswordStep;
