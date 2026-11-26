import React from 'react';
import { X, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IS_MAC, IS_TOUCH } from '../../utils/constants';
import { KeyCombo } from './KeyboardKey';
import LicenseNotice from '../LicenseNotice';

const capitalize = (s) => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');

const InfoModal = ({ show, onClose, version, packageName }) => {
  const { t } = useTranslation();
  if (!show) return null;

  const mouseActions = IS_TOUCH ? [
    { parts: ['TAP'],                    desc: t('info.shortcuts.tapDesc') },
    { parts: ['PINCH'],                  desc: t('info.shortcuts.pinchDesc') },
    { parts: ['SWIPE'],                  desc: t('info.shortcuts.swipeDesc') },
  ] : IS_MAC ? [
    { parts: ['⌘', '+', 'CLICK'],       desc: t('info.shortcuts.ctrlClick') },
    { parts: ['⇧', '+', 'CLICK'],        desc: t('info.shortcuts.shiftClick') },
    { parts: ['⌘', '+', 'SCROLL'],      desc: t('info.shortcuts.ctrlScrollDesc') },
    { parts: ['⇧', '+', 'SCROLL'],       desc: t('info.shortcuts.shiftScrollDesc') },
  ] : [
    { parts: ['Ctrl', '+', 'CLICK'],     desc: t('info.shortcuts.ctrlClick') },
    { parts: ['Shift', '+', 'CLICK'],    desc: t('info.shortcuts.shiftClick') },
    { parts: ['Ctrl', '+', 'SCROLL'],    desc: t('info.shortcuts.ctrlScrollDesc') },
    { parts: ['Shift', '+', 'SCROLL'],   desc: t('info.shortcuts.shiftScrollDesc') },
  ];

  const shortcuts = IS_TOUCH ? [] : IS_MAC ? [
    { parts: ['⌘', '+', 'A'],           desc: t('info.shortcuts.ctrlA') },
    { parts: ['⌘', '+', '⌫'],          desc: t('info.shortcuts.delete') },
    { parts: ['⌘', '+', 'D'],           desc: t('info.shortcuts.duplicateDesc') },
    { parts: ['⌘', '+', 'Z'],           desc: t('info.shortcuts.undoDesc') },
    { parts: ['⇧', '+', '⌘', '+', 'Z'], desc: t('info.shortcuts.redoDesc') },
  ] : [
    { parts: ['Ctrl', '+', 'A'],         desc: t('info.shortcuts.ctrlA') },
    { parts: ['Delete'],                 desc: t('info.shortcuts.delete') },
    { parts: ['Ctrl', '+', 'D'],         desc: t('info.shortcuts.duplicateDesc') },
    { parts: ['Ctrl', '+', 'Z'],         desc: t('info.shortcuts.undoDesc') },
    { parts: ['Ctrl', '+', 'Y'],         desc: t('info.shortcuts.redoDesc') },
  ];

  return (
    <div data-testid="info-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-200 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-blue-50/60 dark:bg-blue-900/30">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center shrink-0">
                <Info size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 capitalize">{capitalize(packageName)}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t('info.version')} {version}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" aria-label={t('a11y.close')}><X size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

          <div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">{t('info.mouseTitle')}</div>
            <div className="space-y-2">
              {mouseActions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <KeyCombo parts={s.parts} />
                  <span className="text-slate-500 dark:text-slate-400">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {shortcuts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">{t('info.shortcutsTitle')}</div>
              <div className="space-y-2">
                {shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <KeyCombo parts={s.parts} />
                    <span className="text-slate-500 dark:text-slate-400">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <LicenseNotice className="text-xs text-slate-500 dark:text-slate-400 text-center pt-4 border-t border-slate-100 dark:border-slate-700/50" />
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
