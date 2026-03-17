// frontend/src/shared/api.ts

export default {
  async get(url: string) {
    console.debug('[fake api] GET', url)
    return { data: {} }
  },
  async post(url: string, body: unknown) {
    console.debug('[fake api] POST', url, body)
    return { data: { success: true } }
  },
}
