# Contributing to Projekt-Planer

Thanks for your interest in Projekt-Planer! Bug reports, ideas and pull requests are welcome.

## Reporting bugs and suggesting features

- Search the [existing issues](https://github.com/Jeansy91/projekt-planer/issues) first.
- Use the issue templates for bug reports and feature requests.
- **Security problems** must not be reported in a public issue. Follow [SECURITY.md](SECURITY.md) instead.

## Development setup

Yarn is checked into the repository (`.yarn/releases/`), so `corepack enable` is enough. Always use `yarn`, never `npm`.

```bash
corepack enable
yarn install
yarn dev
```

For accounts, sharing and realtime you need a local Supabase (Docker required). [docs/development.md](docs/development.md) describes the setup.

Run the tests before you open a pull request:

```bash
yarn test             # unit tests (Vitest)
yarn test:e2e         # E2E tests with local projects, the dev server must be running
yarn test:e2e:cloud   # E2E tests against a local Supabase
```

## Code guidelines

### One responsibility per file

- A file is a component, a hook, a utility or a spec, never a mix.
- Components: one per file in `src/components/`. Dialogs: one per file in `src/components/dialogs/`, re-exported from `index.js`.
- Hooks: one per file in `src/hooks/`, named after the concern they own. State is composed through `useProjectStore`.
- Utils: pure functions in `src/utils/`, grouped by domain. Unit tests sit next to them as `*.test.js`.
- When a file outgrows its purpose, split it.

### Minimal code

- No dead code: no commented-out blocks, unused variables or obsolete imports.
- No abstraction for a one-time operation; three similar lines beat a premature helper.
- Validate at system boundaries (user input, files, Supabase, external APIs), trust internal code.
- No backwards-compatibility shims: delete what is unused.

### Naming and comments

- Names of files, functions, variables and props describe what they are.
- Comment only what the code cannot say itself, such as the reason for a decision.
- Use the terms from the [glossary](docs/glossary.md).

### Consistency

- Styling with Tailwind CSS classes only, no inline styles or custom CSS.
- All user-facing text goes through react-i18next and needs both a German (`src/locales/de.json`) and an English (`src/locales/en.json`) translation.
- Database changes are added as a new migration in `supabase/migrations/`; never edit a released migration.
- New dependencies only when necessary.
- Larger decisions get a short record in [docs/adr/](docs/adr/).

## Commit messages

Projekt-Planer uses [Conventional Commits](https://www.conventionalcommits.org/). The commit types decide the next release version automatically (see [docs/ci-cd.md](docs/ci-cd.md)):

- `feat: ...` for a new feature
- `fix: ...` for a bug fix
- `docs:`, `test:`, `ci:`, `style:`, `chore:` for changes that do not need a release
- add `!` after the type (for example `feat!: ...`) for breaking changes

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make your change, run the tests and update the documentation if needed.
3. Open a pull request and fill in the template.
4. CI must pass (unit tests, production build, E2E tests, `yarn npm audit`, `gitleaks` and the Docker build).

Pull requests are merged with a squash merge, so the pull request title should follow the commit message format above.

## License

By contributing you agree that your contribution is licensed under the [AGPL-3.0-or-later](LICENSE), like the rest of the project.
