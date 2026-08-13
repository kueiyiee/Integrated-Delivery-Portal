# Deployment Guide

## Requirements

- PHP 8.3+
- Composer
- Node.js 18+
- npm
- MySQL 8+
- Web server or Laravel-ready hosting environment

## Backend deployment

1. Configure the application environment.
2. Install PHP dependencies with Composer.
3. Run migrations and seed if required.
4. Set the application key and database values in the environment.
5. Serve the Laravel application through Apache, Nginx, or a PHP hosting environment.

## Frontend deployment

1. Install JavaScript dependencies.
2. Run the production build using `npm run build`.
3. Serve the built artifact or integrate it into a deployment pipeline.

## Environment separation

Use environment-specific variables for local, test, and production deployments. Do not commit live credentials.
