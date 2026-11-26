# No Optimistic Concurrency Control on concurrent Task/Team/Lane edits

The Cloud sync module's Fingerprint-based Pending flush map filters Echoes correctly and prevents a single user's stale local state from clobbering newer local state. It does **not** prevent two users editing the same row at nearly the same time from racing at the DB: whichever flush lands second overwrites the first (last-writer-wins). We accept this for now because (a) Projekt-Planer is used by small teams where simultaneous edits to the same Task are rare, and (b) the alternatives (version column with compare-and-set, CRDT) carry meaningful migration and complexity cost that isn't justified by the current usage pattern.

**Trigger to revisit:** a user-reported data-loss incident from concurrent edits, or any feature that makes simultaneous edits to the same row routine (e.g. real-time collaborative notes on a Task).
