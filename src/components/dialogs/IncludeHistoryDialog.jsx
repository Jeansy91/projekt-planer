import React from 'react';
import { X, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const IncludeHistoryDialog = ({ show, onClose, onConfirm }) => {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-amber-50/60 dark:bg-amber-900/30">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center shrink-0">
                <History size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">{t('dialogs.includeHistory.title')}</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" aria-label={t('a11y.close')}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('dialogs.includeHistory.message')}</p>
          <div className="flex gap-3">
            <button onClick={() => onConfirm(false)} className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium">
              {t('dialogs.includeHistory.without')}
            </button>
            <button onClick={() => onConfirm(true)} className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors text-sm font-medium">
              {t('dialogs.includeHistory.with')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncludeHistoryDialog;
