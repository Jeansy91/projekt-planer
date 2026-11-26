import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, Sun, Moon, Monitor } from 'lucide-react';
import { DENSITY_LEVELS, taskBarStyle } from '../../utils/constants';

const SAMPLE_LANES = [
  { name: 'Sprint 1', tasks: [
    { title: 'Design Review', color: 'blue', leftPct: 8, widthPct: 50 },
  ]},
  { name: 'Sprint 2', tasks: [
    { title: 'Development', color: 'emerald', leftPct: 18, widthPct: 38 },
    { title: 'Testing', color: 'violet', leftPct: 58, widthPct: 28 },
  ]},
];

const THEME_OPTIONS = [
  { key: 'system', icon: Monitor },
  { key: 'light', icon: Sun },
  { key: 'dark', icon: Moon },
];

const DisplaySection = ({ theme, onThemeChange, resolvedTheme, onDensityChange }) => {
  const { t } = useTranslation();

  const [densityLocal, setDensityLocal] = useState(() => {
    const stored = localStorage.getItem('user_density');
    return stored != null ? Number(stored) : 0;
  });

  const handleDensityChange = useCallback((index) => {
    setDensityLocal(index);
    localStorage.setItem('user_density', String(index));
    onDensityChange?.(index);
  }, [onDensityChange]);

  const activeDensity = DENSITY_LEVELS[densityLocal] || DENSITY_LEVELS[0];
  const activeTheme = theme || 'system';
  const previewDark = resolvedTheme === 'dark';

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">{t('settings.display.title')}</h2>

      {/* Theme selector */}
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">{t('settings.display.theme')}</label>
      <div className="flex gap-2 mb-6">
        {THEME_OPTIONS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            data-testid={`theme-${key}`}
            onClick={() => onThemeChange?.(key)}
            className={`h-9 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTheme === key
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Icon size={14} />
            {t(`settings.display.theme${key.charAt(0).toUpperCase() + key.slice(1)}`)}
          </button>
        ))}
      </div>

      {/* Density selector */}
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">{t('settings.display.rowHeight')}</label>
      <div className="flex gap-2 mb-6">
        {DENSITY_LEVELS.map((level, idx) => (
          <button
            key={level.key}
            onClick={() => handleDensityChange(idx)}
            className={`h-9 px-4 rounded-lg text-xs font-semibold transition-colors ${
              densityLocal === idx
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {t(`calendar.density.${level.key}`)}
          </button>
        ))}
      </div>

      {/* Unified preview — reflects both density and theme */}
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{t('settings.display.preview')}</label>
      <div className={previewDark ? 'dark' : ''}>
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 transition-colors">
          {SAMPLE_LANES.map((lane, li) => {
            const laneHeight = activeDensity.rowHeight + 8;
            return (
              <div key={li} className="relative border-b border-slate-100/40 dark:border-slate-700/40 last:border-b-0">
                <div className="relative w-full overflow-hidden" style={{ minHeight: laneHeight, paddingTop: 4, paddingBottom: 4 }}>
                  {lane.tasks.map((task, ti) => (
                    <div
                      key={ti}
                      className="absolute rounded-lg task-bar text-[11px] font-bold shadow-sm"
                      style={{
                        ...taskBarStyle(task.color),
                        left: `${task.leftPct}%`,
                        width: `${task.widthPct}%`,
                        top: 4,
                        height: activeDensity.rowHeight,
                      }}
                    >
                      <div className="flex items-center w-full h-full rounded-lg px-2 overflow-hidden">
                        <GripVertical size={12} className="mr-1 shrink-0 opacity-30 dark:opacity-60" />
                        <span className="whitespace-nowrap truncate select-none block leading-none">{task.title}</span>
                      </div>
                    </div>
                  ))}

                  <div className="absolute top-1/2 -translate-y-1/2 left-1 z-20">
                    <div
                      className="flex items-center bg-slate-50 dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 rounded-md shadow-sm px-1"
                      style={{ height: activeDensity.rowHeight - 4, width: 90 }}
                    >
                      <GripVertical size={11} className="shrink-0 text-slate-300 dark:text-slate-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate whitespace-nowrap select-none px-1">
                        {lane.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DisplaySection;
