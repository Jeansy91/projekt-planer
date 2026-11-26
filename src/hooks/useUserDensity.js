import { useEffect, useRef } from 'react';

const LS_KEY = 'user_density';
const DEBOUNCE_MS = 500;

export const useUserDensity = (density, setDensity, user, sbProject) => {
  const loadedRef = useRef(false);
  const debounceRef = useRef(null);
  const prevDensityRef = useRef(null);

  // Load density on mount / user change
  useEffect(() => {
    if (loadedRef.current) return;

    if (user && sbProject) {
      sbProject.loadUserSettings().then(settings => {
        if (settings && settings.density != null) {
          setDensity(settings.density);
        } else {
          // Fallback to localStorage value for first-time authenticated user
          const stored = localStorage.getItem(LS_KEY);
          if (stored != null) setDensity(Number(stored));
        }
        loadedRef.current = true;
        prevDensityRef.current = settings?.density ?? density;
      });
    } else {
      const stored = localStorage.getItem(LS_KEY);
      if (stored != null) setDensity(Number(stored));
      loadedRef.current = true;
      prevDensityRef.current = stored != null ? Number(stored) : density;
    }
  }, [user, sbProject]);

  // Save density on change (debounced)
  useEffect(() => {
    if (!loadedRef.current) return;
    if (prevDensityRef.current === density) return;
    prevDensityRef.current = density;

    // Always save to localStorage (works for all users)
    localStorage.setItem(LS_KEY, String(density));

    // Save to Supabase for authenticated users
    if (user && sbProject) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        sbProject.saveUserSettings({ density });
      }, DEBOUNCE_MS);
    }
  }, [density, user, sbProject]);

  // Cleanup
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);
};
