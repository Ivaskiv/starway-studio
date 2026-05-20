# STANKEY Media Catalog

- Google Drive is the source media storage.
- Backend DB stores only user progress and runtime state.
- Media metadata lives in `storage/media/stankey/catalog/media.catalog.json`.
- Telegram sends URLs or file refs only; binary assets are not stored in Prisma.

Recommended future architecture:

- Google Drive or CDN as source media storage.
- Cached Telegram `file_id` references for repeated delivery.
- No binary media blobs in the database.
- Keep the catalog as the lightweight metadata layer for sequential delivery.
