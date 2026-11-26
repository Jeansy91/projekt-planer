import { MouseLeft, Mouse, MousePointerClick, GripHorizontal, Pointer, Expand, MoveHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const baseClass = (dashed) =>
  `inline-flex items-center justify-center w-7 h-7 rounded-md shadow-[0_1px_0_1px_rgba(0,0,0,0.08)] ${dashed ? 'bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500' : 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`;

export const Key = ({ children, dashed }) => {
  const len = typeof children === 'string' ? children.length : 0;
  const widthClass = len <= 2 ? 'w-7' : 'min-w-[52px] px-2';
  return (
    <kbd className={`inline-flex items-center justify-center ${widthClass} h-7 text-[11px] font-mono font-semibold rounded-md shadow-[0_1px_0_1px_rgba(0,0,0,0.08)] ${dashed ? 'bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500' : 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>
      {children}
    </kbd>
  );
};

const makeIconKey = (Icon) => ({ dashed, title }) => (
  <span className={baseClass(dashed)} title={title}><Icon size={14} /></span>
);

export const ClickKey    = makeIconKey(MouseLeft);
export const DblClickKey = makeIconKey(MousePointerClick);
export const DragKey     = makeIconKey(GripHorizontal);
export const ScrollKey   = makeIconKey(Mouse);
export const TapKey      = makeIconKey(Pointer);
export const PinchKey    = makeIconKey(Expand);
export const SwipeKey    = makeIconKey(MoveHorizontal);

const ICON_TOKENS = {
  CLICK:    'info.shortcuts.clickKey',
  DBLCLICK: 'info.shortcuts.dblClickKey',
  DRAG:     'info.shortcuts.dragKey',
  SCROLL:   'info.shortcuts.scrollKey',
  TAP:      'info.shortcuts.tapKey',
  PINCH:    'info.shortcuts.pinchKey',
  SWIPE:    'info.shortcuts.swipeKey',
};

const ICON_COMPONENTS = { CLICK: ClickKey, DBLCLICK: DblClickKey, DRAG: DragKey, SCROLL: ScrollKey, TAP: TapKey, PINCH: PinchKey, SWIPE: SwipeKey };

export const KeyCombo = ({ parts, dashed }) => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 shrink-0 min-w-30">
      {parts.map((part, i) => {
        if (part === '+' || part === '/') return <span key={i} className={`text-xs ${dashed ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'}`}>{part}</span>;
        const IconComp = ICON_COMPONENTS[part];
        if (IconComp) return <IconComp key={i} dashed={dashed} title={t(ICON_TOKENS[part])} />;
        return <Key key={i} dashed={dashed}>{part}</Key>;
      })}
    </span>
  );
};
