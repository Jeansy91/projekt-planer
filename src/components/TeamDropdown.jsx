import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TeamDropdown = ({ task, teams, onUpdate }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allOptions = [{ id: 'none', name: t('teams.unassigned') }, ...teams];
  const selectedId = task.teamId || 'none';
  const selectedLabel = allOptions.find(o => o.id === selectedId)?.name || t('teams.unassigned');

  const handleSelect = (id) => {
    onUpdate(task.id, { teamId: id === 'none' ? null : id });
    setOpen(false);
  };

  return (
    <div className="shrink-0 relative" ref={ref}>
      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2 tracking-wider">{t('details.labels.team')}</label>
      <button
        data-testid="team-dropdown-btn"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={selectedId === 'none' ? 'text-slate-400 dark:text-slate-500 italic font-medium' : ''}>{selectedLabel}</span>
        <ChevronDown size={14} className={`text-slate-400 dark:text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div data-testid="team-dropdown-menu" role="listbox" aria-label={t('details.labels.assignTeam')} className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-[100] animate-in fade-in zoom-in-95 duration-150 origin-top">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1">{t('details.labels.assignTeam')}</div>
          <div className="space-y-1">
            {allOptions.map(option => (
              <button
                key={option.id}
                role="option"
                aria-selected={selectedId === option.id}
                data-testid={`team-option-${option.id}`}
                onClick={() => handleSelect(option.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center transition-colors ${option.id === 'none' ? 'italic' : ''} ${selectedId === option.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' : option.id === 'none' ? 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold'}`}
              >
                {option.name}
                {selectedId === option.id && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDropdown;
