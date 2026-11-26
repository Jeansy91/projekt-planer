import React from 'react';
import { X, FolderOpen, Upload, Trash2, Cloud, Database, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const OpenProjectDialog = ({ show, onClose, localProjects, onLoad, onDelete, onFileInput, onFileOpen, isFileSystemApiSupported, fileInputRef, cloudProjects, onLoadCloud, onDeleteCloud }) => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === 'en' ? 'en-GB' : 'de-DE';
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-blue-50/60 dark:bg-blue-900/30">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center shrink-0">
                <FolderOpen size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">{t('dialogs.openProject.title')}</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" aria-label={t('a11y.close')}><X size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto p-4 space-y-2">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2 mb-2 flex items-center gap-1">
            <Database size={10} /> {t('dialogs.openProject.localProjects')}
          </div>
          {localProjects.length === 0 && <div className="p-4 text-center text-sm text-slate-400 dark:text-slate-500 italic">{t('dialogs.openProject.noProjects')}</div>}
          {localProjects.map(p => (
            <div key={p.id} className="group flex items-center gap-3 p-3 border dark:border-slate-700 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition-all">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center shrink-0">
                <Database size={14} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="cursor-pointer flex-1 min-w-0" onClick={() => onLoad(p.id)}>
                <div className="font-bold text-sm text-slate-700 dark:text-slate-300 truncate">{p.title}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('dialogs.openProject.lastModified', { date: new Date(p.lastModified).toLocaleString(currentLocale) })}</div>
              </div>
              <button
                data-testid={`delete-project-${p.id}`}
                onClick={() => onDelete(p.id)}
                className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {cloudProjects && cloudProjects.length > 0 && (
            <>
              <div className="pt-4 border-t dark:border-slate-700 mt-4">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2 mb-2 flex items-center gap-1">
                  <Cloud size={10} /> {t('cloud.cloudProjects')}
                </div>
              </div>
              {cloudProjects.map(p => (
                <div key={p.id} className="group flex items-center gap-3 p-3 border dark:border-slate-700 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/30 transition-all">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${p.shared ? 'bg-indigo-100' : 'bg-purple-100'}`}>
                    {p.shared ? <Share2 size={14} className="text-indigo-600" /> : <Cloud size={14} className="text-purple-600" />}
                  </div>
                  <div className="cursor-pointer flex-1 min-w-0" onClick={() => onLoadCloud(p.id)}>
                    <div className="font-bold text-sm text-slate-700 dark:text-slate-300 truncate flex items-center gap-2">
                      {p.title}
                      {p.shared && <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-bold uppercase">{p.role}</span>}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('dialogs.openProject.lastModified', { date: new Date(p.updated_at).toLocaleString(currentLocale) })}</div>
                  </div>
                  {(p.role === 'owner' || p.role === 'admin') && onDeleteCloud && (
                    <button
                      onClick={() => onDeleteCloud(p.id)}
                      className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
          <div className="pt-4 border-t dark:border-slate-700 mt-4 space-y-2">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2 mb-2">{t('dialogs.openProject.externalSources')}</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fileInputRef.current.click()}
                className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                <Upload size={14} /> {t('dialogs.openProject.jsonImport')}
              </button>
              {isFileSystemApiSupported && (
                <button
                  onClick={onFileOpen}
                  className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  <FolderOpen size={14} /> {t('dialogs.openProject.openFile')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenProjectDialog;
