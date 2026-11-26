# Action hooks stay direct — no intent-object dispatcher

The action hooks (`useTaskActions`, `useTeamActions`, `useLaneActions`) accept history bindings (`commitDirect`, `flushPending`) as props from `useProjectStore` and call them inline at the right moments. An alternative shape — action hooks emit intent objects (`{kind: 'task.update', ...}`) consumed by a single dispatcher — is a well-known pattern and surfaces naturally during architecture review.

We keep the direct-commit shape.

**Reason:** no current cross-cutting concern justifies the indirection. The dispatcher pattern pays off when every state-changing operation must flow through one place — for validation, conflict detection, telemetry, audit log, command palette, etc. None of those exist today. Adding the dispatcher now means rewriting every action hook and every call site to thread intent objects through a layer that has no consumer behind it. Locality is better served by leaving each action as one place where the change happens, the history is recorded, and the cloud flush is scheduled.

**Alternatives considered:**

- *Intent dispatcher*: every action hook emits `{kind, payload}` objects; a single dispatcher decides when to commit history and apply. Right shape if a cross-cutting concern lands.
- *Status quo (chosen)*: action hooks call history bindings inline.

**Trigger to revisit:** a planned feature that genuinely requires every state-changing operation to flow through one place. Concrete examples: a command palette that lists undoable actions; a multi-user conflict resolver that needs to inspect an action before applying it; an audit log of every mutation.
