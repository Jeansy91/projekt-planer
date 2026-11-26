import { useEffect } from 'react';
import { IS_MAC } from '../utils/constants';

export const useKeyboardShortcuts = (tasks, selectedTaskIds, setSelectedTaskIds, showDeleteConfirm, onRequestDelete, onDuplicate, canEdit = true, undo, redo) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (!canEdit) return;

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo?.();
        return;
      }
      // Redo: Ctrl+Y (Win) / Cmd+Shift+Z (Mac)
      if ((IS_MAC && e.metaKey && e.shiftKey && e.key === 'z') || (!IS_MAC && e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        redo?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && selectedTaskIds.length > 0) {
        e.preventDefault();
        setSelectedTaskIds(tasks.map(tk => tk.id));
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedTaskIds.length > 0) {
        e.preventDefault();
        onDuplicate(selectedTaskIds);
      }

      const isDeleteKey = IS_MAC
        ? (e.metaKey && e.key === 'Backspace')
        : (e.key === 'Delete');
      if (isDeleteKey && selectedTaskIds.length > 0 && !showDeleteConfirm) {
        e.preventDefault();
        onRequestDelete(selectedTaskIds);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskIds, tasks, showDeleteConfirm, setSelectedTaskIds, onRequestDelete, onDuplicate, canEdit, undo, redo]);
};
