import { useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { fromDbTeams, fromDbTasks } from '../utils/supabaseMappers';
import * as members from '../utils/supabaseMembers';

// Throw on Supabase errors so callers (withRetry) can catch and retry
const throwOnError = ({ data, error }, operation) => {
  if (error) throw new Error(`[Supabase] ${operation}: ${error.message}`);
  return data;
};

export const useSupabaseProject = (user) => {
  const loadProject = useCallback(async (projectId) => {
    if (!supabase || !user) return null;

    const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (!project) return null;

    const { data: dbTeams } = await supabase.from('teams').select('*').eq('project_id', projectId);
    const teamIds = (dbTeams || []).map(t => t.id);

    let dbLanes = [];
    if (teamIds.length > 0) {
      const { data } = await supabase.from('lanes').select('*').in('team_id', teamIds);
      dbLanes = data || [];
    }

    const { data: dbTasks } = await supabase.from('tasks').select('*').eq('project_id', projectId);

    // Determine current user's role
    let role = 'viewer';
    if (project.owner_id === user.id) {
      role = 'owner';
    } else {
      const { data: membership } = await supabase
        .from('project_members')
        .select('role')
        .match({ project_id: projectId, user_id: user.id })
        .maybeSingle();
      if (membership) role = membership.role;
    }

    return {
      id: project.id,
      title: project.title,
      ownerId: project.owner_id,
      role,
      teams: fromDbTeams(dbTeams || [], dbLanes),
      tasks: fromDbTasks(dbTasks || []),
      unassignedGroupCollapsed: project.unassigned_group_collapsed,
      viewStartDate: project.view_start_date,
      weeksShown: project.weeks_shown,
      density: project.density,
    };
  }, [user]);

  const listProjects = useCallback(async () => {
    if (!supabase || !user) return [];

    // RLS ensures we only see projects we own or are a member of
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, updated_at, owner_id')
      .order('updated_at', { ascending: false });

    if (error) { console.error('List projects error:', error); return []; }

    // Fetch actual roles for shared projects
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id, role')
      .eq('user_id', user.id);
    const roleMap = new Map((memberships || []).map(m => [m.project_id, m.role]));

    return (data || []).map(p => ({
      ...p,
      shared: p.owner_id !== user.id,
      role: p.owner_id === user.id ? 'owner' : (roleMap.get(p.id) || 'editor'),
    }));
  }, [user]);

  const deleteProject = useCallback(async (projectId) => {
    if (!supabase || !user) return false;
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    return !error;
  }, [user]);

  const createProject = useCallback(async (title) => {
    if (!supabase || !user) return null;
    const { data, error } = await supabase
      .from('projects')
      .insert({ title, owner_id: user.id })
      .select()
      .single();
    if (error) { console.error('Create project error:', error); return null; }
    return data;
  }, [user]);

  // Granular operations for realtime sync — all throw on error for retry
  const upsertTask = useCallback(async (task, projectId) => {
    if (!supabase) return;
    throwOnError(await supabase.from('tasks').upsert({
      id: task.id,
      project_id: projectId,
      title: task.title,
      start_date: task.startDate,
      duration: task.duration,
      color: task.color,
      team_id: task.teamId || null,
      lane_id: task.laneId || null,
      notes: task.notes || '',
      position: task.position ?? 0,
    }), 'upsertTask');
  }, []);

  const removeTask = useCallback(async (taskId) => {
    if (!supabase) return;
    throwOnError(await supabase.from('tasks').delete().eq('id', taskId), 'removeTask');
  }, []);

  const upsertTeam = useCallback(async (team, projectId, position) => {
    if (!supabase) return;
    throwOnError(await supabase.from('teams').upsert({
      id: team.id,
      project_id: projectId,
      name: team.name,
      color: team.color || 'blue',
      icon: team.icon || 'users',
      view_mode: team.viewMode || 'gantt',
      position,
    }), 'upsertTeam');
  }, []);

  const removeTeam = useCallback(async (teamId) => {
    if (!supabase) return;
    throwOnError(await supabase.from('teams').delete().eq('id', teamId), 'removeTeam');
  }, []);

  const upsertLane = useCallback(async (lane, teamId, position) => {
    if (!supabase) return;
    throwOnError(await supabase.from('lanes').upsert({
      id: lane.id,
      team_id: teamId,
      name: lane.name,
      position,
    }), 'upsertLane');
  }, []);

  const removeLane = useCallback(async (laneId) => {
    if (!supabase) return;
    throwOnError(await supabase.from('lanes').delete().eq('id', laneId), 'removeLane');
  }, []);

  const updateProjectSettings = useCallback(async (projectId, settings) => {
    if (!supabase) return;
    const mapped = {};
    if ('title' in settings) mapped.title = settings.title;
    if ('viewStartDate' in settings) mapped.view_start_date = settings.viewStartDate;
    if ('weeksShown' in settings) mapped.weeks_shown = settings.weeksShown;
    if ('density' in settings) mapped.density = settings.density;
    if ('unassignedGroupCollapsed' in settings) mapped.unassigned_group_collapsed = settings.unassignedGroupCollapsed;
    if (Object.keys(mapped).length > 0) {
      throwOnError(await supabase.from('projects').update(mapped).eq('id', projectId), 'updateProjectSettings');
    }
  }, []);

  // ── User-specific settings ──────────────────────────────────────────

  const loadUserProjectSettings = useCallback(async (projectId) => {
    if (!supabase || !user) return null;
    const { data } = await supabase
      .from('user_project_settings')
      .select('*')
      .match({ user_id: user.id, project_id: projectId })
      .maybeSingle();
    if (!data) return null;
    return {
      viewStartDate: data.view_start_date,
      weeksShown: data.weeks_shown,
      collapsedTeamIds: data.collapsed_team_ids || [],
      unassignedCollapsed: data.unassigned_collapsed,
    };
  }, [user]);

  const saveUserProjectSettings = useCallback(async (projectId, settings) => {
    if (!supabase || !user) return;
    const mapped = { user_id: user.id, project_id: projectId };
    if ('viewStartDate' in settings) mapped.view_start_date = settings.viewStartDate;
    if ('weeksShown' in settings) mapped.weeks_shown = settings.weeksShown;
    if ('collapsedTeamIds' in settings) mapped.collapsed_team_ids = settings.collapsedTeamIds;
    if ('unassignedCollapsed' in settings) mapped.unassigned_collapsed = settings.unassignedCollapsed;
    await supabase.from('user_project_settings').upsert(mapped);
  }, [user]);

  const loadUserSettings = useCallback(async () => {
    if (!supabase || !user) return null;
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!data) return null;
    return { density: data.density };
  }, [user]);

  const saveUserSettings = useCallback(async (settings) => {
    if (!supabase || !user) return;
    const mapped = { user_id: user.id };
    if ('density' in settings) mapped.density = settings.density;
    await supabase.from('user_settings').upsert(mapped);
  }, [user]);

  const uploadProject = useCallback(async (title, teams, tasks, settings) => {
    if (!supabase || !user) return null;

    // Build ID mapping: local IDs (possibly non-UUID) → new UUIDs
    const idMap = new Map();
    const mapId = (oldId) => {
      if (!oldId) return null;
      if (!idMap.has(oldId)) idMap.set(oldId, crypto.randomUUID());
      return idMap.get(oldId);
    };

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        title,
        owner_id: user.id,
        view_start_date: settings.viewStartDate || null,
        weeks_shown: settings.weeksShown || 12,
        density: settings.density || 0,
        unassigned_group_collapsed: settings.unassignedGroupCollapsed || false,
      })
      .select()
      .single();
    if (error) { console.error('Upload project error:', error); return null; }

    // Upload teams
    if (teams.length > 0) {
      const dbTeams = teams.map((t, i) => ({
        id: mapId(t.id),
        project_id: project.id,
        name: t.name,
        color: t.color || 'blue',
        icon: t.icon || 'users',
        view_mode: t.viewMode || 'gantt',
        position: i,
      }));
      throwOnError(await supabase.from('teams').insert(dbTeams), 'uploadTeams');

      // Upload lanes
      const dbLanes = teams.flatMap(t =>
        (t.lanes || []).map((l, i) => ({
          id: mapId(l.id),
          team_id: mapId(t.id),
          name: l.name,
          position: i,
        }))
      );
      if (dbLanes.length > 0) {
        throwOnError(await supabase.from('lanes').insert(dbLanes), 'uploadLanes');
      }
    }

    // Upload tasks
    if (tasks.length > 0) {
      const dbTasks = tasks.map(t => ({
        id: mapId(t.id),
        project_id: project.id,
        title: t.title,
        start_date: t.startDate,
        duration: t.duration,
        color: t.color,
        team_id: mapId(t.teamId),
        lane_id: mapId(t.laneId),
        notes: t.notes || '',
        position: t.position ?? 0,
      }));
      throwOnError(await supabase.from('tasks').insert(dbTasks), 'uploadTasks');
    }

    return { project, idMap };
  }, [user]);

  return {
    loadProject,
    listProjects,
    deleteProject,
    createProject,
    uploadProject,
    upsertTask,
    removeTask,
    upsertTeam,
    removeTeam,
    upsertLane,
    removeLane,
    updateProjectSettings,
    getProfileById: members.getProfileById,
    getMembers: members.getMembers,
    inviteMember: members.inviteMember,
    removeMember: members.removeMember,
    updateMemberRole: members.updateMemberRole,
    transferOwnership: members.transferOwnership,
    getPendingInvites: members.getPendingInvites,
    removePendingInvite: members.removePendingInvite,
    updatePendingInviteRole: members.updatePendingInviteRole,
    resendInvite: members.resendInvite,
    loadUserProjectSettings,
    saveUserProjectSettings,
    loadUserSettings,
    saveUserSettings,
    loadHistory: async (projectId) => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('project_history')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) console.warn('[SupabaseProject] loadHistory failed:', error.message);
      return (data || []).map(row => ({
        id: row.id,
        timestamp: row.created_at,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityName: row.entity_name,
        changes: row.changes,
        userId: row.user_id,
        userName: row.user_name,
      }));
    },
    insertHistory: async (projectId, entries) => {
      if (!supabase || !entries.length) return;
      const rows = entries.map(e => ({
        id: e.id,
        project_id: projectId,
        action: e.action,
        entity_type: e.entityType,
        entity_id: e.entityId,
        entity_name: e.entityName,
        changes: e.changes || null,
        user_id: e.userId || null,
        user_name: e.userName || null,
      }));
      const { error } = await supabase.from('project_history').upsert(rows);
      if (error) console.warn('[SupabaseProject] insertHistory failed:', error.message);
    },
    deleteHistoryEntries: async (entryIds) => {
      if (!supabase || !entryIds.length) return;
      const { error } = await supabase.from('project_history').delete().in('id', entryIds);
      if (error) console.warn('[SupabaseProject] deleteHistoryEntries failed:', error.message);
    },
  };
};
