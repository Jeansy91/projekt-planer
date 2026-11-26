import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { loadProjectFromLS, deleteProjectFromLS, loadProjectList } from '../utils/localStorage';
import { validateProject } from '../utils/validateProject';
import { getWeekNumber, getDateOfISOWeek } from '../utils/dateUtils';

const getCurrentWeekMonday = () => {
  const today = new Date();
  return getDateOfISOWeek(getWeekNumber(today), today.getFullYear()).toISOString();
};

// Project lifecycle — newProject / openProject / openFile / importFromJson /
// exportProject. Bulk loads go through the `replaceProject` seam (ADR-0002
// Project shape). View settings are per-user and applied separately from the
// View setters bag; exports do NOT carry View (ADR-0002).
export const useProjectLifecycle = (deps) => {
  const { t } = useTranslation();
  const {
    replaceProject,
    setHistory,
    setViewStartDate, setWeeksShown, setDensity, setUnassignedCollapsed,
    setFileHandle,
  } = deps;

  const applyOwnViewSettings = useCallback((data) => {
    setViewStartDate(data.viewStartDate || getCurrentWeekMonday());
    setWeeksShown(data.weeksShown || 12);
    setDensity(data.density || 0);
    setUnassignedCollapsed(data.unassignedGroupCollapsed || false);
  }, [setViewStartDate, setWeeksShown, setDensity, setUnassignedCollapsed]);

  const newProject = useCallback(async (storageType) => {
    const id = crypto.randomUUID();

    if (storageType === 'fileSystem') {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: 'planung.json' });
        setFileHandle(handle);
      } catch {
        return false;
      }
    } else {
      setFileHandle(null);
    }

    replaceProject({
      id,
      title: t('project.newTitle'),
      teams: [],
      tasks: [],
    });
    setViewStartDate(getCurrentWeekMonday());
    setWeeksShown(12);
    setDensity(0);
    setUnassignedCollapsed(false);
    if (setHistory) setHistory([]);
    return true;
  }, [t, setFileHandle, replaceProject, setViewStartDate, setWeeksShown, setDensity, setUnassignedCollapsed, setHistory]);

  const openProject = useCallback((idToLoad) => {
    const loaded = loadProjectFromLS(idToLoad);
    if (!loaded) return false;
    const project = validateProject(loaded);
    replaceProject(project);
    if (setHistory) setHistory(project.history);
    applyOwnViewSettings(loaded);
    setFileHandle(null);
    return true;
  }, [replaceProject, setHistory, applyOwnViewSettings, setFileHandle]);

  const openFile = useCallback(async () => {
    try {
      const [handle] = await window.showOpenFilePicker();
      const file = await handle.getFile();
      const content = JSON.parse(await file.text());
      setFileHandle(handle);
      const project = validateProject(
        { ...content, id: crypto.randomUUID() },
        { fallbackTitle: t('project.fallbackTitle') },
      );
      replaceProject(project);
      if (setHistory) setHistory(project.history);
      return true;
    } catch {
      return false;
    }
  }, [t, replaceProject, setHistory, setFileHandle]);

  const importFromJson = useCallback((content) => {
    const project = validateProject(
      { ...content, id: crypto.randomUUID() },
      { fallbackTitle: t('project.importedTitle') },
    );
    replaceProject(project);
    if (setHistory) setHistory(project.history);
    setFileHandle(null);
  }, [t, replaceProject, setHistory, setFileHandle]);

  // Per ADR-0002, exports contain a Project only — no per-user View settings
  // (which now includes unassignedCollapsed; see useProjectView).
  const exportProject = useCallback((projectTitle, tasks, teams, history) => {
    try {
      const payload = { projectTitle, tasks, teams };
      if (history) payload.history = history;
      const dataStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  }, []);

  const deleteProject = useCallback((idToDelete) => {
    return deleteProjectFromLS(idToDelete);
  }, []);

  const getProjectList = useCallback(() => loadProjectList(), []);

  return { newProject, openProject, openFile, importFromJson, exportProject, deleteProject, getProjectList };
};
