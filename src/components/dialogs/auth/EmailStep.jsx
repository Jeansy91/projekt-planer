import { Mail, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EmailStep = ({ email, setEmail, error, loading, onSubmit }) => {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-sm text-slate-500 dark:text-slate-400">{t('auth.enterEmail')}</div>
      <div className="relative">
        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <input
          data-testid="auth-email-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.emailPlaceholder')}
          aria-label={t('auth.emailPlaceholder')}
          className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
          autoComplete="email"
          required
          autoFocus
        />
      </div>
      {error && <div className="text-xs text-red-500">{error}</div>}
      <button
        data-testid="auth-submit-btn"
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {t('auth.continue')}
      </button>
    </form>
  );
};

export default EmailStep;
