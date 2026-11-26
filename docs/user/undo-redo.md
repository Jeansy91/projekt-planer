# Undo / Redo

Every change in a project can be undone or redone. The history is persistent and survives browser restarts.

## Using Undo & Redo

| Action | Mac   | Windows / Linux |
|--------|-------|-----------------|
| Undo   | ⌘+Z   | Ctrl+Z          |
| Redo   | ⇧+⌘+Z | Ctrl+Y          |

## What is tracked?

The undo history tracks all changes to project data:

- Tasks: create, rename, move, resize, delete, duplicate
- Teams: create, rename, delete, reorder, switch view mode
- Lanes: create, rename, delete
- Color changes, notes edits, team assignments

Not tracked:

- Zoom settings and row height
- Navigation position (current week)
- Collapsing/expanding teams

## Persistent history

The undo history is saved along with the project in LocalStorage or in the cloud. When closing and reopening the app, the history remains available.

**Note:** When exporting a project, you are asked whether to include the activity log. Choose **Include Log** to keep the history in the exported JSON file.

## Activity Log

The activity log shows all recorded actions with timestamps. Open it via the **Activity** button in the header. It includes:

- Type of action (created, updated, deleted, duplicated, moved, resized)
- Affected element (task, team or lane)
- Timestamp
- For cloud projects: username

**Tip:** The activity log is read-only. To undo changes, use Undo (Ctrl+Z).
