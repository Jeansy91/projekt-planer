# CI/CD

All workflows live in `.github/workflows/`.

| Workflow | Trigger | Jobs |
|---|---|---|
| `build-image.yml` | Pull requests, pushes to `main`, manual | Unit tests and build, security checks, E2E (pull requests only), Docker image, release, Dependabot merge |
| `e2e.yml` | Pushes to `main`, manual, called by `build-image.yml` | `local` and `cloud` Playwright projects |
| `security.yml` | Called by `build-image.yml`, every Monday, manual | `yarn npm audit`, gitleaks over the whole Git history |

## Build and release

`build-image.yml`:

1. `check`: `yarn test` and `yarn build`.
2. `security`: the security workflow.
3. `e2e`: on pull requests, the E2E workflow. On `main` the E2E workflow runs on its own, so it does not slow down publishing.
4. `image`: builds the image and starts it once as a smoke test. On `main` it also pushes it to `ghcr.io/jeansy91/projekt-planer`.
5. `release`: on `main`, when the commits since the last tag are release-relevant, it commits the new version to `package.json` (`chore(release): vX.Y.Z`), tags that commit and creates a GitHub release with generated notes.
6. `automerge`: merges Dependabot patch and minor updates once everything is green.

The next version follows the [Conventional Commits](https://www.conventionalcommits.org/) since the last tag:

| Commits since the last release | Version bump |
|---|---|
| `feat!:`, `fix!:` … or a `BREAKING CHANGE` footer | major |
| `feat:` | minor |
| `fix:`, `chore(deps):` and anything else | patch |
| only `ci:`, `docs:`, `test:`, `style:` or `chore:` (except `chore(deps)`) | no release |

The image is tagged with `latest`, the commit SHA and the version without the `v`. The version is written to `package.json` before the image is built, so the info dialog in the app shows the released version.

The release job pushes to `main` with the workflow token. If you protect `main` with required reviews, allow GitHub Actions to bypass the rule, otherwise the version commit fails.

## E2E

`e2e.yml` has two jobs:

- **local**: `yarn test:e2e` against the dev server. No Supabase.
- **cloud**: starts a local Supabase with `yarn supabase start -x studio,imgproxy` (migrations applied, analytics off), passes its URL and publishable key to the dev server and runs `yarn test:e2e:cloud`. The job summary reports the start time and the memory and CPU use of every Supabase container.

On failure, both jobs upload `test-results/`, and the cloud job prints the logs of the Supabase containers.

## Dependencies

Dependabot (`.github/dependabot.yml`) checks the npm packages, the Docker base images and the GitHub Actions every Monday. The Supabase CLI is an npm dev dependency, so its updates arrive the same way and reach the Docker image through `yarn.lock`.

## Security

`security.yml` fails on known vulnerabilities of severity high or above in `yarn.lock`, and on secrets anywhere in the Git history.
