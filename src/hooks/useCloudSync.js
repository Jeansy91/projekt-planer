import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { fromDbTask, fromDbTeam } from '../utils/supabaseMappers';
import { useRealtimeChannel } from './useRealtimeChannel';
import { createCloudSyncCoordinator } from '../utils/cloudSyncCoordinator';
import { createResyncLoader } from '../utils/cloudSyncLoaders';

// Bidirectional Cloud sync — React binding around the Cloud sync coordinator.
// The coordinator (pure JS) owns the baselines, Pending flush registry,
// debounce timers, and cross-kind flush ordering. This hook supplies React
// mutators, watches state changes to call noteLocalChange, and wires the
// Realtime channel callbacks to onRemoteEvent.
//
// See docs/glossary.md → "Cloud sync", "Cloud sync coordinator".
export const useCloudSync = ({
  enabled,
  projectId,
  sbProject,
  user,
  profile,
  tasks,
  teams,
  projectTitle,
  setTasks,
  setTeams,
  setProjectTitle,
  suppressDetection,
}) => {
  const setTasksRef = useRef(setTasks);
  const setTeamsRef = useRef(setTeams);
  const setProjectTitleRef = useRef(setProjectTitle);
  const suppressDetectionRef = useRef(suppressDetection);
  useEffect(() => { setTasksRef.current = setTasks; }, [setTasks]);
  useEffect(() => { setTeamsRef.current = setTeams; }, [setTeams]);
  useEffect(() => { setProjectTitleRef.current = setProjectTitle; }, [setProjectTitle]);
  useEffect(() => { suppressDetectionRef.current = suppressDetection; }, [suppressDetection]);

  const coordinatorRef = useRef(null);
  if (coordinatorRef.current === null) {
    coordinatorRef.current = createCloudSyncCoordinator({
      sbProject,
      mutators: {
        applyTasks: (fn) => setTasksRef.current(fn),
        applyTeams: (fn) => setTeamsRef.current(fn),
        applyTitle: (value) => setProjectTitleRef.current?.(value),
      },
      suppressDetection: () => suppressDetectionRef.current?.(),
    });
  }

  // Project switch — coordinator resets baselines and registry.
  useEffect(() => {
    coordinatorRef.current.setProjectId(projectId);
  }, [projectId]);

  // Watch local state changes — push to coordinator. The coordinator decides
  // whether to schedule a flush or just record the first-seen baseline.
  useEffect(() => {
    if (!enabled || !projectId) return;
    coordinatorRef.current.noteLocalChange('task', tasks);
  }, [enabled, projectId, tasks]);

  useEffect(() => {
    if (!enabled || !projectId) return;
    coordinatorRef.current.noteLocalChange('team', teams);
  }, [enabled, projectId, teams]);

  useEffect(() => {
    if (!enabled || !projectId) return;
    coordinatorRef.current.noteLocalChange('title', projectTitle);
  }, [enabled, projectId, projectTitle]);

  // Resync loader — pure, lives in utils so it can be tested without React.
  const fetchAllForResync = useRef(
    createResyncLoader({ supabase, mappers: { fromDbTask, fromDbTeam } })
  ).current;

  const resyncFromDb = () => coordinatorRef.current.resync({ fetchAll: fetchAllForResync });

  // Realtime channel — events route through the coordinator.
  const { activeUsers } = useRealtimeChannel({
    projectId: enabled ? projectId : null,
    user,
    profile,
    onTaskChange: (event) => coordinatorRef.current.onRemoteEvent('task', event),
    onTeamChange: (event) => coordinatorRef.current.onRemoteEvent('team', event),
    onLaneChange: (event) => coordinatorRef.current.onRemoteEvent('lane', event),
    onProjectChange: (event) => coordinatorRef.current.onRemoteEvent('project', event),
    onReconnect: resyncFromDb,
    onResumeFromIdle: resyncFromDb,
  });

  useEffect(() => {
    return () => {
      coordinatorRef.current?.dispose();
    };
  }, []);

  const seedTitleBaseline = (id, title) => coordinatorRef.current.seedTitleBaseline(id, title);

  return { activeUsers, seedTitleBaseline };
};
