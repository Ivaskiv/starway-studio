# Reliability Architecture

## Purpose
Canonical safety model for retries, idempotency, dedupe, webhook handling, and scheduler safety.

## Ownership
Backend/runtime reliability ownership.

## Source Of Truth
- Worker and webhook runtime code
- Scheduler and queue services
- Architecture hub

## TODO
- Define retry policy
- Define idempotency policy
- Define dedupe policy
- Define webhook and cron safety rules
