# Database Architecture

## Principles

- Normalize transactional data.
- Make tenant boundaries explicit on every company-scoped table.
- Prefer narrow, predictable foreign keys and indexed filter columns.
- Separate operational history from high-volume event streams where needed.
- Use soft deletes only when the business requires recoverability.

## Core entity groups

- Identity: users, roles, permissions, sessions, API tokens, company memberships.
- Tenancy: companies, company settings, billing metadata, status, and onboarding state.
- Delivery: deliveries, delivery events, statuses, addresses, notes, and cancellation records.
- Customer: customers, contacts, identifiers, and communication preferences.
- Driver: drivers, vehicles, assignment history, availability, and compliance metadata.
- Integration: API keys, secret rotation history, webhook endpoints, delivery callbacks.
- Audit: activity logs, security logs, login attempts, and configuration changes.
- Reporting: daily aggregates, KPI snapshots, and export jobs.

## Indexing strategy

- Composite indexes on `company_id` plus time or status filters.
- Unique constraints for public identifiers and token fingerprints.
- Lookup indexes for tracking numbers, external references, and webhook event keys.
- Partial workflow queries supported through status and timestamp indexing.

## Relationships

- A company owns many users through membership records.
- A company owns many deliveries, customers, drivers, API keys, and webhook endpoints.
- A delivery has many timeline events and status changes.
- A user can have many audit entries and notification delivery records.
- A webhook endpoint has many delivery attempts and signature validations.

## Migration order

1. Identity and tenancy tables.
2. Permission and role tables.
3. Company settings and onboarding tables.
4. Customer, driver, and delivery core tables.
5. Integration and webhook tables.
6. Audit, notification, and reporting tables.
7. Seed data, lookup data, and demo-safe fixtures.

## Operational notes

- Use UUID or ULID public identifiers where external exposure is expected.
- Keep internal surrogate keys for efficient joins when appropriate.
- Enforce tenant-scoped uniqueness for API keys, tracking numbers, and external references.
- Partition large history tables later if volume warrants it.
