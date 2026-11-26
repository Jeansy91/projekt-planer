import React from 'react';
import { X, Info, Type, Calendar, Clock, Palette, Trash2, Check, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, taskBarStyle } from '../utils/constants';
import NotesEditor from './NotesEditor';

const TaskDetailsPanel = ({
  task,
  teams,
  onUpdate,
  onDelete,
  onClose,
  showColorPicker,
  onToggleColorPicker,
  colorPickerRef,
  width,
  canEdit = true
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === 'en' ? 'en-GB' : 'de-DE';

  if (!task) return null;

  return (
    <div data-testid="details-panel" className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col animate-in slide-in-from-right-4 duration-200 ${width ? 'shrink-0' : 'flex-1'}`} style={width ? { width, minWidth: '20rem' } : undefined}>
      <div className="h-12 px-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
        <h2 data-testid="details-panel-header" className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 text-sm"><Info size={16} className="text-blue-500 dark:text-blue-400" /> {t('details.title')}</h2>
        <button data-testid="close-details-btn" onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors" aria-label={t('a11y.close')}><X size={18} aria-hidden="true" /></button>
      </div>

      <div data-testid="details-panel-content" className="p-6 space-y-6 flex-1 flex flex-col overflow-y-auto">
        <div className="flex items-end gap-3 shrink-0">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2 tracking-wider">{t('details.labels.taskName')}</label>
            <div className="relative">
              <Type size={14} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
              <input
                data-testid="task-title-input"
                type="text"
                className={`w-full pl-9 pr-4 py-2 border rounded-lg text-sm font-medium outline-none transition-all ${canEdit ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-800/30 focus:border-blue-400 dark:focus:border-blue-500' : 'border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-400 cursor-default'}`}
                value={task.title}
                onChange={(e) => onUpdate(task.id, { title: e.target.value })}
                readOnly={!canEdit}
              />
            </div>
          </div>

          {canEdit && <div className="relative shrink-0" ref={colorPickerRef}>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2 tracking-wider">{t('details.labels.color')}</label>
            <button
              data-testid="color-picker-btn"
              onClick={() => onToggleColorPicker(!showColorPicker)}
              className={`h-10 w-10 rounded-full border-2 border-white dark:border-slate-800 shadow-md transition-transform active:scale-90 bg-${task.color}-400 dark:bg-${task.color}-700 flex items-center justify-center text-${task.color}-950 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700`}
              aria-label={t('a11y.colorPicker')}
              aria-expanded={showColorPicker}
              aria-haspopup="true"
            >
              <Palette size={16} aria-hidden="true" />
            </button>

            {showColorPicker && (
              <div className="absolute top-full mt-2 right-0 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[100] grid grid-cols-4 gap-2 min-w-[160px] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onUpdate(task.id, { color });
                      onToggleColorPicker(false);
                    }}
                    className={`h-7 w-7 rounded-full transition-all active:scale-95 flex items-center justify-center task-bar ${task.color === color ? 'outline-2 outline-offset-2 outline-slate-400 dark:outline-slate-500 scale-110' : 'hover:scale-110'}`}
                    style={taskBarStyle(color)}
                  >
                    {task.color === color && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>}
        </div>

        <div className="flex gap-4 shrink-0">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2 tracking-wider">{t('details.labels.start')}</label>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 p-2.5 rounded-lg border border-slate-100 dark:border-slate-600 flex items-center gap-2">
              <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="truncate">{new Date(task.startDate).toLocaleDateString(currentLocale, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2 tracking-wider">{t('details.labels.duration')}</label>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 p-2.5 rounded-lg border border-slate-100 dark:border-slate-600 flex items-center gap-2">
              <Clock size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{t('details.duration.weeks', { count: task.duration })}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2 tracking-wider">{t('details.labels.team')}</label>
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 p-2.5 rounded-lg border border-slate-100 dark:border-slate-600 flex items-center gap-2">
            <Users size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">{teams.find(tm => tm.id === task.teamId)?.name || t('teams.unassigned')}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col" data-testid="task-notes-wrapper">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2 tracking-wider">{t('details.labels.notes')}</label>
          <NotesEditor
            key={task.id}
            value={task.notes || ''}
            onChange={(json) => onUpdate(task.id, { notes: json })}
            canEdit={canEdit}
          />
        </div>

        {canEdit && (
          <div className="pt-2">
            <button
              data-testid="delete-task-btn"
              onClick={() => onDelete(task.id)}
              className="w-full py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> {t('details.actions.deleteTask')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailsPanel;
