import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DeleteConfirmDialog = ({ show, onClose, onConfirm, message }) => {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <div data-testid="confirm-modal" className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-red-50/60 dark:bg-red-900/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">{t('dialogs.delete.title')}</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" aria-label={t('a11y.close')}><X size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{message || t('dialogs.delete.defaultMessage')}</p>
          <div className="flex gap-3">
            <button data-testid="confirm-cancel-btn" onClick={onClose} className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">{t('dialogs.delete.cancel')}</button>
            <button data-testid="confirm-delete-btn" onClick={onConfirm} className="flex-1 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg text-sm font-semibold transition-colors">{t('dialogs.delete.confirm')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;
