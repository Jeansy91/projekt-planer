import { useRef, useEffect } from 'react';
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
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const urlBootDone = useRef(false);

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
    sbProject.loadProject(urlProjectId).then(async (data) => {
      if (!data) { navigate('/', { replace: true }); return; }
      suppressDetection?.();
      setProjectTitle(data.title);
      setCloudOwnerId(data.ownerId);
      setProjectRole(data.role);

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

      setProjectId(data.id);
      setTeams(loadedTeams);
      setTasks(data.tasks);
      // density is loaded by useUserSettings hook, not from project
      setStorageType('cloud');
    });
  }, [urlProjectId, user, sbProject, authLoading, isCloudAvailable, isCloudAvailabilityChecked]);
};
