import { useState, useEffect, useRef } from 'react';
import { fingerprint } from '../utils/cloudSyncCore';
import { getWeekNumber, getDateOfISOWeek } from '../utils/dateUtils';

// Per-user, per-project **View** (docs/glossary.md → View, ADR-0002). Owns the local
// state and the debounced cloud write to `user_project_settings`. The cloud
// LOAD is orchestrated by useCloudBoot because the loaded `collapsedTeamIds`
// must be merged into Team objects before setTeams runs (Teams concern, not
// View concern).
//
// Split into two hooks only to break a React composition cycle: state must
// exist before useProjectStore (lifecycle needs the setters), and the save
// effect needs projectId + collapsedTeamIds which only exist after the store
// has rendered. One module, two bindings.

const DEBOUNCE = 500;

const getCurrentWeekMonday = () => {
  const today = new Date();
  return getDateOfISOWeek(getWeekNumber(today), today.getFullYear()).toISOString();
};

export const useProjectViewState = () => {
  const [viewStartDate, setViewStartDate] = useState(getCurrentWeekMonday);
  const [weeksShown, setWeeksShown] = useState(12);
  const [unassignedCollapsed, setUnassignedCollapsed] = useState(false);

  return {
    viewStartDate, setViewStartDate,
    weeksShown, setWeeksShown,
    unassignedCollapsed, setUnassignedCollapsed,
  };
};

export const useProjectViewSave = ({
  enabled,
  projectId,
  sbProject,
  viewStartDate,
  weeksShown,
  collapsedTeamIds,
  unassignedCollapsed,
}) => {
  const lastFingerprintRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !projectId) return;

    const settings = { viewStartDate, weeksShown, collapsedTeamIds, unassignedCollapsed };
    const fp = fingerprint(settings);

    if (lastFingerprintRef.current === null) {
      lastFingerprintRef.current = fp;
      return;
    }
    if (lastFingerprintRef.current === fp) return;
    lastFingerprintRef.current = fp;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      sbProject.saveUserProjectSettings(projectId, settings).catch(err =>
        console.warn('[ProjectView] Save failed:', err.message));
    }, DEBOUNCE);
  }, [enabled, projectId, viewStartDate, weeksShown, collapsedTeamIds, unassignedCollapsed, sbProject]);

  useEffect(() => {
    // Reset fingerprint on project switch so the first save after load is treated as init.
    lastFingerprintRef.current = null;
  }, [projectId]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);
};
