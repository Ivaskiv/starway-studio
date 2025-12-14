// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // додайте інші змінні середовища
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}