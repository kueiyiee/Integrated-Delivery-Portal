# API Reference

## Base URL

The backend exposes a versioned API under the following prefix:

```text
/api/v1
```

## Authentication

Most protected operations require Laravel Sanctum authentication. Tokens are acquired through the authentication endpoints and sent as bearer tokens or session-backed requests depending on the deployment model.

## Core endpoints

### Authentication

- POST /auth/login
- POST /auth/register
- POST /auth/logout
- GET /auth/me
- POST /auth/change-password
- POST /auth/forgot-password
- POST /auth/reset-password
- GET /auth/verify-email
- POST /auth/resend-verification
- POST /auth/mfa/verify
- GET /auth/mfa/setup
- POST /auth/mfa/confirm

### Admin

- GET /admin/dashboard
- GET /admin/security
- GET /admin/analytics
- GET /admin/reports
- GET /admin/reports/history
- GET /admin/audit-logs
- GET /admin/companies
- GET /admin/api-keys

### Client

- GET /client/deliveries
- POST /client/deliveries
- GET /client/deliveries/{delivery}
- PUT /client/deliveries/{delivery}
- DELETE /client/deliveries/{delivery}
- POST /client/deliveries/{delivery}/cancel
- GET /client/customers
- GET /client/company
- PUT /client/company
- GET /client/company/users
- POST /client/company/users
- GET /client/api-management/api-keys
- GET /client/api-management/webhooks

## Report verification

The platform includes public and administrative verification routes for report-related validation flows.

- GET /public/reports/verify/{token}
- GET /reports/verify/{token}

## Notes

The actual API surface is defined in the Laravel route configuration and should be validated against the active backend implementation before production exposure.
