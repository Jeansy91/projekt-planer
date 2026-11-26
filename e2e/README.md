# E2E tests

| Folder | Playwright project | Needs |
|---|---|---|
| `tests/` | `local` (`yarn test:e2e`) | The dev server |
| `cloud/` | `cloud` (`yarn test:e2e:cloud`) | The dev server connected to a local Supabase |

Setup, conventions and the local Supabase are described in [docs/development.md](../docs/development.md#tests).
