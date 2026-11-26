// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useCloudBoot } from './useCloudBoot';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const setup = ({ sbProject, openProject = () => false, state } = {}) => {
  const calls = [];
  const rec = (name) => (...args) => calls.push([name, ...args]);
  const params = {
    urlProjectId: 'p1', user: { id: 'u1' }, sbProject, authLoading: false,
    isSupabaseConfigured: true, isCloudAvailable: true, isCloudAvailabilityChecked: true,
    setProjectId: rec('setProjectId'), setProjectTitle: rec('setProjectTitle'),
    setTasks: rec('setTasks'), setTeams: rec('setTeams'),
    setUnassignedGroupCollapsed: rec('setUnassignedGroupCollapsed'),
    setViewStartDate: rec('setViewStartDate'), setWeeksShown: rec('setWeeksShown'),
    setCloudOwnerId: rec('setCloudOwnerId'), setProjectRole: rec('setProjectRole'),
    setStorageType: rec('setStorageType'),
    viewStartDateIso: '2025-01-06', openProject, newProject: vi.fn(), importFromJson: vi.fn(),
    setFileHandle: vi.fn(), seedTitleBaseline: rec('seedTitleBaseline'),
  };
  const wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[{ pathname: '/project/p1', state }]}>{children}</MemoryRouter>
  );
  const hook = renderHook(() => useCloudBoot(params), { wrapper });
  return { ...hook, calls };
};

const project = { id: 'p1', title: 'T', ownerId: 'o', role: 'editor', teams: [], tasks: [] };

describe('useCloudBoot loading state', () => {
  it('should_report_loading_until_all_cloud_state_is_applied', async () => {
    const load = deferred();
    const settings = deferred();
    const sbProject = { loadProject: () => load.promise, loadUserProjectSettings: () => settings.promise };
    const { result, calls } = setup({ sbProject });
    expect(result.current.isProjectLoading).toBe(true);

    await act(async () => { load.resolve(project); });
    expect(result.current.isProjectLoading).toBe(true);
    expect(calls.find(([n]) => n === 'setProjectTitle')).toBeUndefined();

    await act(async () => { settings.resolve(null); });
    expect(result.current.isProjectLoading).toBe(false);
    const names = calls.map(([n]) => n);
    expect(names.indexOf('seedTitleBaseline')).toBeLessThan(names.indexOf('setProjectId'));
    expect(calls).toContainEqual(['setProjectTitle', 'T']);
    expect(calls).toContainEqual(['setStorageType', 'cloud']);
  });

  it('should_reset_loading_when_the_cloud_request_fails', async () => {
    const load = deferred();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = setup({ sbProject: { loadProject: () => load.promise } });
    expect(result.current.isProjectLoading).toBe(true);
    await act(async () => { load.reject(new Error('boom')); });
    expect(result.current.isProjectLoading).toBe(false);
  });

  it('should_not_report_loading_for_a_local_project', () => {
    const { result } = setup({ sbProject: {}, openProject: () => true });
    expect(result.current.isProjectLoading).toBe(false);
  });

  it('should_not_report_loading_for_a_new_local_project', () => {
    const { result } = setup({ sbProject: {}, state: { newLocal: true } });
    expect(result.current.isProjectLoading).toBe(false);
  });
});
