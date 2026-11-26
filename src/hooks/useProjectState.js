import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Owns the Project shape per ADR-0002: id, title, teams, tasks. View settings
// (viewStartDate, weeksShown, density, unassignedCollapsed) are per-user and
// live in useProjectView / useUserDensity.
//
// Individual setters are exposed for action hooks (per ADR-0003). The
// `replaceProject(project)` seam exists for bulk loads (newProject, openProject,
// openFile, importFromJson) so the Project shape is set in one call rather than
// scattered across several setter invocations.
export const useProjectState = () => {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState(() => crypto.randomUUID());
  const [projectTitle, setProjectTitle] = useState(() => t('project.defaultTitle'));
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);

  const replaceProject = useCallback((project) => {
    setProjectId(project.id);
    setProjectTitle(project.title);
    setTeams(project.teams);
    setTasks(project.tasks);
  }, []);

  return {
    projectId, setProjectId,
    projectTitle, setProjectTitle,
    tasks, setTasks,
    teams, setTeams,
    replaceProject,
  };
};
