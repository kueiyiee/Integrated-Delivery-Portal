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
2. Update the database and app values for your environment.
3. Do not commit your local .env file.
4. Keep the root .env.example as a template for repository use.

## Backend setup

```bash
cd backend
composer install
php artisan key:generate
php artisan migrate
php artisan serve
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

## Build and deployment

- Frontend build: `npm run build`
- Backend application: deployed via Laravel-ready PHP environment
- Deployment examples live in deployment/ and the platform documentation folders

## Security notes

- Real credentials must never be committed to the repository.
- Use environment variables and placeholder values in `.env.example`.
- Secrets should be rotated if they were ever published in a prior version of the project.

## Documentation

The project documentation is organized under the docs/ folder and covers requirements, design, API, database, security, deployment, and testing.

## Development guidance

This repository is intended for educational and platform-development use within a controlled environment. Contributions should preserve the current architecture and avoid introducing unsupported features without matching backend/frontend updates.

## License

This repository is for internal project development and educational use. Review local compliance and licensing requirements before production deployment.
