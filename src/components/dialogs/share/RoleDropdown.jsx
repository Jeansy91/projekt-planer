import { useState, useEffect, useRef } from 'react';
import { Crown, Pencil, Eye, ChevronDown, Check } from 'lucide-react';

const ROLE_ICONS = { admin: Crown, editor: Pencil, viewer: Eye };

const RoleDropdown = ({ value, onChange, roles, t }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleOpen = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen(prev => !prev);
  };

  const RoleIcon = ROLE_ICONS[value] || Eye;
  const label = t(`share.role${value.charAt(0).toUpperCase() + value.slice(1)}`);

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all bg-white dark:bg-slate-800 shadow-sm cursor-pointer px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
      >
        <RoleIcon size={10} className="text-slate-400 dark:text-slate-500" />
        <span>{label}</span>
        <ChevronDown size={10} className={`text-slate-400 dark:text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="fixed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-[300] min-w-[160px] animate-in fade-in zoom-in-95 duration-150 origin-top-right"
          style={{ top: pos.top, right: pos.right }}
        >
          <div className="space-y-1">
            {roles.map(r => {
              const Icon = ROLE_ICONS[r] || Eye;
              const roleLabel = t(`share.role${r.charAt(0).toUpperCase() + r.slice(1)}`);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { onChange(r); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${value === r ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                >
                  <Icon size={12} />
                  <span className="flex-1">{roleLabel}</span>
                  {value === r && <Check size={14} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export { ROLE_ICONS };
export default RoleDropdown;
