import { useTranslation } from 'react-i18next';

const ConfirmOverlay = ({ content, onCancel }) => {
  const { t } = useTranslation();
  if (!content) return null;

  return (
    <div className="absolute inset-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex items-center justify-center p-6 rounded-2xl z-10">
      <div className="text-center space-y-4 max-w-xs">
        <div className={`w-12 h-12 rounded-full ${content.iconBg} flex items-center justify-center mx-auto`}>
          {content.icon}
        </div>
        <div className="text-sm text-slate-700 dark:text-slate-200">{content.message}</div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {t('dialogs.delete.cancel')}
          </button>
          <button
            onClick={content.onConfirm}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${content.confirmClass}`}
          >
            {content.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmOverlay;
