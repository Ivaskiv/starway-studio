# User Creation Governance

## Purpose

Keep one human mapped to one `User` record.

## Canonical rule

Always resolve identity first.

Use `resolveOrCreateUser({ telegramId?, chatId?, email?, telegramUserName? })` before any user creation.

## Allowed outcomes

- Existing user found -> reuse it.
- No user found -> create exactly one user through `UserCreationService.createUser()`.
- Multiple candidates found -> log a conflict and keep the first resolved candidate without auto-merging.

## Disallowed patterns

- Calling `prisma.user.create()` directly outside `UserCreationService`.
- Creating a new user before checking email, Telegram, and link identity.
- Auto-merging conflicting user records without a review log.

## Conflict logging

If resolution finds multiple candidates:

- write an ops record to `ContentItem`
- include candidate ids and identity hints
- continue with a non-destructive result

## Entry points

- Telegram `/start`
- Telegram Mini App auth
- Google login
- First login orchestration
- Lead magnet registration
- Tracking-event upsert

## Implementation notes

- `UserCreationService` remains the only create sink.
- `resolveOrCreateUser` is the canonical resolver.
- Manual merges stay explicit and reviewable.
