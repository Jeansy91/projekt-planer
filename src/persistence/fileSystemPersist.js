const DEBOUNCE_MS = 1000;

export const createFileSystemAdapter = (fileHandle, setSaveStatus, includeHistory = false) => {
  let timer = null;
  let latestState = null;

  const writeNow = async () => {
    if (!latestState || !fileHandle) return;
    const { projectTitle, tasks, teams, unassignedGroupCollapsed, viewStartDate, weeksShown, density, history } = latestState;
    setSaveStatus('saving');
    try {
      const payload = { projectTitle, tasks, teams, unassignedGroupCollapsed, viewStartDate, weeksShown, density };
      if (includeHistory && history) {
        payload.history = history;
      }
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  return {
    save(state) {
      latestState = state;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { writeNow(); timer = null; }, DEBOUNCE_MS);
    },
    flush() {
      if (timer) { clearTimeout(timer); timer = null; writeNow(); }
    },
    destroy() {
      if (timer) { clearTimeout(timer); timer = null; }
    },
  };
};
