# docs/instructions sync -> Claude Project

This script syncs files in `docs/instructions/` into Claude Project knowledge documents.

- Project: `019e7028-1e4d-701e-a353-66d70c440565`
- URL: https://claude.ai/project/019e7028-1e4d-701e-a353-66d70c440565

## 1) Set auth in `.env`

Add this to root `.env`:

```bash
CLAUDE_SESSION_KEY=your_session_key_here
```

How to get it from browser DevTools:

1. Open `https://claude.ai` in your signed-in browser.
2. Open DevTools -> Application (or Storage) -> Cookies -> `https://claude.ai`.
3. Find cookie `sessionKey`.
4. Copy its value into `CLAUDE_SESSION_KEY`.

## 2) Run once

Sync all supported files one time:

```bash
pnpm sync:docs
```

## 3) Watch mode

Watch `docs/instructions/**/*` and sync on `add`/`change`:

```bash
pnpm sync:docs:watch
```

Notes:

- Debounce is `800ms` per file to handle rapid saves.
- Supported file types: `.md`, `.txt`, `.ts`, `.json`.
- Binary files are skipped with a log entry.
- Local state file is persisted at `scripts/.instructions-sync-state.json`.
