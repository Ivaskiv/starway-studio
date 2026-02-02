// frontend/src/shared/utils/apiNormalizer.ts
export function withNormalizer<TBackend, TFrontend>(
  normalizeFn: (api: TBackend) => TFrontend
) {
  return (data: TBackend | TBackend[]): TFrontend | TFrontend[] => {
    if (Array.isArray(data)) {
      return data.map(normalizeFn)
    }
    return normalizeFn(data)
  }
}
