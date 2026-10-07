export function isCanonicalDatabase(
  env?: NodeJS.ProcessEnv,
): boolean

export function assertCanonicalDbOperationAllowed(
  operation: string,
  env?: NodeJS.ProcessEnv,
): void

export function assertPrismaCommandAllowed(
  args: string[],
  env?: NodeJS.ProcessEnv,
): void
