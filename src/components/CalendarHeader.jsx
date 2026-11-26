import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, Settings2, Check, Rows3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DENSITY_LEVELS } from '../utils/constants';

const CalendarHeader = ({
  monthHeaders,
  weekData,
  onPrevWeek,
  onToday,
  onNextWeek,
  weeksShown,
  onWeeksChange,
  maxWeeks = 52,
  showZoomMenu,
  onToggleZoomMenu,
  zoomMenuRef,
  scrollbarWidth = 0,
  currentWeekIdx = -1,
  density = 0,
  onDensityChange
}) => {
  const { t } = useTranslation();
  const [showDensityMenu, setShowDensityMenu] = useState(false);
  const densityMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (densityMenuRef.current && !densityMenuRef.current.contains(e.target)) {
        setShowDensityMenu(false);
      }
    };
    if (showDensityMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDensityMenu]);

  return (
    <div data-testid="calendar-header" className="relative z-40 border-b bg-slate-50/50 dark:bg-slate-800/50">
      <div className="flex justify-between items-center px-4 h-12 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-1">
          <button data-testid="prev-week-btn" onClick={onPrevWeek} className="p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors" aria-label={t('a11y.prevWeek')} title={t('a11y.prevWeek')}><ChevronLeft size={18} aria-hidden="true" /></button>
          <button data-testid="today-btn" onClick={onToday} className="px-2 py-0.5 text-[10px] font-bold uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded transition-colors">{t('calendar.today')}</button>
          <button data-testid="next-week-btn" onClick={onNextWeek} className="p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors" aria-label={t('a11y.nextWeek')} title={t('a11y.nextWeek')}><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mx-auto">{t('calendar.schedule')}</span>
        <div className="flex items-center gap-2">
          <div className="relative z-10" ref={densityMenuRef}>
            <button
              data-testid="density-btn"
              onClick={() => setShowDensityMenu(prev => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm group"
              aria-label={t('a11y.density')}
              aria-expanded={showDensityMenu}
              aria-haspopup="listbox"
            >
              <Rows3 size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400" aria-hidden="true" />
              <span className="hidden md:inline w-18 text-left">{t(`calendar.density.${DENSITY_LEVELS[density].key}`)}</span>
              <Settings2 size={12} className="ml-1 opacity-50 hidden md:inline" aria-hidden="true" />
            </button>

            {showDensityMenu && (
              <div data-testid="density-dropdown" role="listbox" aria-label={t('a11y.density')} className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl p-3 z-[100] min-w-[200px] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1">{t('calendar.density.label')}</div>
                <div className="space-y-1">
                  {DENSITY_LEVELS.map((level, idx) => (
                    <button
                      key={level.key}
                      role="option"
                      aria-selected={density === idx}
                      data-testid={`density-option-${level.key}`}
                      onClick={() => { onDensityChange(idx); setShowDensityMenu(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex justify-between items-center transition-colors ${density === idx ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                      {t(`calendar.density.${level.key}`)}
                      {density === idx && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        <div className="relative z-10" ref={zoomMenuRef}>
          <button
            data-testid="zoom-btn"
            onClick={() => onToggleZoomMenu(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm group"
            aria-label={t('a11y.zoom')}
            aria-expanded={showZoomMenu}
            aria-haspopup="listbox"
          >
            <ZoomIn size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400" aria-hidden="true" />
            <span className="hidden md:inline">{t('calendar.zoom.display', { count: weeksShown })}</span>
            <Settings2 size={12} className="ml-1 opacity-50 hidden md:inline" aria-hidden="true" />
          </button>

          {showZoomMenu && (
            <div data-testid="zoom-dropdown" role="listbox" aria-label={t('a11y.zoom')} className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl p-3 z-[100] min-w-[200px] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1">{t('calendar.zoom.visibleRange')}</div>
              <div className="space-y-1">
                {[4, 8, 12, 16, 26, 52].filter(w => w <= maxWeeks).map(weeks => (
                  <button
                    key={weeks}
                    role="option"
                    aria-selected={weeksShown === weeks}
                    data-testid={`zoom-option-${weeks}`}
                    onClick={() => { onWeeksChange(weeks); onToggleZoomMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex justify-between items-center transition-colors ${weeksShown === weeks ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                  >
                    {t('calendar.zoom.weeks', { count: weeks })} {weeks === 52 ? t('calendar.zoom.oneYear') : weeks === 26 ? t('calendar.zoom.halfYear') : ''}
                    {weeksShown === weeks && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      <div className="flex bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 font-bold text-slate-600 dark:text-slate-300" style={scrollbarWidth ? { paddingRight: `calc(1rem + ${scrollbarWidth}px)` } : undefined}>
        {monthHeaders.map((month, idx) => (
          <div
            key={`${month.name}-${idx}`}
            className="p-2 text-center text-[11px] uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 last:border-r-0 truncate"
            style={{ flex: month.span }}
          >
            {month.name}
          </div>
        ))}
      </div>

      <div className="flex bg-slate-50/30 dark:bg-slate-800/30 px-4 border-b border-slate-100 dark:border-slate-700/50" style={scrollbarWidth ? { paddingRight: `calc(1rem + ${scrollbarWidth}px)` } : undefined}>
        {weekData.map((week, i) => (
          <div key={`${week.kw}-${week.mondayDate}`} className={`flex-1 py-1.5 text-center border-r border-slate-200/70 dark:border-slate-700/70 last:border-r-0 ${i === currentWeekIdx ? 'bg-slate-100/80 dark:bg-slate-700/50' : ''}`}>
            <div className={`text-[10px] font-bold uppercase tracking-tighter leading-none mb-1 ${i === currentWeekIdx ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
              <div className='flex flex-wrap justify-center items-center mb-1'>
                <div className="w-4 text-center">{t('calendar.calendarWeek')}</div>
                <div className="w-4 text-center">{ week.kw }</div>
              </div>
              <div className={`text-[9px] font-medium leading-none ${i === currentWeekIdx ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>{week.mondayDate}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarHeader;
