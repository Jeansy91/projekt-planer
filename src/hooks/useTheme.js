import { useState, useEffect, useCallback } from 'react';

const LS_KEY = 'user_theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

const applyTheme = (resolved) => {
  const root = document.documentElement;
  root.classList.add('no-transition');
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  // Remove after two frames so the browser has painted once without transitions
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-transition')));
};

const resolveTheme = (theme) => {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
};

export const useTheme = () => {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(LS_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(theme));

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(LS_KEY, newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia(MEDIA_QUERY);
    const handler = (e) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme, resolvedTheme };
};
