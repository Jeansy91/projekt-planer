import { useEffect, useRef } from 'react';
import { MIN_WEEKS } from '../utils/constants';

// View gestures — wheel + touch input on the gantt container that mutate the
// **View** (docs/glossary.md). Two gesture families:
//   - zoom    → adjusts weeksShown (Ctrl/Cmd+wheel, pinch)
//   - navigate → calls shiftView (Shift+wheel, trackpad horizontal swipe, touch swipe)
// Both clamp weeksShown to [MIN_WEEKS, maxWeeks]; maxWeeks depends on the
// viewport (passed in, computed by App.jsx).

const WHEEL_SWIPE_THRESHOLD = 80;
const TOUCH_SWIPE_THRESHOLD = 60;
const PINCH_THRESHOLD = 30;

export const useViewGestures = ({ containerRef, setWeeksShown, shiftViewRef, maxWeeks }) => {
  const wheelAccumX = useRef(0);
  const wheelResetTimer = useRef(null);
  const touchState = useRef(null);
  const maxWeeksRef = useRef(maxWeeks);
  useEffect(() => { maxWeeksRef.current = maxWeeks; }, [maxWeeks]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const clampWeeks = (next) => Math.max(MIN_WEEKS, Math.min(maxWeeksRef.current, next));

    // ── Wheel ────────────────────────────────────────────────────────
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1 : -1;
        setWeeksShown(prev => clampWeeks(prev + delta));
        return;
      }

      // Shift+Wheel: navigate weeks. macOS swaps axes when Shift is held.
      if (e.shiftKey) {
        e.preventDefault();
        const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
        if (delta === 0) return;
        shiftViewRef.current?.(delta > 0 ? 1 : -1);
        return;
      }

      // Trackpad horizontal swipe.
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (absX > absY && absX > 1) {
        e.preventDefault();
        wheelAccumX.current += e.deltaX;
        if (Math.abs(wheelAccumX.current) >= WHEEL_SWIPE_THRESHOLD) {
          shiftViewRef.current?.(wheelAccumX.current > 0 ? 1 : -1);
          wheelAccumX.current = 0;
        }
        clearTimeout(wheelResetTimer.current);
        wheelResetTimer.current = setTimeout(() => { wheelAccumX.current = 0; }, 200);
      }
    };

    // ── Touch ────────────────────────────────────────────────────────
    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchState.current = { type: 'pinch', initialDistance: Math.hypot(dx, dy) };
        e.preventDefault();
      } else if (e.touches.length === 1) {
        touchState.current = {
          type: 'swipe',
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          locked: false,
        };
      }
    };

    const handleTouchMove = (e) => {
      if (!touchState.current) return;

      if (touchState.current.type === 'pinch' && e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.hypot(dx, dy);
        const delta = distance - touchState.current.initialDistance;

        if (Math.abs(delta) > PINCH_THRESHOLD) {
          const direction = delta > 0 ? -1 : 1;
          setWeeksShown(prev => clampWeeks(prev + direction));
          touchState.current.initialDistance = distance;
        }
        return;
      }

      if (touchState.current.type === 'swipe' && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - touchState.current.startX;
        const deltaY = e.touches[0].clientY - touchState.current.startY;

        if (!touchState.current.locked && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
          touchState.current.locked = true;
          touchState.current.horizontal = Math.abs(deltaX) > Math.abs(deltaY);
        }

        if (touchState.current.locked && touchState.current.horizontal) {
          e.preventDefault();
          if (Math.abs(deltaX) >= TOUCH_SWIPE_THRESHOLD) {
            shiftViewRef.current?.(deltaX < 0 ? 1 : -1);
            touchState.current.startX = e.touches[0].clientX;
            touchState.current.startY = e.touches[0].clientY;
          }
        }
      }
    };

    const handleTouchEnd = () => { touchState.current = null; };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      clearTimeout(wheelResetTimer.current);
    };
  }, []);
};
