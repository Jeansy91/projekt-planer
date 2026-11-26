-- ============================================================================
-- Projekt-Planer: Initial Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- ============================================================================
-- PART 1: Create all tables
-- ============================================================================

-- 1. Profiles (auto-created on signup via trigger)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  created_at timestamptz default now()
);

-- 2. Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Neues Projekt',
  owner_id uuid references public.profiles(id) on delete cascade not null,
  view_start_date text,
  weeks_shown int default 12,
  density int default 0,
  unassigned_group_collapsed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Project Members (sharing)
create table if not exists public.project_members (
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'editor' check (role in ('viewer', 'editor', 'admin')),
  created_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- 4. Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  color text default 'blue',
  icon text default 'users',
  view_mode text default 'gantt' check (view_mode in ('gantt', 'swimlane')),
  collapsed boolean default false,
  position int default 0,
  created_at timestamptz default now()
);

-- 5. Lanes
create table if not exists public.lanes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  name text not null,
  position int default 0,
  created_at timestamptz default now()
);

-- 6. Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  start_date text not null,
  duration int default 2,
  color text default 'blue',
  team_id uuid references public.teams(id) on delete set null,
  lane_id uuid references public.lanes(id) on delete set null,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. Pending Invites (for users not yet registered)
create table if not exists public.pending_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  email text not null,
  role text default 'editor' check (role in ('viewer', 'editor', 'admin')),
  invited_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(project_id, email)
);

-- ============================================================================
-- PART 2: Enable RLS on all tables
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.teams enable row level security;
alter table public.lanes enable row level security;
alter table public.tasks enable row level security;
alter table public.pending_invites enable row level security;

-- ============================================================================
-- PART 3: Helper functions (security definer, bypass RLS to break cycles)
-- ============================================================================

-- Check if user is member of a project (bypasses project_members RLS)
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- Check if user is editor/admin of a project (bypasses project_members RLS)
create or replace function public.is_project_editor(p_project_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id and role in ('editor', 'admin')
  );
$$ language sql security definer stable;

-- Get the owner_id of a project (bypasses projects RLS)
create or replace function public.get_project_owner(p_project_id uuid)
returns uuid as $$
  select owner_id from public.projects where id = p_project_id;
$$ language sql security definer stable;

-- ============================================================================
-- PART 4: RLS Policies (using helper functions to avoid circular deps)
-- ============================================================================

-- Profiles policies
create policy "Users can view any profile"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Projects policies (use is_project_member to avoid querying project_members directly)
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

-- Project Members policies (use get_project_owner to avoid querying projects directly)
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

-- Teams policies
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

-- Lanes policies
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

-- Tasks policies
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

-- Pending Invites policies
create policy "Project owners can manage pending invites"
  on public.pending_invites for all using (
    public.get_project_owner(project_id) = auth.uid()
    or invited_by = auth.uid()
  );

create policy "Users can view their pending invites"
  on public.pending_invites for select using (true);

-- ============================================================================
-- PART 5: Other functions and triggers
-- ============================================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger projects_updated_at
  before update on public.projects
  for each row execute function public.update_updated_at();

create or replace trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at();

-- ============================================================================
-- PART 6: Indexes
-- ============================================================================

create index if not exists idx_teams_project on public.teams(project_id);
create index if not exists idx_lanes_team on public.lanes(team_id);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_team on public.tasks(team_id);
create index if not exists idx_tasks_lane on public.tasks(lane_id);
create index if not exists idx_project_members_user on public.project_members(user_id);

-- ============================================================================
-- PART 7: Enable Realtime
-- ============================================================================

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.lanes;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.project_members;

-- ============================================================================
-- PART 8: Invite function (find or invite user by email)
-- ============================================================================

create or replace function public.invite_member(p_project_id uuid, p_email text, p_role text default 'editor')
returns json as $$
declare
  v_user_id uuid;
  v_profile public.profiles;
begin
  -- Check caller is owner or admin
  if not exists (
    select 1 from public.projects where id = p_project_id and owner_id = auth.uid()
  ) and not exists (
    select 1 from public.project_members where project_id = p_project_id and user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Not authorized';
  end if;

  -- Find user by email
  select id into v_user_id from public.profiles where email = p_email;

  if v_user_id is null then
    -- User not registered yet — save as pending invite
    insert into public.pending_invites (project_id, email, role, invited_by)
    values (p_project_id, p_email, p_role, auth.uid())
    on conflict (project_id, email) do update set role = p_role;

    return json_build_object('success', true, 'pending', true, 'email', p_email);
  end if;

  if v_user_id = auth.uid() then
    return json_build_object('success', false, 'error', 'cannot_invite_self');
  end if;

  -- Upsert membership
  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, v_user_id, p_role)
  on conflict (project_id, user_id) do update set role = p_role;

  select * into v_profile from public.profiles where id = v_user_id;

  return json_build_object(
    'success', true,
    'pending', false,
    'member', json_build_object('user_id', v_user_id, 'email', v_profile.email, 'display_name', v_profile.display_name, 'role', p_role)
  );
end;
$$ language plpgsql security definer;

-- Resolve pending invites when a user signs up / logs in
create or replace function public.resolve_pending_invites(p_user_id uuid, p_email text)
returns void as $$
begin
  insert into public.project_members (project_id, user_id, role)
  select pi.project_id, p_user_id, pi.role
  from public.pending_invites pi
  where pi.email = p_email
  on conflict (project_id, user_id) do nothing;

  delete from public.pending_invites where email = p_email;
end;
$$ language plpgsql security definer;
