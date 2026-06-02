# Docs Navigation

## Source Of Truth Zones
- `docs/client/` — business and client operations truth
- `docs/dev-skills/` — skills and execution truth
- `docs/architecture/` — platform, lifecycle, callback, Telegram, and orchestration architecture truth
- `docs/platform/` — transitional redirect layer for platform governance
- `docs/automation/` — transitional redirect layer for lifecycle/callback/telegram maps

## Registry And Temporary Zones
- `docs/agents/` — lightweight agent registry (references only)
- `docs/test-instructions/` — temporary QA/smoke instructions (`REMOVE_TEST_DOCS`)
- `docs/archive/` — historical one-off audits, runbooks, and legacy artifacts

## Root Utility Docs
- `docs/prompt.md` — prompt inventory and mapping
- `docs/routes.md` — system route map
- `docs/temporary-overrides.md` — temporary override registry

## Maintenance Rules
1. Do not copy business/platform/skills content into registry folders.
2. Add temporary QA instructions only under `docs/test-instructions/`.
3. Move one-off dated audits/runbooks to `docs/archive/`.
4. Keep production-facing source docs inside their truth zones.
