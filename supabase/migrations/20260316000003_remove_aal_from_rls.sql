-- ============================================================================
-- Remove aal_check() from RLS policies
--
-- AAL2 is already enforced at two other levels:
--   1. Client-side: isAuthenticated = !!user && !mfaRequired
--   2. Edge functions: checkAal() blocks sensitive ops (password, email, 2FA, delete)
--
-- The RLS-level AAL check causes timing issues with the Supabase JS client
-- after mfa.verify() — the client's PostgREST queries may still use the
-- AAL1 token before the session fully propagates, returning empty results.
-- ============================================================================

-- Projects
drop policy if exists "Users can view own or shared projects" on public.projects;
drop policy if exists "Users can insert own projects" on public.projects;
drop policy if exists "Owner or editor can update projects" on public.projects;
drop policy if exists "Owner can delete projects" on public.projects;

create policy "Users can view own or shared projects"
  on public.projects for select using (
    auth.uid() = owner_id
    or public.is_project_member(id, auth.uid())
  );

create policy "Users can insert own projects"
  on public.projects for insert with check (auth.uid() = owner_id);

create policy "Owner or editor can update projects"
  on public.projects for update using (
    auth.uid() = owner_id
    or public.is_project_editor(id, auth.uid())
  );

create policy "Owner can delete projects"
  on public.projects for delete using (auth.uid() = owner_id);

-- Project Members
drop policy if exists "Members can view membership" on public.project_members;
drop policy if exists "Owner or admin can manage members" on public.project_members;
drop policy if exists "Owner or admin can update members" on public.project_members;
drop policy if exists "Owner or admin can remove members" on public.project_members;

create policy "Members can view membership"
  on public.project_members for select using (
    auth.uid() = user_id
    or public.get_project_owner(project_id) = auth.uid()
  );

create policy "Owner or admin can manage members"
  on public.project_members for insert with check (
    public.get_project_owner(project_id) = auth.uid()
    or public.is_project_editor(project_id, auth.uid())
  );

create policy "Owner or admin can update members"
  on public.project_members for update using (
    public.get_project_owner(project_id) = auth.uid()
  );

create policy "Owner or admin can remove members"
  on public.project_members for delete using (
    auth.uid() = user_id
    or public.get_project_owner(project_id) = auth.uid()
  );

-- Teams
drop policy if exists "Users can view teams of accessible projects" on public.teams;
drop policy if exists "Editors can manage teams" on public.teams;

create policy "Users can view teams of accessible projects"
  on public.teams for select using (
    public.get_project_owner(project_id) = auth.uid()
    or public.is_project_member(project_id, auth.uid())
  );

create policy "Editors can manage teams"
  on public.teams for all using (
    public.get_project_owner(project_id) = auth.uid()
    or public.is_project_editor(project_id, auth.uid())
  );

-- Lanes
drop policy if exists "Users can view lanes of accessible teams" on public.lanes;
drop policy if exists "Editors can manage lanes" on public.lanes;

create policy "Users can view lanes of accessible teams"
  on public.lanes for select using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and (
        public.get_project_owner(t.project_id) = auth.uid()
        or public.is_project_member(t.project_id, auth.uid())
      )
    )
  );

create policy "Editors can manage lanes"
  on public.lanes for all using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and (
        public.get_project_owner(t.project_id) = auth.uid()
        or public.is_project_editor(t.project_id, auth.uid())
      )
    )
  );

-- Tasks
drop policy if exists "Users can view tasks of accessible projects" on public.tasks;
drop policy if exists "Editors can manage tasks" on public.tasks;

create policy "Users can view tasks of accessible projects"
  on public.tasks for select using (
    public.get_project_owner(project_id) = auth.uid()
    or public.is_project_member(project_id, auth.uid())
  );

create policy "Editors can manage tasks"
  on public.tasks for all using (
    public.get_project_owner(project_id) = auth.uid()
    or public.is_project_editor(project_id, auth.uid())
  );

-- Pending Invites
drop policy if exists "Project owners can manage pending invites" on public.pending_invites;

create policy "Project owners can manage pending invites"
  on public.pending_invites for all using (
    public.get_project_owner(project_id) = auth.uid()
    or invited_by = auth.uid()
  );

-- Keep aal_check() function for potential future use, just remove from policies
