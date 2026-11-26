import { useEffect, useRef } from 'react';
import { createLocalStorageAdapter } from './localStoragePersist';
import { createFileSystemAdapter } from './fileSystemPersist';

// Unified persistence dispatcher for local-disk targets (localStorage / FileSystem).
// Cloud sync lives in useCloudSync and is wired separately — it is not an adapter
// because it owns bidirectional state (Pending flushes, Echo filter) that has no
// analogue in the disk adapters.
const createAdapter = (storageType, { fileHandle, setSaveStatus, includeHistoryInFile }) => {
  switch (storageType) {
    case 'local': return createLocalStorageAdapter();
    case 'file':  return createFileSystemAdapter(fileHandle, setSaveStatus, includeHistoryInFile);
    default:      return null;
  }
};

export const usePersistence = ({
  state,
  storageType,
  fileHandle,
  setSaveStatus,
  initialLoadDone,
  includeHistoryInFile,
}) => {
  const adapterRef = useRef(null);
  const prevTypeRef = useRef(null);
  const prevFileHandleRef = useRef(null);
  const prevIncludeHistoryRef = useRef(null);

  if (prevTypeRef.current !== storageType || prevFileHandleRef.current !== fileHandle || prevIncludeHistoryRef.current !== includeHistoryInFile) {
    adapterRef.current?.destroy();
    adapterRef.current = createAdapter(storageType, { fileHandle, setSaveStatus, includeHistoryInFile });
    prevTypeRef.current = storageType;
    prevFileHandleRef.current = fileHandle;
    prevIncludeHistoryRef.current = includeHistoryInFile;
  }

  const { projectId, projectTitle, tasks, teams, unassignedGroupCollapsed, viewStartDate, weeksShown, density, history } = state;
  useEffect(() => {
    if (!initialLoadDone?.current) return;
    adapterRef.current?.save(state);
  }, [projectId, projectTitle, tasks, teams, unassignedGroupCollapsed, viewStartDate, weeksShown, density, history]);

  useEffect(() => {
    const handler = () => adapterRef.current?.flush();
    window.addEventListener('beforeunload', handler);
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('focus', handler);
    };
  }, []);

  useEffect(() => {
    return () => adapterRef.current?.destroy();
  }, []);
};
