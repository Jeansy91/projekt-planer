# Glossary

An interactive project planner with a Gantt chart and swimlane view. Users place **Tasks** on a calendar grid, group them under **Teams**, and route them through **Lanes**. State lives locally and optionally syncs to Supabase in real time.

## Language

### Domain

**Task**:
A scheduled unit of work with a title, start date, duration in weeks, optional notes, color, and assignment to a Team and Lane.
_Avoid_: Item, card, ticket.

**Team**:
A named group that owns Tasks. Has an ordered list of Lanes and a per-user `collapsed` flag.
_Avoid_: Group, category.

**Lane**:
An ordered row within a Team. A Task either sits in a Lane or in the Team's default row.
_Avoid_: Row, track, channel.

**Project**:
The top-level container. Holds Tasks, Teams, Lanes, a title, and shared/per-user view settings.
_Avoid_: Plan, workspace.

**Staging**:
A row above the Gantt grid where Tasks live before they have a date. Distinct from Lanes — staging is positional, not Team-scoped.
_Avoid_: Backlog, inbox.

**Unassigned group**:
A pseudo-Team that owns Tasks with no `teamId`. Renders like a Team but is not persisted as one.

**Drag intake**:
The state machine in `useDragDrop` that owns drag lifecycle (mousedown / mousemove / mouseup), hover detection, and source/target container inference. Stateful; reacts to DOM events. Does not compute new Task positions itself — delegates to **Drag projection**.

**Drag projection**:
A pure function `projectDrag(allTasks, dragOp) → nextTasks` that produces the complete next Task state for a drag. Owns geometric delta application, team/lane reassignment, collision resolution (swimlane push, staging compaction, gantt insertion), and source-container fallout. Both the live drag preview and the commit at drop call it with the same `dragOp` so the user sees exactly what gets saved. Gantt `position` re-indexing is a commit-only normalization layered on top. Lane push/clamp helpers (`resolvePushOnMove`, `resolvePushOnResize`, `clampResizeLeft`, `resolvePushBlock`) and the week-index math live as private internals inside `utils/dragProjection.js` — they have no other callers.

**Staging utils**:
The cross-cutting helpers for the **Staging** row. `getStagingTasks(tasks, teamId)` returns staging Tasks of a Team sorted by `startDate`; `compactStagingRow(stagingTasks, anchorDate)` packs them contiguously from an anchor. Used by Drag projection, by `useTaskActions` when a new Staging Task is added, by `useDeleteWorkflow` after a Staging delete, and by App after a Team rename. Lives in `utils/staging.js`.

**History entry**:
One observable change to the Project, recorded for Undo/Redo and cross-session history. Shape: `{id, timestamp, userId, action, entityType, entityId, entityName, changes}` where `action ∈ {created, updated, deleted, moved, resized}` and `entityType ∈ {task, team, lane, project}`. `changes` maps field → `{from, to}`; for `deleted` entries it also carries `_snapshot` (the full entity payload) so the deletion is reversible cross-session. Schema and pure operations on it live in **History core**.

**History core**:
The pure module (`utils/historyCore.js`) that owns the **History entry** schema and three operations: `detectChanges(prevSnapshot, nextSnapshot, {projectId}) → rawEntries` (diff two Project snapshots into entries, including Project title), `stampEntries(rawEntries, {userId, now}) → entries` (assign id/timestamp/userId), and `reconstructStateAt(targetEntryId, history, currentSnapshot)` (reverse-apply newer entries to recover earlier state). Snapshot shape: `{tasks, teams, title}`. The `useUndoRedo` hook is a React binding around these three functions — it owns refs, debounce, undo/redo stacks, and the React mutations, but builds zero entries itself. Cloud sync of history entries is handled separately by `useSupabaseProject` which maps the schema to/from snake_case.

**View**:
Per-user, per-project sight settings. Includes the visible window of weeks (`viewStartDate` = leftmost Monday, `weeksShown`) **and** `unassignedCollapsed` (collapse state of the Unassigned group). Per-Team `collapsed` flags ride along in the same `user_project_settings` row but live on the Team objects themselves. Owned by `useProjectView` (`useProjectViewState` + `useProjectViewSave`); cloud LOAD is orchestrated by `useCloudBoot` because the loaded `collapsedTeamIds` must be merged into Team objects before the first `setTeams`. **Density** is also per-user but lives in a different DB table (`user_settings`, project-independent) and is owned by `useUserDensity` — not part of View.

