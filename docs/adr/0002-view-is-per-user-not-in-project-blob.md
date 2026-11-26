# View settings are per-user, not part of a Project

The [glossary](../glossary.md) defines **View** (`viewStartDate`, `weeksShown`) as per-user, not shared. The cloud already enforces this: per-user-per-project fields live in `user_project_settings` (synced by `useCloudUserSettings`), and `density` lives in `user_settings`. The project blob in localStorage and in file exports, however, still carries these fields for historical reasons — predating the per-user split.

The **Project intake validator** introduced for local-origin loads (localStorage open, file open, import) strips per-user fields from incoming data. A Project means Tasks, Teams, Lanes, title, and id — nothing else. File exports likewise stop emitting per-user fields. On load, the current user's View is preserved; nothing from the imported file overrides it.

**Alternatives considered:**

- *Status quo (View rides in the project blob)*: contradicts the [glossary](../glossary.md) and lets a file open silently mutate the current user's workspace state.
- *Mode-dependent (strip in cloud sessions, keep in pure-localStorage)*: two code paths for the same concept; the localStorage-only case is a single-user session anyway, so falling back to "current state" works without special-casing.

**Trade-off accepted:** old `.json` exports that include View fields will have those fields ignored on import. Acceptable because exports almost always round-trip within one user, and the receiving user has their own View regardless.

**Trigger to revisit:** a feature that genuinely requires "share my exact view of this project with another user" (e.g. screenshot-style snapshots, presenter mode). At that point introduce a separate Snapshot concept rather than re-coupling View to Project.
