export class AuthServiceError extends Error {
  status: number
  code: string

  constructor(code: string, status = 500, message?: string) {
    super(message ?? code)
    this.name = 'AuthServiceError'
    this.status = status
    this.code = code
  }
}
