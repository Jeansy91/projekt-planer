-- ============================================================================
-- Project History: Audit log for task and team changes
-- ============================================================================

-- 1. History table
create table if not exists public.project_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  action text not null check (action in ('created', 'updated', 'deleted', 'duplicated', 'moved', 'resized')),
  entity_type text not null check (entity_type in ('task', 'team')),
  entity_id uuid,
  entity_name text,
  changes jsonb,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text,
  created_at timestamptz default now()
);

-- 2. Indexes
create index if not exists idx_history_project on public.project_history(project_id);
create index if not exists idx_history_project_time on public.project_history(project_id, created_at desc);

-- 3. RLS
alter table public.project_history enable row level security;

create policy "Users can view history of accessible projects"
  on public.project_history for select using (
    public.get_project_owner(project_id) = auth.uid()
    or public.is_project_member(project_id, auth.uid())
  );

create policy "Editors can insert history"
  on public.project_history for insert with check (
    public.get_project_owner(project_id) = auth.uid()
    or public.is_project_editor(project_id, auth.uid())
  );

-- 4. Trigger function: auto-record task changes
create or replace function public.record_task_history()
returns trigger as $$
declare
  v_action text;
  v_changes jsonb;
  v_user_id uuid;
  v_user_name text;
  v_project_id uuid;
  v_entity_name text;
begin
  v_user_id := auth.uid();
  select display_name into v_user_name from public.profiles where id = v_user_id;

  if TG_OP = 'INSERT' then
    v_project_id := NEW.project_id;
    v_entity_name := NEW.title;
    v_action := 'created';
    v_changes := null;
  elsif TG_OP = 'DELETE' then
    v_project_id := OLD.project_id;
    v_entity_name := OLD.title;
    v_action := 'deleted';
    v_changes := null;
  elsif TG_OP = 'UPDATE' then
    v_project_id := NEW.project_id;
    v_entity_name := NEW.title;
    v_changes := '{}'::jsonb;

    if OLD.start_date is distinct from NEW.start_date then
      v_changes := v_changes || jsonb_build_object('startDate', jsonb_build_object('from', OLD.start_date, 'to', NEW.start_date));
    end if;
    if OLD.duration is distinct from NEW.duration then
      v_changes := v_changes || jsonb_build_object('duration', jsonb_build_object('from', OLD.duration, 'to', NEW.duration));
    end if;
    if OLD.title is distinct from NEW.title then
      v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('from', OLD.title, 'to', NEW.title));
    end if;
    if OLD.color is distinct from NEW.color then
      v_changes := v_changes || jsonb_build_object('color', jsonb_build_object('from', OLD.color, 'to', NEW.color));
    end if;
    if OLD.notes is distinct from NEW.notes then
      v_changes := v_changes || jsonb_build_object('notes', jsonb_build_object('from', OLD.notes, 'to', NEW.notes));
    end if;
    if OLD.team_id is distinct from NEW.team_id then
      v_changes := v_changes || jsonb_build_object('teamId', jsonb_build_object('from', OLD.team_id, 'to', NEW.team_id));
    end if;
    if OLD.lane_id is distinct from NEW.lane_id then
      v_changes := v_changes || jsonb_build_object('laneId', jsonb_build_object('from', OLD.lane_id, 'to', NEW.lane_id));
    end if;

    -- No tracked fields changed → skip
    if v_changes = '{}'::jsonb then
      return NEW;
    end if;

    -- Determine action based on changed fields
    declare
      v_keys text[];
    begin
      v_keys := array(select jsonb_object_keys(v_changes));
      if v_keys <@ ARRAY['startDate', 'duration'] then
        if 'duration' = any(v_keys) then v_action := 'resized';
        else v_action := 'moved';
        end if;
      else
        v_action := 'updated';
      end if;
    end;
  end if;

  insert into public.project_history (project_id, action, entity_type, entity_id, entity_name, changes, user_id, user_name)
  values (v_project_id, v_action, 'task', coalesce(NEW.id, OLD.id), v_entity_name, v_changes, v_user_id, v_user_name);

  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

-- 5. Trigger function: auto-record team changes
create or replace function public.record_team_history()
returns trigger as $$
declare
  v_action text;
  v_changes jsonb;
  v_user_id uuid;
  v_user_name text;
  v_project_id uuid;
  v_entity_name text;
begin
  v_user_id := auth.uid();
  select display_name into v_user_name from public.profiles where id = v_user_id;

  if TG_OP = 'INSERT' then
    v_project_id := NEW.project_id;
    v_entity_name := NEW.name;
    v_action := 'created';
    v_changes := null;
  elsif TG_OP = 'DELETE' then
    v_project_id := OLD.project_id;
    v_entity_name := OLD.name;
    v_action := 'deleted';
    v_changes := null;
  elsif TG_OP = 'UPDATE' then
    v_project_id := NEW.project_id;
    v_entity_name := NEW.name;
    v_changes := '{}'::jsonb;

    if OLD.name is distinct from NEW.name then
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('from', OLD.name, 'to', NEW.name));
    end if;
    if OLD.color is distinct from NEW.color then
      v_changes := v_changes || jsonb_build_object('color', jsonb_build_object('from', OLD.color, 'to', NEW.color));
    end if;
    if OLD.icon is distinct from NEW.icon then
      v_changes := v_changes || jsonb_build_object('icon', jsonb_build_object('from', OLD.icon, 'to', NEW.icon));
    end if;
    if OLD.view_mode is distinct from NEW.view_mode then
      v_changes := v_changes || jsonb_build_object('viewMode', jsonb_build_object('from', OLD.view_mode, 'to', NEW.view_mode));
    end if;

    -- Skip if only position changed (reordering, not a user-visible edit)
    if v_changes = '{}'::jsonb then
      return NEW;
    end if;

    v_action := 'updated';
  end if;

  insert into public.project_history (project_id, action, entity_type, entity_id, entity_name, changes, user_id, user_name)
  values (v_project_id, v_action, 'team', coalesce(NEW.id, OLD.id), v_entity_name, v_changes, v_user_id, v_user_name);

  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

-- 6. Attach triggers
create trigger task_history_insert after insert on public.tasks
  for each row execute function public.record_task_history();

create trigger task_history_update after update on public.tasks
  for each row execute function public.record_task_history();

create trigger task_history_delete after delete on public.tasks
  for each row execute function public.record_task_history();

create trigger team_history_insert after insert on public.teams
  for each row execute function public.record_team_history();

create trigger team_history_update after update on public.teams
  for each row execute function public.record_team_history();

create trigger team_history_delete after delete on public.teams
  for each row execute function public.record_team_history();

-- 7. Cleanup function: keep max 200 entries per project
create or replace function public.trim_project_history()
returns trigger as $$
begin
  delete from public.project_history
  where id in (
    select id from public.project_history
    where project_id = NEW.project_id
    order by created_at desc
    offset 200
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trim_history after insert on public.project_history
  for each row execute function public.trim_project_history();
