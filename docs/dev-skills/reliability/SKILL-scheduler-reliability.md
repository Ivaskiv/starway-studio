# SKILL: Scheduler Reliability

## Purpose
Reusable rules for cron safety, retries, dedupe, idempotency, and job overlap prevention.

## Ownership
Backend reliability and worker safety.

## Source Of Truth
- `docs/architecture/reliability-architecture.md`
- Scheduler and notification worker code
- Webhook and callback handlers

## TODO
- Describe retry boundaries
- Describe dedupe keys
- Describe job locking strategy
- Describe failure handling conventions
