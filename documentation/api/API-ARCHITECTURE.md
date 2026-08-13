# API Architecture

## Standards

- Base path: `/api/v1`.
- Transport: JSON over HTTPS.
- Authentication: Bearer tokens via Sanctum for machine access.
- Error format: standardized envelope with code, message, details, and trace correlation ID.
- Pagination: cursor or page-based depending on endpoint semantics.

## Resource groups

- Authentication and session management.
- Company and organization management.
- Delivery creation, retrieval, tracking, timeline, and cancellation.
- Customer and driver management.
- API key and secret rotation.
- Webhook registration, testing, retries, and delivery logs.
- Notifications, reports, analytics, and audit logs.
- Admin operations, monitoring, and system settings.

## Versioning

- Version is encoded in the path.
- Breaking changes are introduced in a new major version only.
- Response contracts are kept stable and documented in OpenAPI.

## Security controls

- Rate limits by route group and company identity.
- Policy checks before data retrieval or mutation.
- Request validation before service invocation.
- Webhook signature verification on inbound and outbound channels.

## API contract deliverables

- OpenAPI specification.
- Postman collection.
- Webhook event catalog.
- Error code registry.
- Auth and permission matrix.
