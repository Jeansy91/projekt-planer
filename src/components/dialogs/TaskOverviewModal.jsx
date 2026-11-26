import React from 'react';
import { X, Trash2, Calendar, Clock, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { extractPlainText } from '../../utils/notesUtils';

const TaskOverviewModal = ({ show, team, tasks, onClose, onDeleteTask }) => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === 'en' ? 'en-GB' : 'de-DE';

  if (!show || !team) return null;

  const teamTasks = tasks
    .filter(tk => String(tk.teamId) === String(team.id))
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const teamColor = team.color || 'blue';

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(currentLocale, { day: '2-digit', month: 'short', year: 'numeric' });

  const endDate = (iso, weeks) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + weeks * 7);
    return formatDate(d.toISOString());
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className={`px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-${teamColor}-50/60`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl bg-${teamColor}-100 flex items-center justify-center shrink-0`}>
                <ListChecks size={18} className={`text-${teamColor}-600`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 truncate">{team.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('teams.taskCount', { count: teamTasks.length })}</p>
              </div>
            </div>
            <button data-testid="close-task-overview" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" aria-label={t('a11y.close')}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="max-h-[60vh] overflow-y-auto" data-testid="task-overview-table">
          {teamTasks.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                <ListChecks size={20} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('dialogs.taskOverview.empty')}</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {teamTasks.map((task) => (
                <div
                  key={task.id}
                  data-testid={`overview-row-${task.id}`}
                  className="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all group"
                >
                  {/* Color accent bar */}
                  <div className={`w-1 self-stretch rounded-full bg-${task.color}-400 shrink-0`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate" title={task.title}>
                      {task.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-md px-2 py-0.5 min-w-[7.5rem]">
                        <Calendar size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="tabular-nums whitespace-nowrap">{formatDate(task.startDate)}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-md px-2 py-0.5 min-w-[7.5rem]">
                        <Calendar size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="tabular-nums whitespace-nowrap">{endDate(task.startDate, task.duration)}</span>
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-md px-2 py-0.5 whitespace-nowrap w-[5rem] justify-center">
                        <Clock size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="tabular-nums">{task.duration}</span> {t('dialogs.taskOverview.weeks')}
                      </span>
                    </div>
                    {task.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-1">{extractPlainText(task.notes)}</p>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    data-testid={`overview-delete-${task.id}`}
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0 self-center"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskOverviewModal;
