# Logistics Integration Platform

The Logistics Integration Platform is a multi-tenant delivery operations and integration platform built to support company onboarding, delivery lifecycle management, secure API access, webhook operations, and administrative oversight.

## Project overview

This repository contains the current application implementation for the platform, including:

- Laravel 13 backend API with role-based access control
- React 19 + TypeScript frontend client
- Company and user lifecycle management
- Delivery and customer management workflows
- API key and webhook administration
- Audit logging and report verification flows
- Structured documentation for architecture, security, deployment, and testing

## Features implemented

- Secure login, registration, password reset, MFA, and session management
- Platform-level and company-scoped admin workflows
- Company approval, verification, and lifecycle controls
- Delivery creation, editing, export, and cancellation flows
- Customer and driver-related records tied to delivery operations
- API key issuance/revocation and usage tracking
- Webhook creation, test delivery, rotation, and event history
- Audit logs, reporting, and document export management
- Documentation for deployment, security, and operations

## Technology stack

### Backend
- PHP 8.3+
- Laravel 13
- Sanctum authentication
- MySQL
- PHPUnit for backend tests

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind styling
- React Query and route-based app structure

### Additional tooling
- Docker and Apache/Nginx deployment examples
- DB schema design assets
- Postman and integration artifacts

## Repository layout

- backend/ — Laravel application and API logic
- frontend/ — React application
- database/ — schema diagrams and database assets
- documentation/ — project documentation and operational references
- deployment/ — deployment-related configuration
- integrations/ — external integration assets
- tests/ — project-level testing resources
- docs/ — SRS, SDD, API, database, deployment, and security documentation

## Requirements

- PHP 8.3+
- Composer
- Node.js 18+
- npm
- MySQL 8+
- A local web server or Laravel-ready environment such as XAMPP or Docker

## Environment configuration

1. Copy the backend environment template:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. For frontend deployment, copy the Vite environment template:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
3. Update the environment values for your local or production deployment.
4. Do not commit your local .env file.
5. Keep the root and backend `.env.example` files as safe templates for repository use.

## Backend setup

```bash
cd backend
composer install
php artisan key:generate
php artisan migrate
php artisan serve --host 0.0.0.0 --port 8000
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

## Testing and validation

### Backend
```bash
cd backend
php artisan test
```

### Frontend
```bash
cd frontend
npm run build
npm run lint
```

## Production deployment

### Vercel (Frontend)

Set the project root to the `frontend` directory and define the environment variable:

```env
VITE_API_URL=https://YOUR-BACKEND-DOMAIN
```

Recommended build configuration:
- Framework: Vite
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

A SPA rewrite configuration is included in `frontend/vercel.json` to support direct navigation.

### Render (Backend)

The Laravel API should be deployed as a PHP web service using the backend directory as the app root. Use production values for:
- APP_ENV=production
- APP_DEBUG=false
- APP_URL=https://YOUR-BACKEND-DOMAIN
- FRONTEND_URL=https://YOUR-VERCEL-DOMAIN
- DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD
- CORS_ALLOWED_ORIGINS=https://YOUR-VERCEL-DOMAIN
- SANCTUM_STATEFUL_DOMAINS=YOUR-VERCEL-DOMAIN

Recommended deployment command:
```bash
php artisan serve --host 0.0.0.0 --port $PORT
```

After deployment, run:
```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Security notes

- Real credentials must never be committed to the repository.
- Use environment variables and placeholder values in `.env.example`.
- CORS and Sanctum are environment-driven and should be limited to the production frontend domain.
- Secrets should be rotated if they were ever published in a prior version of the project.

## Documentation

The project documentation is organized under the docs/ folder and covers requirements, design, API, database, security, deployment, and testing.

## Development guidance

This repository is intended for educational and platform-development use within a controlled environment. Contributions should preserve the current architecture and avoid introducing unsupported features without matching backend/frontend updates.

## License

This repository is for internal project development and educational use. Review local compliance and licensing requirements before production deployment.
