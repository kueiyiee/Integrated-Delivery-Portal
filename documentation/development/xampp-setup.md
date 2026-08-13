XAMPP Development Setup
======================

This file documents the exact steps to get the Delivery Portal project running on a fresh XAMPP installation on Windows.

Pre-requisites
--------------
- XAMPP installed (Apache + MySQL)
- Composer available in PATH
- Node.js and npm available in PATH
- Git installed
- Run PowerShell as Administrator for Apache restart steps

Quick automated setup (PowerShell)
---------------------------------
Run this script from the repository root in an elevated PowerShell prompt:

```powershell
.
\scripts\setup-xampp.ps1
```

Manual step-by-step (copy/paste)
--------------------------------
1. Backend dependencies

```powershell
cd backend
composer install --no-interaction --optimize-autoloader
composer dump-autoload -o
```

2. Frontend

```powershell
cd ../frontend
npm install
npm run build     # or `npm run dev` during active development
```

3. Environment and keys

```powershell
cd ../backend
copy .env.example .env
php artisan key:generate
php artisan storage:link
```

4. Database (MySQL)

Import the provided schema and seed the DB using the bundled SQL file. Assumes the XAMPP MySQL `root` user has no password.

```powershell
# from repo root (Windows / XAMPP)
"C:\xampp\mysql\bin\mysql.exe" -u root < database-design\mysql\delivery_portal_schema.sql
```

Then generate keys and links for the backend:

```powershell
cd backend
php artisan key:generate
php artisan storage:link
```

5. Apache configuration (XAMPP)

- Ensure `C:/xampp/apache/conf/extra/httpd-vhosts.conf` contains a VirtualHost pointing to `C:/xampp/htdocs/delivery-portal/backend/public` (this repo includes `deployment/apache/delivery-portal.conf`).
- If you need PHP 8.3 and XAMPP shipped an older version, point `C:/xampp/apache/conf/extra/httpd-xampp.conf` to the PHP 8.3 SAPI (`php8apache2_4.dll`) and set `PHPINIDir` accordingly. Restart Apache from the XAMPP Control Panel.

6. Run services

```powershell
# Option A (recommended for development): use Laravel dev server + Vite
cd backend
php artisan serve --host=127.0.0.1 --port=8000
# in separate shell
cd frontend
npm run dev

# Option B (Apache): ensure Apache is started and vhost is enabled then visit http://localhost
```

Verification
------------

```powershell
# backend
php -v
composer --version
php artisan route:list --path=health
curl -i http://127.0.0.1:8000/api/v1/health

# login check (seeded credentials)
curl -X POST http://127.0.0.1:8000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@acme.com","password":"Password123!"}'
```

If you prefer, run `\scripts\setup-xampp.ps1 -Force` to automate the steps.
