export const colors = ['rose', 'orange', 'yellow', 'lime', 'emerald', 'cyan', 'blue', 'violet', 'fuchsia', 'slate'];

// Maps legacy color names to their modern equivalents
export const LEGACY_COLOR_MAP = {
  red: 'rose',
  amber: 'yellow',
  teal: 'cyan',
  sky: 'cyan',
  indigo: 'blue',
  purple: 'violet',
  pink: 'fuchsia',
};

// -700 in dark mode ensures WCAG AA contrast (≥4.5:1) for all color tokens including yellow/lime/emerald
export const taskBarStyle = (color) => ({
  '--task-bar-bg': `var(--color-${color}-400)`,
  '--task-bar-dark-bg': `var(--color-${color}-700)`,
});

export const taskBarTextClass = (color) => `text-${color}-950 dark:text-white`;

export const MIN_WEEKS = 4;
export const MAX_WEEKS = 52;
export const ROW_HEIGHT = 36;
export const ROW_GAP = 8;

export const DENSITY_LEVELS = [
  { key: 'comfortable', rowHeight: 36, rowGap: 8 },
  { key: 'compact', rowHeight: 28, rowGap: 6 },
  { key: 'dense', rowHeight: 22, rowGap: 4 },
];
export const STAGING_TASK_DURATION = 4;
export const TASK_INSET = 2;

export const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const IS_ANDROID = /Android/.test(navigator.userAgent);
export const IS_TOUCH = IS_IOS || IS_ANDROID;
export const IS_MAC = !IS_TOUCH && /Mac/.test(navigator.userAgent);

export const AUTHOR_NAME = 'Jeansy91';
export const AUTHOR_URL = 'https://github.com/Jeansy91';
export const SOURCE_CODE_URL = 'https://github.com/Jeansy91/projekt-planer';
