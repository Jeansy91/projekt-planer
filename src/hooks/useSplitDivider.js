import { useState, useRef, useEffect } from 'react';

export const useSplitDivider = (splitContainerRef, splitDividerRef) => {
  const [detailsPanelWidth, setDetailsPanelWidth] = useState(320);
  const splitDragRef = useRef(null);

  useEffect(() => {
    const divider = splitDividerRef.current;
    const handleMouseDown = (e) => {
      if (!divider || !divider.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      const panel = splitContainerRef.current?.querySelector('[data-testid="details-panel"]');
      const startWidth = panel ? panel.getBoundingClientRect().width : 320;
      splitDragRef.current = { startX: e.clientX, startWidth };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };
    const handleMouseMove = (e) => {
      if (!splitDragRef.current || !splitContainerRef.current) return;
      const { startX, startWidth } = splitDragRef.current;
      const delta = startX - e.clientX;
      const containerRect = splitContainerRef.current.getBoundingClientRect();
      const dividerWidth = divider ? divider.getBoundingClientRect().width : 16;
      const gap = 12; // gap-3
      const minGrid = containerRect.width * 0.5;
      const minPanel = 320;
      const maxPanel = containerRect.width - minGrid - dividerWidth - gap * 2;
      const clamped = Math.max(minPanel, Math.min(maxPanel, startWidth + delta));
      setDetailsPanelWidth(clamped);
    };
    const handleMouseUp = () => { splitDragRef.current = null; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => { document.removeEventListener('mousedown', handleMouseDown, true); document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  });

  return { detailsPanelWidth };
};
