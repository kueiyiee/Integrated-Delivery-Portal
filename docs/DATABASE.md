# Database Design

## Overview

The project is designed around a MySQL relational database with company-scoped records, system administration tables, and operational logs.

## Key entities

- users
- companies
- roles
- permissions
- deliveries
- customers
- drivers
- api_keys
- webhook_endpoints
- webhook_logs
- api_request_logs
- report_exports
- audit_logs

## Relationships

- Users belong to one company or may be system-level.
- Companies own users, deliveries, API keys, and webhook records.
- Roles and permissions support authorization checks.
- Audit and request logs are associated with operational activities.

## Important database principles

- Use foreign keys and company-scoped queries where appropriate.
- Maintain explicit status fields for approval and lifecycle management.
- Keep secret material out of the database schema and rely on environment variables for credentials.
- Store audit and export metadata for operability and traceability.

## Schema source

The database design artifacts are maintained under the database/diagrams directory and the Laravel migration set in backend/database/migrations.
