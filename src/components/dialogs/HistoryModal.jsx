import { useState, useEffect } from 'react';
import { X, History, Plus, Pencil, Trash2, Copy, Move, ArrowLeftRight, RotateCcw, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getProfilesByIds } from '../../utils/supabaseMembers';

const ACTION_CONFIG = {
  created:    { icon: Plus,           color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  updated:    { icon: Pencil,         color: 'text-blue-500 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-900/30' },
  deleted:    { icon: Trash2,         color: 'text-red-500 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/30' },
  duplicated: { icon: Copy,           color: 'text-violet-500 dark:text-violet-400',   bg: 'bg-violet-50 dark:bg-violet-900/30' },
  moved:      { icon: Move,           color: 'text-orange-500 dark:text-orange-400',   bg: 'bg-orange-50 dark:bg-orange-900/30' },
  resized:    { icon: ArrowLeftRight, color: 'text-cyan-500 dark:text-cyan-400',       bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
};

const ENTITY_CONFIG = {
  task:    { badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  team:    { badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' },
  lane:    { badge: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300' },
  project: { badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
};

const groupByDate = (entries, t, locale) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = [];
  let currentLabel = null;
  let currentItems = [];

  for (const entry of entries) {
    const d = new Date(entry.timestamp);
    d.setHours(0, 0, 0, 0);
    let label;
    if (d >= today) label = t('history.today');
    else if (d >= yesterday) label = t('history.yesterday');
    else label = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

    if (label !== currentLabel) {
      if (currentItems.length > 0) groups.push({ label: currentLabel, items: currentItems });
      currentLabel = label;
      currentItems = [];
    }
    currentItems.push(entry);
  }
  if (currentItems.length > 0) groups.push({ label: currentLabel, items: currentItems });
  return groups;
};

const formatTime = (iso, locale) => {
  const d = new Date(iso);
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

const DATE_FIELDS = new Set(['startDate']);

const formatValue = (field, value, locale) => {
  if (DATE_FIELDS.has(field) && value && !isNaN(Date.parse(value))) {
    return new Date(value).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  if (field === 'duration' && typeof value === 'number') {
    return `${value}w`;
  }
  return String(value);
};

const ChangeDetail = ({ field, from, to, locale, t }) => {
  const fieldLabel = t(`history.fields.${field}`, { defaultValue: field });
  return (
    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
      <span className="text-slate-500 dark:text-slate-400">{fieldLabel}:</span>{' '}
      <span className="line-through text-slate-400/70 dark:text-slate-500/70">{formatValue(field, from, locale)}</span>
      {' → '}
      <span className="text-slate-600 dark:text-slate-300">{formatValue(field, to, locale)}</span>
    </div>
  );
};

const HistoryEntry = ({ entry, isCloud, profiles, onRestore, canRestore, confirmingId, onStartConfirm, onCancelConfirm, locale, t }) => {
  const confirming = confirmingId === entry.id;
  const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.updated;
  const Icon = config.icon;
  const userName = entry.userId ? profiles[entry.userId] : null;

  const handleRestore = () => {
    onRestore(entry.id);
    onCancelConfirm();
  };

  const entityConfig = ENTITY_CONFIG[entry.entityType] ?? ENTITY_CONFIG.task;

  return (
    <div className="group/entry flex flex-col py-2.5" data-testid="history-entry" data-entity={entry.entityType} data-action={entry.action}>
      {/* Main row: icon centered to content rows 1+2 */}
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
          <Icon size={13} className={config.color} />
        </div>
        <div className="w-px self-stretch bg-slate-100/70 dark:bg-slate-700/50 mx-1 shrink-0" />
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          {/* Row 1: Badge · Name _ Restore · Time */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[10px] font-semibold px-1.5 py-px rounded shrink-0 ${entityConfig.badge}`}>
              {t(`history.entities.${entry.entityType}`)}
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">{entry.entityName}</span>
            {!confirming && canRestore && (
              <button
                onClick={() => onStartConfirm(entry.id)}
                className="opacity-0 group-hover/entry:opacity-100 transition-opacity p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-300 shrink-0"
                aria-label={t('history.restoreLabel')}
                title={t('history.restoreLabel')}
              >
                <RotateCcw size={12} />
              </button>
            )}
            <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">{formatTime(entry.timestamp, locale)}</span>
          </div>
          {/* Row 2: Action · by */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{t(`history.actions.${entry.action}`)}</span>
            {isCloud && userName && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{t('history.by', { name: userName })}</span>
              </>
            )}
          </div>
          {/* Row 3+: Change details */}
          {entry.changes && Object.entries(entry.changes).filter(([field]) => field !== '_snapshot').length > 0 && (
            <div className="pl-3 mt-0.5">
              {Object.entries(entry.changes).filter(([field]) => field !== '_snapshot').map(([field, { from, to }]) => (
                <ChangeDetail key={field} field={field} from={from} to={to} locale={locale} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog — icon spacer + divider continue, dialog in content column */}
      {confirming && (
        <div className="flex gap-2 mt-2">
          <div className="w-7 shrink-0" />
          <div className="w-px bg-slate-100/70 dark:bg-slate-700/50 mx-1 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30">
              <TriangleAlert size={32} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">{t('history.restoreConfirm')}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleRestore}
                className="h-8 px-3 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 text-xs font-bold transition-colors"
              >
                {t('history.restoreYes')}
              </button>
              <button
                onClick={onCancelConfirm}
                className="h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
              >
                {t('history.restoreCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryModal = ({ show, onClose, history, storageType, onRestoreTo, canRestoreTo }) => {
  const { t, i18n } = useTranslation();
  const [profiles, setProfiles] = useState({});
  const [confirmingId, setConfirmingId] = useState(null);

  const userIdsKey = show && storageType === 'cloud'
    ? [...new Set(history.map(e => e.userId).filter(Boolean))].sort().join(',')
    : '';

  useEffect(() => {
    if (!show) { setConfirmingId(null); return; }
    if (!userIdsKey) return;
    getProfilesByIds(userIdsKey.split(',')).then(setProfiles);
  }, [show, userIdsKey]);

  const handleRestore = (entryId) => {
    onRestoreTo(entryId);
    onClose();
  };

  if (!show) return null;

  const locale = i18n.language === 'en' ? 'en-GB' : 'de-DE';
  const isCloud = storageType === 'cloud';
  const groups = groupByDate(history, t, locale);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-amber-50/60 dark:bg-amber-900/30">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center shrink-0">
                <History size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">{t('history.title')}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t('history.subtitle', { count: history.length })}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" aria-label={t('a11y.close')}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {groups.length === 0 ? (
            <div className="text-center py-8">
              <History size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500">{t('history.empty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{group.label}</div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {group.items.map((entry) => (
                      <HistoryEntry key={entry.id} entry={entry} isCloud={isCloud} profiles={profiles} onRestore={handleRestore} canRestore={canRestoreTo?.(entry.id) ?? true} confirmingId={confirmingId} onStartConfirm={setConfirmingId} onCancelConfirm={() => setConfirmingId(null)} locale={locale} t={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
