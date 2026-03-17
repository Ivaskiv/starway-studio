// backend/src/modules/funnel/policy.ts
import type { UserRole } from '../../types/globalTypes.js';

export interface AuthContext {
  id: string;
  role: UserRole;
  email: string | null;
}

export function canOverrideFunnelOwner(ctx: AuthContext): boolean {
  return ctx.role === 'ADMIN' || ctx.role === 'SUPERADMIN';
}

export function canManageFunnel(
  ctx: AuthContext,
  funnelOwnerId: string,
): boolean {
  return (
    ctx.role === 'ADMIN' ||
    ctx.role === 'SUPERADMIN' ||
    ctx.id === funnelOwnerId
  );
}
