-- Add position column to tasks for ordering within teams
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS position int DEFAULT 0;

-- Backfill: assign positions based on created_at order within each project+team
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id, team_id ORDER BY created_at) - 1 AS pos
  FROM public.tasks
)
UPDATE public.tasks t SET position = r.pos FROM ranked r WHERE t.id = r.id;
