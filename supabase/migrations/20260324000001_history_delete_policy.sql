-- ============================================================================
-- Allow editors to delete history entries (needed for undo/redo sync)
-- ============================================================================

create policy "Editors can delete history"
  on public.project_history for delete using (
    public.get_project_owner(project_id) = auth.uid()
    or public.is_project_editor(project_id, auth.uid())
  );
