import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../utils/supabase';

const CHECK_INTERVAL_MS = 30000;

export const useCloudAvailability = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecked, setIsChecked] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let active = true;
    let checking = false;

    const checkAvailability = async () => {
      if (!navigator.onLine) {
        setIsAvailable(false);
        setIsChecked(true);
        return;
      }
      if (checking) return;

      checking = true;
      try {
        const { error } = await supabase.from('projects').select('id').limit(1);
        if (active) {
          setIsAvailable(navigator.onLine && !error);
          setIsChecked(true);
        }
      } catch (error) {
        if (active) {
          console.error('Supabase availability check failed:', error);
          setIsAvailable(false);
          setIsChecked(true);
        }
      } finally {
        checking = false;
      }
    };

    const handleOffline = () => {
      setIsAvailable(false);
      setIsChecked(true);
    };
    window.addEventListener('online', checkAvailability);
    window.addEventListener('offline', handleOffline);
    const intervalId = window.setInterval(checkAvailability, CHECK_INTERVAL_MS);
    checkAvailability();

    return () => {
      active = false;
      window.removeEventListener('online', checkAvailability);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(intervalId);
    };
  }, []);

  return { isAvailable, isChecked };
};
