import { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const useCloudBoot = ({
  urlProjectId, user, sbProject, authLoading, isSupabaseConfigured, isCloudAvailable, isCloudAvailabilityChecked,
  setProjectId, setProjectTitle, setTasks, setTeams,
  setUnassignedGroupCollapsed, setViewStartDate, setWeeksShown,
  setCloudOwnerId, setProjectRole, setStorageType,
  viewStartDateIso, openProject, newProject, importFromJson, setFileHandle,
  onAskIncludeHistory,
  suppressDetection,
  seedTitleBaseline,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const urlBootDone = useRef(false);
  // True from the first render of a project URL until every state update of the
  // boot has been applied, so nothing is editable while the project is half loaded.
  const [isProjectLoading, setIsProjectLoading] = useState(() => {
    const s = location.state;
    return !!urlProjectId && !(s?.newLocal || s?.importedJson || s?.newFile || s?.openFileData);
  });

  useEffect(() => {
    if (urlBootDone.current || !urlProjectId) return;

    // Handle new local project from landing page
    if (location.state?.newLocal) {
      urlBootDone.current = true;
      suppressDetection?.();
      setProjectId(urlProjectId);
      setProjectTitle(t('project.newTitle'));
      setTasks([]);
      setTeams([]);
      setStorageType('local');
      return;
    }

    // Handle imported JSON file from landing page
    if (location.state?.importedJson) {
      urlBootDone.current = true;
      importFromJson(location.state.importedJson);
      setStorageType('local');
      return;
    }

    // Handle new file system project from landing/dashboard
    if (location.state?.newFile) {
      urlBootDone.current = true;
      newProject('fileSystem').then(ok => {
        if (ok) {
          setStorageType('file');
          if (onAskIncludeHistory) onAskIncludeHistory();
        }
        else { navigate('/', { replace: true }); }
      });
      return;
    }

    // Handle pre-picked file from landing/dashboard
    if (location.state?.openFileData) {
      urlBootDone.current = true;
      const handle = window.__pendingFileHandle || null;
      delete window.__pendingFileHandle;
      importFromJson(location.state.openFileData);
      if (handle) {
        // Restore file handle for auto-save
        setFileHandle(handle);
        setStorageType('file');
      } else {
        setStorageType('local');
      }
      return;
    }

    // Try loading as local project first
    if (openProject(urlProjectId)) {
      urlBootDone.current = true;
      setIsProjectLoading(false);
      setStorageType('local');
      return;
    }

    // Try loading as cloud project (needs auth)
    if (!sbProject || !user) {
      // No cloud support and not a local project → redirect home
      if (!isSupabaseConfigured) { navigate('/', { replace: true }); return; }
      // Auth still loading → wait for it to resolve
      if (authLoading) return;
      // Auth loaded but no user → redirect to home with project param to prompt login/registration
      navigate(`/?project=${urlProjectId}`, { replace: true });
      return;
    }
    if (!isCloudAvailabilityChecked) return;
    if (!isCloudAvailable) {
      navigate('/', { replace: true });
      return;
    }
    urlBootDone.current = true;
    setIsProjectLoading(true);
    sbProject.loadProject(urlProjectId).then(async (data) => {
      if (!data) { navigate('/', { replace: true }); return; }
      suppressDetection?.();

      // Load per-user view settings (zoom, scroll position, collapsed teams)
      const userSettings = await sbProject.loadUserProjectSettings(urlProjectId);

      let loadedTeams = data.teams;
      if (userSettings) {
        // Apply user-specific collapsed state to teams
        const collapsedSet = new Set(userSettings.collapsedTeamIds || []);
        loadedTeams = loadedTeams.map(t => ({ ...t, collapsed: collapsedSet.has(t.id) }));
        setUnassignedGroupCollapsed(userSettings.unassignedCollapsed || false);
        setViewStartDate(userSettings.viewStartDate || viewStartDateIso);
        setWeeksShown(userSettings.weeksShown || 12);
      } else {
        // No user settings yet — use project defaults
        setUnassignedGroupCollapsed(data.unassignedGroupCollapsed || false);
        setViewStartDate(data.viewStartDate || viewStartDateIso);
        setWeeksShown(data.weeksShown || 12);
      }

      // Tell Cloud sync which title the DB holds, so a rename made while the
      // project was loading is flushed instead of adopted as the baseline.
      seedTitleBaseline?.(data.id, data.title);
      // Apply everything in one batch so a half loaded project is never shown.
      setProjectId(data.id);
      setProjectTitle(data.title);
      setCloudOwnerId(data.ownerId);
      setProjectRole(data.role);
      setTeams(loadedTeams);
      setTasks(data.tasks);
      // density is loaded by useUserSettings hook, not from project
      setStorageType('cloud');
      setIsProjectLoading(false);
    }).catch((err) => {
      console.error('loadProject failed:', err);
      setIsProjectLoading(false);
      navigate('/', { replace: true });
    });
  }, [urlProjectId, user, sbProject, authLoading, isCloudAvailable, isCloudAvailabilityChecked]);

  return { isProjectLoading };
};