### Sync

**Echo**:
A `postgres_changes` event that Supabase fires back to the originating client after that client's own write. Must be filtered out to avoid setting state from values the client already has.

**Pending flush**:
A local write that has been sent to Supabase but not yet confirmed (the upsert/delete Promise is unresolved). Tracked by id and payload **Fingerprint** in `useCloudSync`. While a Pending flush exists for an id, an arriving Echo with the same Fingerprint is dropped; an Echo with a different Fingerprint is accepted (it's a foreign edit, not an echo).

**Fingerprint**:
A stable hash of a Task/Team/Lane payload, computed identically on send and on receive. Two payloads with the same fields produce the same Fingerprint regardless of object identity.

**Realtime channel**:
The Supabase channel subscription. Owns transport — subscribe, presence, reconnect on network change, periodic health check. Knows nothing about Pending flushes. Surfaces two distinct callbacks: `onReconnect` fires only when a new channel was actually established (after channel error, health-check failure, or visibility/focus/online while the channel was not joined); `onResumeFromIdle({ trigger })` fires when the user returns to the tab (visibility/focus) or the network comes back online and the channel is still joined. The Sync layer decides what to do with each — today both trigger a Resync, but the policy lives on the Sync side, not in transport.

**Cloud sync**:
The bidirectional sync invariant. Owns the diff (local → DB), the flush, the Pending flush map, and the Echo filter. Consumes raw events from the Realtime channel. Implemented by the **Cloud sync coordinator**.

**Cloud sync coordinator**:
The plain-JS object that implements Cloud sync. Owns per-kind baselines, the Pending flush registry, debounce timers, in-flight promise gates, and cross-kind flush ordering (Teams flush before Tasks so foreign keys resolve). Constructed with `sbProject` and React mutators (`applyTasks`, `applyTeams`, `applyTitle`); exposes `noteLocalChange(kind, current)`, `onRemoteEvent(kind, event)`, `resync(loaders)`, `reset()`, `dispose()`. Kinds are `task`, `team` (owns Lanes as children), and `title`. The `useCloudSync` hook is a thin React binding around it. Tested without React via in-memory mutators + a stub `sbProject`.

**Resync**:
A full reload of Tasks/Teams/Lanes from the DB, triggered on focus, visibility change, network online, or reconnect. Marks all loaded ids as remote so the next local change diff doesn't echo them back.

**Suspicious bulk delete**:
A diff that would remove ≥50% of Teams or Lanes (minimum 3) with no compensating adds. Refused at flush time — almost always indicates a partial DB read overwrote local state, not real user intent.

## Relationships

- A **Project** has many **Teams** and many **Tasks**.
- A **Team** has many **Lanes**.
- A **Task** belongs to one **Project**, optionally one **Team**, optionally one **Lane**.
- A **Task** without a date lives in **Staging**; with a date, on the Gantt grid.
- **Cloud sync** consumes events from **Realtime channel**; **Realtime channel** does not know about **Cloud sync**.
- **Pending flushes** and **Echoes** are matched by **Fingerprint**, not by id alone.

## Example dialogue

> **Dev:** "User A edits a **Task** while User B is editing the same **Task**. What happens?"
> **Architect:** "Both clients send a flush. Each marks their own write as a **Pending flush** keyed by id + **Fingerprint**. When A receives B's **Echo**, the **Fingerprint** differs from A's pending payload — so A accepts B's change. Whichever flush lands at the DB second wins the row; this is last-writer-wins at the DB level. We don't currently prevent that — see ADR-0001."

## Flagged ambiguities

- "Sync" used to mean both **Realtime channel** transport and **Cloud sync** logic. Resolved: these are distinct modules.
- "Lane" used to mean both **Lane** (row within a Team) and **Staging** (positional row above the grid). Resolved: Staging is its own concept.
