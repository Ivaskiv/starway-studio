// frontend/src/features/wheel/hooks/useWheel.ts
import { useEffect, useState } from 'react';
import { useCreateWheelAssessmentMutation, useGetLatestWheelAssessmentQuery } from '@/features/wheel/api';
import { WheelAssessment, WheelScore } from '../types/wheel.types';

const WHEEL_DB_NAME = 'wheelDB'
const WHEEL_STORE_NAME = 'spheres'

function openWheelDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(WHEEL_DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(WHEEL_STORE_NAME)) {
        db.createObjectStore(WHEEL_STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadWheelCache(userId: string): Promise<WheelAssessment | null> {
  if (typeof window === 'undefined' || !userId) return null

  const db = await openWheelDb()
  return await new Promise((resolve, reject) => {
    const transaction = db.transaction(WHEEL_STORE_NAME, 'readonly')
    const store = transaction.objectStore(WHEEL_STORE_NAME)
    const request = store.get(userId)

    request.onsuccess = () => resolve((request.result as WheelAssessment | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function saveWheelCache(userId: string, value: WheelAssessment) {
  if (typeof window === 'undefined' || !userId) return

  const db = await openWheelDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(WHEEL_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(WHEEL_STORE_NAME)
    const request = store.put(value, userId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const useWheel = (userId: string) => {
  const { data: latest, isLoading } = useGetLatestWheelAssessmentQuery(userId, {
    skip: !userId,
  });
  const [createWheel] = useCreateWheelAssessmentMutation();
  const [cachedLatest, setCachedLatest] = useState<WheelAssessment | null>(null)

  useEffect(() => {
    let isMounted = true

    void loadWheelCache(userId)
      .then((value) => {
        if (isMounted) {
          setCachedLatest(value)
        }
      })
      .catch(() => undefined)

    return () => {
      isMounted = false
    }
  }, [userId])

  useEffect(() => {
    if (!latest || !userId) return
    void saveWheelCache(userId, latest).catch(() => undefined)
    setCachedLatest(latest)
  }, [latest, userId])

  const submitWheel = async (scores: WheelScore[]) => {
    const result = await createWheel({ userId, scores }).unwrap();
    await saveWheelCache(userId, result).catch(() => undefined)
    setCachedLatest(result)
    return result
  };

  return { latest: latest ?? cachedLatest, isLoading, submitWheel };
};
