-- ============================================================================
-- Per-user settings: view preferences per project + global density
-- ============================================================================

-- 1. Per-user per-project view settings
create table if not exists public.user_project_settings (
  user_id uuid references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  view_start_date text,
  weeks_shown int default 12,
  collapsed_team_ids jsonb default '[]'::jsonb,
  unassigned_collapsed boolean default false,
  updated_at timestamptz default now(),
  primary key (user_id, project_id)
);

-- 2. Per-user global settings (density)
create table if not exists public.user_settings (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  density int default 0,
  updated_at timestamptz default now()
);

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.user_project_settings enable row level security;
alter table public.user_settings enable row level security;

-- Users can only access their own settings
create policy "Users can manage own project settings"
  on public.user_project_settings for all using (auth.uid() = user_id);

create policy "Users can manage own settings"
  on public.user_settings for all using (auth.uid() = user_id);

-- ============================================================================
-- Indexes
-- ============================================================================

create index if not exists idx_user_project_settings_project on public.user_project_settings(project_id);

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

create or replace trigger user_project_settings_updated_at
  before update on public.user_project_settings
  for each row execute function public.update_updated_at();

create or replace trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.update_updated_at();
