# Testing Guide

## Backend

Use the Laravel test suite to validate application behavior.

```bash
cd backend
php artisan test
```

## Frontend

Use the frontend build and lint checks to validate the client.

```bash
cd frontend
npm run build
npm run lint
```

## Scope

Test coverage should validate critical user flows, validation behavior, dashboard access, API key controls, and webhook lifecycle operations.
