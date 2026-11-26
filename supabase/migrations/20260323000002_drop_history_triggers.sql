-- ============================================================================
-- Drop task/team history triggers
--
-- History detection is now handled client-side with debouncing so that
-- rapid edits (typing) produce a single history entry instead of one per
-- keystroke.  Entries are written to project_history via the client SDK.
-- ============================================================================

drop trigger if exists task_history_insert on public.tasks;
drop trigger if exists task_history_update on public.tasks;
drop trigger if exists task_history_delete on public.tasks;
drop trigger if exists team_history_insert on public.teams;
drop trigger if exists team_history_update on public.teams;
drop trigger if exists team_history_delete on public.teams;

drop function if exists public.record_task_history();
drop function if exists public.record_team_history();
