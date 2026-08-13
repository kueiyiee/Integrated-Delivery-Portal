# Security Guide

## Baseline controls

- Validate every request payload.
- Authorize every protected action.
- Rate limit public and authenticated endpoints.
- Log security-relevant events.
- Rotate API secrets and webhook signing keys.

## Data handling

- Encrypt sensitive secrets at rest.
- Never store raw API secrets after initial display.
- Mask sensitive values in logs and UI.
- Apply least privilege to support and admin roles.
