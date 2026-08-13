# Folder Architecture

## Top-level layout

- `backend/` Laravel application and API.
- `frontend/` React portal and landing experience.
- `docs/` architecture, API, deployment, and user documentation.
- `database-design/` ERD, DBML, migration notes, and backups.
- `deployment/` Docker, web server, SSL, and operational scripts.
- `postman/` API collections and environment files.
- `mobile-api/` mobile client contract and future app integration surface.
- `scripts/` automation helpers and admin utilities.

## Backend structure

- `app/Http/Controllers/API/Admin` admin endpoints.
- `app/Http/Controllers/API/Client` tenant endpoints.
- `app/Http/Controllers/API/Delivery` delivery lifecycle endpoints.
- `app/Http/Controllers/API/Authentication` login, register, password reset, verification, 2FA.
- `app/Http/Controllers/API/Webhooks` inbound and outbound webhook management.
- `app/Http/Controllers/API/Settings` company and system settings.
- `app/Repositories` persistence abstraction.
- `app/Services` business workflows and orchestration.
- `app/Events` and `app/Listeners` domain event handling.
- `database/migrations` ordered schema changes.
- `database/seeders` baseline and demo-safe seed data.
- `tests/Feature` and `tests/Unit` application coverage.

## Frontend structure

- `src/components/ui` design system primitives.
- `src/components/layout` shell, nav, sidebar, topbar, and app chrome.
- `src/pages/Landing` marketing pages.
- `src/pages/Auth` login, register, forgot password, and verification.
- `src/pages/Client` operational portal pages.
- `src/pages/Admin` admin, monitoring, and security views.
- `src/routes` route definitions and guards.
- `src/services` typed API clients.
- `src/styles` tokens, Tailwind layers, and theme primitives.

## Documentation structure

- `docs/Architecture` system, folder, workflow, and standards.
- `docs/API` endpoint catalog, auth, errors, versioning, and webhooks.
- `docs/Database` schema, indexes, ER diagram, and migration order.
- `docs/Deployment` environment variables, release process, and operations.
- `docs/UIUX` design language, accessibility, and page inventory.
- `docs/UserGuide` portal usage and role-based walkthroughs.
