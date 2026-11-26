import { Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const INPUT_CLASS = "w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700";

const RegisterStep = ({ email, displayName, setDisplayName, password, setPassword, passwordConfirm, setPasswordConfirm, error, loading, onSubmit, onBack }) => {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        <ArrowLeft size={12} /> {t('auth.back')}
      </button>
      <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <Mail size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{email}</span>
      </div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{t('auth.createAccount')}</div>
      <div className="relative">
        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <input
          data-testid="auth-display-name-input"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('auth.displayNamePlaceholder')}
          aria-label={t('auth.displayNamePlaceholder')}
          className={INPUT_CLASS}
          autoComplete="name"
          required
          autoFocus
        />
      </div>
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <input
          data-testid="auth-password-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.passwordPlaceholder')}
          aria-label={t('auth.passwordPlaceholder')}
          className={INPUT_CLASS}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <input
          data-testid="auth-password-confirm-input"
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
        data-testid="auth-register-btn"
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {t('auth.register')}
      </button>
    </form>
  );
};

export default RegisterStep;
