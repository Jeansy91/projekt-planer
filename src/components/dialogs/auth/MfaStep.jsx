import { Lock, Shield, LogOut, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MfaStep = ({ mfaCode, setMfaCode, error, loading, onSubmit, onSignOut }) => {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <Shield size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
        <div className="text-sm text-slate-600 dark:text-slate-300">{t('auth.mfaDesc')}</div>
      </div>
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <input
          type="text"
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder={t('settings.security.codePlaceholder')}
          aria-label={t('settings.security.codePlaceholder')}
          className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono tracking-widest bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
          autoComplete="one-time-code"
          autoFocus
        />
      </div>
      {error && <div className="text-xs text-red-500">{error}</div>}
      <button
        type="submit"
        disabled={loading || mfaCode.length !== 6}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {t('settings.security.verify')}
      </button>
      <button
        type="button"
        onClick={onSignOut}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors"
      >
        <LogOut size={16} />
        {t('auth.signOut')}
      </button>
    </form>
  );
};

export default MfaStep;
