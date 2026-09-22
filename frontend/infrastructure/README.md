# Infrastructure Overview

This directory groups operational and infrastructure configuration for the project.

Subfolders

- `logging/` — logging configuration, log rotation, and ingestion pipelines (e.g., Fluentd, Filebeat, Logstash).
- `monitoring/` — monitoring dashboards, exporters, Prometheus rules, alerting playbooks.
- `security/` — hardening guides, firewall rules, WAF configs, and audit playbooks.

Guidelines

- Keep environment-specific configuration (secrets, credentials, keys) out of the repository.
- Store deployable manifests (Helm charts, Terraform files, CloudFormation) in dedicated subfolders under these directories if they are added.

Next steps

- I can scaffold sample Prometheus alert rules and a Fluent Bit configuration if you want starter templates.
