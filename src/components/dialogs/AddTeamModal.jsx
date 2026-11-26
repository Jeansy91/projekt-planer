import React, { useState } from 'react';
import { X, GanttChart, Waves, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AddTeamModal = ({ show, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [viewMode, setViewMode] = useState('gantt');

  if (!show) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), viewMode);
    setName('');
    setViewMode('gantt');
  };

  const handleClose = () => {
    setName('');
    setViewMode('gantt');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-blue-50/60 dark:bg-blue-900/30">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center shrink-0">
                <Users size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">{t('dialogs.addTeam.title')}</h3>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" aria-label={t('a11y.close')}><X size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">{t('dialogs.addTeam.nameLabel')}</label>
            <input
              autoFocus
              data-testid="add-team-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') handleClose(); }}
              className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-800/30 dark:bg-slate-900 dark:text-slate-100"
              placeholder={t('dialogs.addTeam.namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">{t('dialogs.addTeam.viewModeLabel')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                data-testid="viewmode-gantt"
                type="button"
                onClick={() => setViewMode('gantt')}
                className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all text-left ${viewMode === 'gantt' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
              >
                <GanttChart size={24} className={viewMode === 'gantt' ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'} />
                <div className="text-center">
                  <div className="font-bold text-sm">{t('dialogs.addTeam.ganttTitle')}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{t('dialogs.addTeam.ganttDesc')}</div>
                </div>
              </button>
              <button
                data-testid="viewmode-swimlane"
                type="button"
                onClick={() => setViewMode('swimlane')}
                className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all text-left ${viewMode === 'swimlane' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
              >
                <Waves size={24} className={viewMode === 'swimlane' ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'} />
                <div className="text-center">
                  <div className="font-bold text-sm">{t('dialogs.addTeam.swimlaneTitle')}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{t('dialogs.addTeam.swimlaneDesc')}</div>
                </div>
              </button>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={handleClose} className="py-2 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">{t('dialogs.addTeam.cancel')}</button>
            <button
              data-testid="add-team-submit"
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('dialogs.addTeam.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTeamModal;
