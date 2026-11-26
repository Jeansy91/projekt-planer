import React from 'react';
import { X, Database, HardDrive, Cloud, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NewProjectDialog = ({ show, onClose, onNewLS, onNewFile, onNewCloud, isFileSystemApiSupported, isAuthenticated, isCloudAvailable = true }) => {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-blue-50/60 dark:bg-blue-900/30">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center shrink-0">
                <Plus size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">{t('dialogs.newProject.title')}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t('dialogs.newProject.description')}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" aria-label={t('a11y.close')}><X size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <button
            data-testid="new-project-local"
            onClick={onNewLS}
            className="w-full flex items-center gap-3 p-4 border dark:border-slate-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 transition-all text-left"
          >
            <Database className="text-blue-500" />
            <div>
              <div className="font-bold text-sm dark:text-slate-200">{t('dialogs.newProject.localStorage')}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{t('dialogs.newProject.localStorageDesc')}</div>
            </div>
          </button>
          {isFileSystemApiSupported && (
            <button
              onClick={onNewFile}
              className="w-full flex items-center gap-3 p-4 border dark:border-slate-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-200 transition-all text-left"
            >
              <HardDrive className="text-green-500" />
              <div>
                <div className="font-bold text-sm dark:text-slate-200">{t('dialogs.newProject.fileSystem')}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{t('dialogs.newProject.fileSystemDesc')}</div>
              </div>
            </button>
          )}
          {isAuthenticated && (
            <button
              data-testid="new-project-cloud"
              onClick={onNewCloud}
              disabled={!isCloudAvailable}
              className="w-full flex items-center gap-3 p-4 border dark:border-slate-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-200 disabled:cursor-not-allowed disabled:opacity-50 transition-all text-left"
            >
              <Cloud className="text-purple-500" />
              <div>
                <div className="font-bold text-sm dark:text-slate-200">{t('cloud.newCloudProject')}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{isCloudAvailable ? t('cloud.newCloudProjectDesc') : t('offline.cloudUnavailable')}</div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewProjectDialog;
