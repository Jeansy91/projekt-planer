# Database

The Supabase Postgres schema, Row Level Security, helper functions and the migration history. The tables `teams`, `lanes`, `project_members`, `pending_invites`, `user_settings` and `user_project_settings` are defined in the migrations as well; the tables below are the ones most code touches.

## Schema Overview

### profiles

Auto-populated on registration via trigger from `auth.users`.

| Column         | Type        | Default | Description                                         |
|----------------|-------------|---------|-----------------------------------------------------|
| `id`           | uuid        | –       | Primary key = `auth.users.id`                       |
| `email`        | text        | –       | User's email address                                |
| `display_name` | text        | –       | Display name (from `user_metadata` or email prefix) |
| `avatar_url`   | text        | NULL    | Public URL to avatar image in `avatars` bucket      |
| `created_at`   | timestamptz | now()   | –                                                   |

### projects

| Column                       | Type            | Default           | Description                            |
|------------------------------|-----------------|-------------------|----------------------------------------|
| `id`                         | uuid            | gen_random_uuid() | Primary key                            |
| `title`                      | text            | 'Neues Projekt'   | Project title                          |
| `owner_id`                   | uuid → profiles | –                 | Owner (foreign key, CASCADE DELETE)    |
| `view_start_date`            | text            | NULL              | ISO start date of the calendar view    |
| `weeks_shown`                | int             | 12                | Number of visible weeks                |
| `density`                    | int             | 0                 | Density level (0–3)                    |
| `unassigned_group_collapsed` | boolean         | false             | Collapse state of the unassigned group |
| `created_at / updated_at`    | timestamptz     | now()             | Auto-update via trigger                |

### tasks

| Column                    | Type            | Default           | Description                     |
|---------------------------|-----------------|-------------------|---------------------------------|
| `id`                      | uuid            | gen_random_uuid() | Primary key                     |
| `project_id`              | uuid → projects | –                 | CASCADE DELETE                  |
| `title`                   | text            | –                 | Task title                      |
| `start_date`              | text            | –                 | ISO start date (YYYY-WW format) |
| `duration`                | int             | 2                 | Duration in weeks               |
| `color`                   | text            | 'blue'            | Color coding                    |
| `team_id`                 | uuid → teams    | NULL              | SET NULL on team delete         |
| `lane_id`                 | uuid → lanes    | NULL              | SET NULL on lane delete         |
| `notes`                   | text            | ''                | Free-text notes                 |
| `position`                | int             | 0                 | Order within team/lane          |
| `created_at / updated_at` | timestamptz     | now()             | Auto-update via trigger         |

### project_history

Audit log for task and team changes. Written by the client SDK with debouncing. Maximum 200 entries per project (trimmed by trigger).

| Column                | Type        | Description                                                |
|-----------------------|-------------|------------------------------------------------------------|
| `action`              | text        | created / updated / deleted / duplicated / moved / resized |
| `entity_type`         | text        | task, team, lane or project                                |
| `changes`             | jsonb       | Changed fields with from/to values                         |
| `user_id / user_name` | uuid / text | Author at time of change                                   |

## RLS Policies

| Table                                 | Operation                | Who May                               |
|---------------------------------------|--------------------------|---------------------------------------|
| profiles                              | SELECT                   | All authenticated users               |
| profiles                              | INSERT / UPDATE          | Own profile only (`auth.uid() = id`)  |
| projects                              | SELECT                   | Owner or project member               |
| projects                              | INSERT                   | Own owner only                        |
| projects                              | UPDATE                   | Owner or editor/admin member          |
| projects                              | DELETE                   | Owner only                            |
| teams / lanes / tasks                 | SELECT                   | Owner or any member of the project    |
| teams / lanes / tasks                 | ALL (write)              | Owner or editor/admin member          |
| project_history                       | SELECT / INSERT / DELETE | Owner or editor/admin member          |
| user_settings / user_project_settings | ALL                      | Own settings only                     |
| storage.objects (avatars)             | SELECT                   | Everyone (public bucket)              |
| storage.objects (avatars)             | INSERT/UPDATE/DELETE     | Own folder only (`auth.uid()` prefix) |

