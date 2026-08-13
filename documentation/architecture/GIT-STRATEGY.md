# Git Strategy

## Branch model

- `main`: production-ready release line.
- `develop`: integration branch for completed sprint work.
- `feature/<area>-<short-name>`: isolated work for new functionality.
- `hotfix/<issue>`: urgent production fixes.
- `release/<version>`: stabilization branch before production deploy.

## Merge rules

- All changes enter through pull requests.
- Rebase or squash merge depending on the target branch policy.
- No direct pushes to `main`.
- Every PR must pass tests, linting, and review.

## Commit guidance

- Keep commits focused and descriptive.
- Prefer one logical change per commit.
- Reference ticket or issue numbers in commit or PR descriptions.
