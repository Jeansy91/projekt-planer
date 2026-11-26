alter table public.project_history
  drop constraint if exists project_history_entity_type_check;

alter table public.project_history
  add constraint project_history_entity_type_check
  check (entity_type in ('task', 'team', 'project', 'lane'));
