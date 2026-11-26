// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useUndoRedo } from './useUndoRedo';

// Composes useUndoRedo with React state slots so a test can drive the hook
// the way App.jsx does: setTasks/setTeams flow back into the hook on rerender.
const setup = ({
  initialTasks = [],
  initialTeams = [],
  initialTitle = 'Untitled',
  projectId = 'p1',
  user = { id: 'u1' },
} = {}) => {
  return renderHook(() => {
    const [tasks, setTasks] = useState(initialTasks);
    const [teams, setTeams] = useState(initialTeams);
    const [projectTitle, setProjectTitle] = useState(initialTitle);
    const [history, setHistory] = useState([]);
    const undo = useUndoRedo(
      tasks, teams, setTasks, setTeams, projectId, projectTitle, setProjectTitle,
      setHistory, user, undefined, undefined, { current: history }
    );
    return { tasks, setTasks, teams, setTeams, projectTitle, setProjectTitle, history, undo };
  });
};

const task = (id, overrides = {}) => ({
  id, title: `T-${id}`, startDate: '2026-01-05', duration: 1,
  color: 'blue', teamId: null, laneId: null, notes: '', position: 0,
  ...overrides,
});

describe('useUndoRedo — debounced commits', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('records a history entry after the debounce window', () => {
    const { result } = setup();
    act(() => { result.current.setTasks([task('a')]); });
    expect(result.current.history).toHaveLength(0); // not yet debounced

    act(() => { vi.advanceTimersByTime(900); });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toMatchObject({ action: 'created', entityType: 'task', entityId: 'a' });
  });

  it('coalesces rapid edits into a single debounced entry', () => {
    const { result } = setup({ initialTasks: [task('a', { title: 'A' })] });
    act(() => { result.current.setTasks([task('a', { title: 'B' })]); });
    act(() => { vi.advanceTimersByTime(400); });
    act(() => { result.current.setTasks([task('a', { title: 'C' })]); });
    act(() => { vi.advanceTimersByTime(900); });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].changes.title).toEqual({ from: 'A', to: 'C' });
  });

  it('skips detection when suppressDetection is called', () => {
    const { result } = setup();
    act(() => {
      result.current.undo.suppressDetection();
      result.current.setTasks([task('a')]);
    });
    act(() => { vi.advanceTimersByTime(900); });
    expect(result.current.history).toHaveLength(0);
  });

  it('flushPending commits without waiting for the debounce', () => {
    const { result } = setup();
    act(() => { result.current.setTasks([task('a')]); });
    expect(result.current.history).toHaveLength(0);
    act(() => { result.current.undo.flushPending(); });
    expect(result.current.history).toHaveLength(1);
  });
});

describe('useUndoRedo — undo / redo', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('undo reverts the last committed change and populates redo', () => {
    const { result } = setup({ initialTasks: [task('a', { title: 'A' })] });
    act(() => { result.current.setTasks([task('a', { title: 'A2' })]); });
    act(() => { vi.advanceTimersByTime(900); });
    expect(result.current.undo.canUndo).toBe(true);

    act(() => { result.current.undo.undo(); });
    expect(result.current.tasks[0].title).toBe('A');
    expect(result.current.undo.canRedo).toBe(true);
    expect(result.current.history).toHaveLength(0);

    act(() => { result.current.undo.redo(); });
    expect(result.current.tasks[0].title).toBe('A2');
    expect(result.current.history).toHaveLength(1);
  });

  it('a new edit clears the redo stack', () => {
    const { result } = setup({ initialTasks: [task('a', { title: 'A' })] });
    act(() => { result.current.setTasks([task('a', { title: 'A2' })]); });
    act(() => { vi.advanceTimersByTime(900); });
    act(() => { result.current.undo.undo(); });
    expect(result.current.undo.canRedo).toBe(true);

    act(() => { result.current.setTasks([task('a', { title: 'A3' })]); });
    act(() => { vi.advanceTimersByTime(900); });
    expect(result.current.undo.canRedo).toBe(false);
  });
});

describe('useUndoRedo — commitDirect', () => {
  it('commits immediately and skips debounce', () => {
    const { result } = setup({ initialTasks: [task('a')] });
    const next = [task('a'), task('b')];
    act(() => {
      result.current.setTasks(next);
      result.current.undo.commitDirect(next, result.current.teams);
    });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toMatchObject({ action: 'created', entityId: 'b' });
  });
});

describe('useUndoRedo — project switch', () => {
  it('clears undo / redo stacks on project id change', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ pid }) => {
      const [tasks, setTasks] = useState([task('a')]);
      const [teams, setTeams] = useState([]);
      const [title, setTitle] = useState('p');
      const [history, setHistory] = useState([]);
      const undo = useUndoRedo(
        tasks, teams, setTasks, setTeams, pid, title, setTitle,
        setHistory, { id: 'u1' }, undefined, undefined, { current: history }
      );
      return { tasks, setTasks, undo, history };
    }, { initialProps: { pid: 'p1' } });

    act(() => { result.current.setTasks([task('a'), task('b')]); });
    act(() => { vi.advanceTimersByTime(900); });
    expect(result.current.undo.canUndo).toBe(true);

    act(() => { rerender({ pid: 'p2' }); });
    expect(result.current.undo.canUndo).toBe(false);
    expect(result.current.undo.canRedo).toBe(false);
    vi.useRealTimers();
  });
});

describe('useUndoRedo — restoreToEntry', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('restores to an in-session entry via snapshot', () => {
    const { result } = setup({ initialTasks: [task('a', { title: 'A' })] });
    act(() => { result.current.setTasks([task('a', { title: 'A2' })]); });
    act(() => { vi.advanceTimersByTime(900); });
    act(() => { result.current.setTasks([task('a', { title: 'A3' })]); });
    act(() => { vi.advanceTimersByTime(900); });

    const firstEntry = result.current.history[result.current.history.length - 1];
    act(() => { result.current.undo.restoreToEntry(firstEntry.id); });
    expect(result.current.tasks[0].title).toBe('A2');
  });

  it('canRestoreEntry returns false for the most recent entry (no-op)', () => {
    const { result } = setup({ initialTasks: [task('a', { title: 'A' })] });
    act(() => { result.current.setTasks([task('a', { title: 'A2' })]); });
    act(() => { vi.advanceTimersByTime(900); });
    const newest = result.current.history[0];
    expect(result.current.undo.canRestoreEntry(newest.id)).toBe(false);
  });
});
