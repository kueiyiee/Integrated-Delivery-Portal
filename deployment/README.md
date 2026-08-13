# Deployment Overview

This folder contains server and container configuration used to deploy the Integrated Delivery Portal.

Structure

- `docker/`
  - `Dockerfile` — service image build instructions.
  - `docker-compose.yml` — local multi-container compose definition.

- `nginx/`
  - `default.conf` — example nginx site configuration.

- `apache/`
  - `delivery-portal.conf` — example Apache virtual host configuration.

- `ssl/`
  - `README.md` — placeholder for storing TLS certificates and related configuration.

- `scripts/`
  - `setup-xampp.ps1` — local environment setup script (moved here).

Notes

- These files are configuration artifacts only; application code was not modified.
- Keep secrets and production TLS assets out of the repository; reference secure stores (Vault, Key Management Service) instead.

Next steps

- Add CI/CD deploy scripts to `deployment/scripts/` or integrate into the existing `CI-CD-GUIDE.md` in `documentation/architecture/`.
- If you want, I can generate a small `docker-compose.override.yml` for local development.
