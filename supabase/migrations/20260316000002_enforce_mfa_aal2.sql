-- ============================================================================
-- Enforce AAL2 for users who have MFA enrolled
-- If a user has enrolled MFA factors, they must authenticate at AAL2 to access data.
-- Users without MFA are unaffected (AAL1 is sufficient).
-- ============================================================================

-- Helper: returns true if the current session satisfies AAL requirements.
-- Users WITH MFA factors must be at AAL2. Users WITHOUT MFA pass at any level.
create or replace function public.aal_check()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      -- If the user has any verified TOTP factors, require AAL2
      when exists (
        select 1 from auth.mfa_factors
        where user_id = auth.uid()
          and factor_type = 'totp'
          and status = 'verified'
      )
      then (select coalesce(auth.jwt()->>'aal', '') = 'aal2')
      -- No MFA enrolled — any AAL is fine
      else true
    end;
$$;

-- ============================================================================
-- Drop existing policies and recreate with AAL check
-- ============================================================================

-- Projects
drop policy if exists "Users can view own or shared projects" on public.projects;
drop policy if exists "Users can insert own projects" on public.projects;
drop policy if exists "Owner or editor can update projects" on public.projects;
drop policy if exists "Owner can delete projects" on public.projects;

create policy "Users can view own or shared projects"
  on public.projects for select using (
    public.aal_check()
    and (
      auth.uid() = owner_id
      or public.is_project_member(id, auth.uid())
    )
  );

create policy "Users can insert own projects"
  on public.projects for insert with check (
    public.aal_check()
    and auth.uid() = owner_id
  );

create policy "Owner or editor can update projects"
  on public.projects for update using (
    public.aal_check()
    and (
      auth.uid() = owner_id
      or public.is_project_editor(id, auth.uid())
    )
  );

create policy "Owner can delete projects"
  on public.projects for delete using (
    public.aal_check()
    and auth.uid() = owner_id
  );

-- Project Members
drop policy if exists "Members can view membership" on public.project_members;
drop policy if exists "Owner or admin can manage members" on public.project_members;
drop policy if exists "Owner or admin can update members" on public.project_members;
drop policy if exists "Owner or admin can remove members" on public.project_members;

create policy "Members can view membership"
  on public.project_members for select using (
    public.aal_check()
    and (
      auth.uid() = user_id
      or public.get_project_owner(project_id) = auth.uid()
    )
  );

create policy "Owner or admin can manage members"
  on public.project_members for insert with check (
    public.aal_check()
    and (
      public.get_project_owner(project_id) = auth.uid()
      or public.is_project_editor(project_id, auth.uid())
    )
  );

create policy "Owner or admin can update members"
  on public.project_members for update using (
    public.aal_check()
    and public.get_project_owner(project_id) = auth.uid()
  );

create policy "Owner or admin can remove members"
  on public.project_members for delete using (
    public.aal_check()
    and (
      auth.uid() = user_id
      or public.get_project_owner(project_id) = auth.uid()
    )
  );

-- Teams
drop policy if exists "Users can view teams of accessible projects" on public.teams;
drop policy if exists "Editors can manage teams" on public.teams;

create policy "Users can view teams of accessible projects"
  on public.teams for select using (
    public.aal_check()
    and (
      public.get_project_owner(project_id) = auth.uid()
      or public.is_project_member(project_id, auth.uid())
    )
  );

create policy "Editors can manage teams"
  on public.teams for all using (
    public.aal_check()
    and (
      public.get_project_owner(project_id) = auth.uid()
      or public.is_project_editor(project_id, auth.uid())
    )
  );

-- Lanes
drop policy if exists "Users can view lanes of accessible teams" on public.lanes;
drop policy if exists "Editors can manage lanes" on public.lanes;

create policy "Users can view lanes of accessible teams"
  on public.lanes for select using (
    public.aal_check()
    and exists (
      select 1 from public.teams t
      where t.id = team_id and (
        public.get_project_owner(t.project_id) = auth.uid()
        or public.is_project_member(t.project_id, auth.uid())
      )
    )
  );

create policy "Editors can manage lanes"
  on public.lanes for all using (
    public.aal_check()
    and exists (
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
    public.aal_check()
    and (
      public.get_project_owner(project_id) = auth.uid()
      or public.is_project_member(project_id, auth.uid())
    )
  );

create policy "Editors can manage tasks"
  on public.tasks for all using (
    public.aal_check()
    and (
      public.get_project_owner(project_id) = auth.uid()
      or public.is_project_editor(project_id, auth.uid())
    )
  );

-- Pending Invites
drop policy if exists "Project owners can manage pending invites" on public.pending_invites;

create policy "Project owners can manage pending invites"
  on public.pending_invites for all using (
    public.aal_check()
    and (
      public.get_project_owner(project_id) = auth.uid()
      or invited_by = auth.uid()
    )
  );

-- Note: "Users can view their pending invites" stays open (select-only, no sensitive data)
