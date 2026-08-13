# CI/CD Guide

## Pipeline stages

1. Install dependencies.
2. Run static checks and tests.
3. Build frontend assets.
4. Package deployment artifacts.
5. Deploy to staging.
6. Run smoke tests.
7. Promote to production after approval.

## Release discipline

- Protect mainline branches.
- Require successful checks before merge.
- Tag production releases.
- Keep rollback instructions available for every release.
