# Deployment Guide

## Project deployment architecture

- Frontend: React + Vite deployed to Vercel
- Backend: Laravel API deployed to Render
- Database: MySQL-compatible relational database
- Communication: HTTPS from Vercel frontend to Render backend

## Frontend deployment on Vercel

1. Import the repository into Vercel.
2. Set the root directory to `frontend`.
3. Use the following configuration:
   - Framework: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. Add the environment variable:
   ```env
   VITE_API_URL=https://YOUR-BACKEND-DOMAIN
   ```
5. Keep the app production-safe by avoiding localhost values in deploy settings.
6. The included `frontend/vercel.json` ensures SPA routing works correctly for direct navigation.

## Backend deployment on Render

1. Create a new Render web service.
2. Set the root directory to the `backend` folder.
3. Configure the build command:
   ```bash
   composer install --no-dev --optimize-autoloader
   ```
4. Configure the start command:
   ```bash
   php artisan serve --host 0.0.0.0 --port $PORT
   ```
5. Add production environment variables:
   ```env
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://YOUR-BACKEND-DOMAIN
   FRONTEND_URL=https://YOUR-VERCEL-DOMAIN
   DB_HOST=YOUR_DB_HOST
   DB_DATABASE=YOUR_DB_NAME
   DB_USERNAME=YOUR_DB_USERNAME
   DB_PASSWORD=YOUR_DB_PASSWORD
   CORS_ALLOWED_ORIGINS=https://YOUR-VERCEL-DOMAIN
   SANCTUM_STATEFUL_DOMAINS=YOUR-VERCEL-DOMAIN
   ```
6. Run migrations after deployment:
   ```bash
   php artisan migrate --force
   ```
7. Generate or set `APP_KEY` in the production environment before routing requests.

## Production requirements

- Use HTTPS in all application URLs.
- Configure `SESSION_SECURE_COOKIE=true` for production.
- Keep `CORS` restricted to the deployed Vercel origin.
- Do not commit `.env` files, real credentials, or secret values to Git.
- Use a persistent object store or durable disk for uploaded media if the application is expected to retain uploaded files beyond the ephemeral filesystem.

## Validation checklist

- `npm install` succeeds
- `npm run build` succeeds
- `php artisan config:cache` succeeds
- `php artisan route:cache` succeeds
- `php artisan migrate --force` succeeds against the production database
- Browser routes work without unnecessary 404s
- API requests resolve correctly over HTTPS
