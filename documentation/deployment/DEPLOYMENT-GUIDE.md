# Deployment Guide

## Target environments

- Local development.
- Continuous integration.
- Staging.
- Production.

## Runtime components

- Application containers for backend and frontend.
- Redis for cache and queue workloads.
- MySQL 8 for transactional storage.
- Nginx reverse proxy.
- Optional Apache compatibility deployment.

## Operational requirements

- Environment-specific `.env` values.
- Queue workers and scheduler supervision.
- Persistent log, cache, and storage volumes.
- Automated builds through GitHub Actions.
- Secrets managed outside source control.

## Deployment sequence

1. Build artifacts.
2. Run migrations.
3. Warm caches and config.
4. Restart queue workers.
5. Verify health checks and smoke tests.
