import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export type StankeyMediaType = 'audio' | 'video' | 'document' | 'image'

export type StankeyMediaCatalogItem = {
  id: string
  type: StankeyMediaType
  product: 'stankey'
  title: string
  driveUrl: string
  tags: string[]
  order: number
}

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)
const catalogPath = resolve(currentDirPath, '../../../../../storage/media/stankey/catalog/media.catalog.json')

let cachedCatalog: StankeyMediaCatalogItem[] | null = null

function loadCatalog(): StankeyMediaCatalogItem[] {
  if (cachedCatalog) {
    return cachedCatalog
  }

  const raw = readFileSync(catalogPath, 'utf8')
  const parsed = JSON.parse(raw) as StankeyMediaCatalogItem[]
  cachedCatalog = parsed
    .filter((item) => item && item.product === 'stankey')
    .sort((a, b) => a.order - b.order)

  return cachedCatalog
}

export function getMediaById(id: string): StankeyMediaCatalogItem | null {
  const normalizedId = String(id ?? '').trim()
  if (!normalizedId) {
    return null
  }

  return loadCatalog().find((item) => item.id === normalizedId) ?? null
}

export function getSequentialLessons(): StankeyMediaCatalogItem[] {
  return loadCatalog().filter((item) => item.tags.includes('lesson'))
}

export function getNextLesson(currentLessonId?: string | null): StankeyMediaCatalogItem | null {
  const lessons = getSequentialLessons()
  if (lessons.length === 0) {
    return null
  }

  const currentId = String(currentLessonId ?? '').trim()
  if (!currentId) {
    return lessons[0] ?? null
  }

  const currentIndex = lessons.findIndex((item) => item.id === currentId)
  if (currentIndex < 0) {
    return lessons[0] ?? null
  }

  return lessons[currentIndex + 1] ?? null
}
