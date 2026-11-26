import { useState, useEffect } from 'react';

export const useContainerResize = (containerRef) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
      setScrollbarWidth(el.offsetWidth - el.clientWidth);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    setScrollbarWidth(el.offsetWidth - el.clientWidth);
    return () => ro.disconnect();
  }, []);

  return { containerWidth, scrollbarWidth };
};
