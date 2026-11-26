import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ResetPasswordStep = ({ email, error, loading, sent, onSubmit, onBack, onClose }) => {
  const { t } = useTranslation();

  if (sent) {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center mx-auto">
          <Mail size={24} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="font-semibold text-slate-700 dark:text-slate-200">{t('auth.resetLinkSent')}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{t('auth.resetLinkSentDesc', { email })}</div>
        <button onClick={onClose} className="text-sm text-blue-500 hover:text-blue-700 font-medium">
          {t('auth.close')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        <ArrowLeft size={12} /> {t('auth.back')}
      </button>
      <div className="text-sm text-slate-500 dark:text-slate-400">{t('auth.resetPasswordDesc')}</div>
      <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <Mail size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{email}</span>
      </div>
      {error && <div className="text-xs text-red-500">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {t('auth.sendResetLink')}
      </button>
    </form>
  );
};

export default ResetPasswordStep;
