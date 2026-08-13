# Development Email Setup (MailHog)

This project uses Laravel's mail system. For local development we recommend using MailHog to capture outgoing messages locally and avoid hitting real SMTP servers.

## Install MailHog

- On Windows, download the MailHog binary from: https://github.com/mailhog/MailHog/releases or install via Chocolatey:

```powershell
choco install mailhog
```

- Start MailHog (if installed via Chocolatey):

```powershell
Start-Process mailhog
```

MailHog runs on `http://localhost:8025` (web UI) and listens on SMTP port `1025` by default.

## Configure Laravel `.env`

Set these values in your `.env` for local development:

```
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=no-reply@local.test
MAIL_FROM_NAME="Delivery Portal (Local)"

# Ensure the frontend URL is set so verification links point correctly
APP_FRONTEND_URL=http://localhost:5173
```

Then clear config cache:

```bash
php artisan config:clear
php artisan cache:clear
```

## Verify

- Start MailHog and your local backend, then trigger a registration or password reset.
- Open `http://localhost:8025` to view captured emails and follow the verification/reset links.

## Notes

- The project creates signed temporary routes that redirect to the frontend. In development those redirects will resolve to `APP_FRONTEND_URL` configured above.
- For CI or ephemeral environments, consider using SMTP services or testing fakes as appropriate.
