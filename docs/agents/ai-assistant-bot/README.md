# AI Assistant Bot Knowledge

Canonical knowledge files for the Telegram AI assistant live in this folder.

Use these files as the single source of truth:
- `00-SURGICAL-SYSTEM-UPDATE.md`
- `ANALYSIS-strict-guardrails.md`
- `FOCUS-Overview.md`
- `ABSystem-Methodology.md`
- `Pricing-and-Packages.md`
- `FAQs-Common-Objections.md`
- `10-TEST-QUESTIONS.md`

Runtime implementation:
- `backend/src/modules/telegram-mentor/services/STRICT-SYSTEM-code.ts`

Deprecated duplicate filenames were removed during architecture cleanup to avoid split knowledge and drift.
