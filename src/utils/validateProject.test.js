import { describe, it, expect } from 'vitest';
import { validateProject } from './validateProject';

describe('validateProject', () => {
  it('should_strip_orphaned_teamId_when_team_missing', () => {
    const raw = { teams: [], tasks: [{ id: 't1', teamId: 'missing-team', laneId: 'l1' }] };
    const project = validateProject(raw);
    expect(project.tasks[0]).toMatchObject({ id: 't1', teamId: null, laneId: null });
  });

  it('should_strip_orphaned_laneId_when_lane_missing', () => {
    const raw = {
      teams: [{ id: 'team-1', lanes: [] }],
      tasks: [{ id: 't1', teamId: 'team-1', laneId: 'missing-lane' }],
    };
    const project = validateProject(raw);
    expect(project.tasks[0]).toMatchObject({ id: 't1', teamId: 'team-1', laneId: null });
  });

  it('should_keep_valid_team_and_lane_references', () => {
    const raw = {
      teams: [{ id: 'team-1', lanes: [{ id: 'lane-1' }] }],
      tasks: [{ id: 't1', teamId: 'team-1', laneId: 'lane-1' }],
    };
    const project = validateProject(raw);
    expect(project.tasks[0]).toMatchObject({ teamId: 'team-1', laneId: 'lane-1' });
  });

  it('should_exclude_per_user_view_fields_from_output', () => {
    // Per ADR-0002: viewStartDate, weeksShown, density are not part of a Project.
    const raw = {
      id: 'p1',
      title: 'X',
      teams: [],
      tasks: [],
      viewStartDate: '2026-01-01T00:00:00.000Z',
      weeksShown: 24,
      density: 2,
    };
    const project = validateProject(raw);
    expect(project).not.toHaveProperty('viewStartDate');
    expect(project).not.toHaveProperty('weeksShown');
    expect(project).not.toHaveProperty('density');
  });

  it('should_generate_id_when_missing', () => {
    const project = validateProject({ teams: [], tasks: [] });
    expect(project.id).toMatch(/[0-9a-f-]{36}/);
  });

  it('should_use_fallback_title_when_no_title_in_data', () => {
    const project = validateProject({ teams: [], tasks: [] }, { fallbackTitle: 'Untitled' });
    expect(project.title).toBe('Untitled');
  });

  it('should_prefer_title_over_projectTitle_legacy_field', () => {
    const project = validateProject({ title: 'A', projectTitle: 'B', teams: [], tasks: [] });
    expect(project.title).toBe('A');
  });

  it('should_fall_back_to_projectTitle_when_title_absent', () => {
    const project = validateProject({ projectTitle: 'Legacy', teams: [], tasks: [] });
    expect(project.title).toBe('Legacy');
  });

  it('should_default_history_to_empty_array', () => {
    const project = validateProject({ teams: [], tasks: [] });
    expect(project.history).toEqual([]);
  });

  it('should_default_unassignedGroupCollapsed_to_false', () => {
    const project = validateProject({ teams: [], tasks: [] });
    expect(project.unassignedGroupCollapsed).toBe(false);
  });
});
