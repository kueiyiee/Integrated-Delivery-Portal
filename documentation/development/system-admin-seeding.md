System Owner Seeding

This project seeds a single permanent System Administrator account for the SaaS delivery portal.

Environment variables
- `PLATFORM_SYSTEM_OWNER_EMAIL` (optional) — delivery portal owner email (default: systemadmin@d.com)
- `PLATFORM_INITIAL_PASSWORD` (optional) — initial password used by the seeder (default: Admin@12345)

Notes
- The seeder is idempotent and will update the system owner if it already exists.
- Runtime registration is blocked from creating the system owner email; only console/seeding operations may set it.
- Do not commit `PLATFORM_INITIAL_PASSWORD` to source control in production; set it via your deployment environment.