## Helper Functions & Triggers

| Function / Trigger                           | Type                      | Purpose                                           |
|----------------------------------------------|---------------------------|---------------------------------------------------|
| `is_project_member()`                        | SQL security definer      | Checks membership without RLS circular dependency |
| `is_project_editor()`                        | SQL security definer      | Checks editor/admin privileges                    |
| `get_project_owner()`                        | SQL security definer      | Returns owner_id without RLS circular dependency  |
| `handle_new_user()` / `on_auth_user_created` | Trigger                   | Auto-creates profile on registration              |
| `invite_member()`                            | PL/pgSQL security definer | Invites user or creates pending invite            |
| `update_member_role()`                       | PL/pgSQL security definer | Changes member role (owner/admin only)            |
| `transfer_ownership()`                       | PL/pgSQL security definer | Transfers project ownership                       |
| `trim_project_history()`                     | Trigger function          | Keeps max 200 history entries per project         |

## Migration History

| File                                             | Date       | Contents                                                                                          |
|--------------------------------------------------|------------|---------------------------------------------------------------------------------------------------|
| `20260306000001_initial_schema.sql`              | 2026-03-06 | Creates all tables, enables RLS, helper functions, triggers, indexes, Realtime, invite_member RPC |
| `20260306000002_task_position.sql`               | 2026-03-06 | Adds `position` column to tasks; backfills by created_at                                          |
| `20260314000001_check_email_exists.sql`          | 2026-03-14 | `check_email_exists()` function; updates `handle_new_user()` for display_name from user_metadata  |
| `20260315000001_role_management.sql`             | 2026-03-15 | `update_member_role()`, `transfer_ownership()` RPCs; admin update policy for project_members      |
| `20260315000002_user_settings.sql`               | 2026-03-15 | Tables `user_project_settings` and `user_settings` with RLS and triggers                          |
| `20260316000001_avatar_and_account_deletion.sql` | 2026-03-16 | `avatar_url` column, avatars storage bucket, storage RLS policies                                 |
| `20260316000002_enforce_mfa_aal2.sql`            | 2026-03-16 | `aal_check()` function; rebuilds all RLS policies with AAL2 check                                 |
| `20260316000003_remove_aal_from_rls.sql`         | 2026-03-16 | Removes AAL2 check from RLS (AAL2 enforced at client and Edge Function level)                     |
| `20260323000001_project_history.sql`             | 2026-03-23 | `project_history` table, indexes, RLS, history triggers, `trim_project_history()`                 |
| `20260323000002_drop_history_triggers.sql`       | 2026-03-23 | Removes DB triggers for history (client writes history with debouncing)                           |
| `20260324000001_history_delete_policy.sql`       | 2026-03-24 | Adds DELETE policy for `project_history` (for undo/redo sync)                                     |
| `20260408000001_history_project_entity_type.sql` | 2026-04-08 | Allows `project` as history entity type                                                            |
| `20260408000002_history_lane_entity_type.sql`    | 2026-04-08 | Allows `lane` as history entity type                                                               |

## Migration Workflow

    # Create new migration
    yarn supabase migration new <descriptive-name>

    # Apply to the local stack from scratch (Docker required)
    yarn supabase db reset

    # Push to the linked hosted project
    yarn supabase db push --linked

## Rollback

Migrations are forward-only. Never edit a migration that has been released. To roll back, create a new migration that reverses the changes:

    -- Example: roll back an added column
    ALTER TABLE public.tasks DROP COLUMN IF EXISTS labels;

Migrations applied by the container entrypoint are tracked in `public._migrations`:

    SELECT name, applied_at FROM public._migrations ORDER BY applied_at;
