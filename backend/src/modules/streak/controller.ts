// backend/src/modules/streak/controller.ts
// HTTP controller (thin)

import type { FastifyRequest } from 'fastify';
import { registerStreakActivity, getUserStreaks } from './service.js';
import type { RegisterStreakInput } from './types.js';

export async function registerStreakHandler(
  req: FastifyRequest<{ Body: RegisterStreakInput }>
) {
  const { userId, expertId, ruleKey, at } = req.body;

  return registerStreakActivity(
    userId,
    expertId,
    ruleKey,
    at ? new Date(at) : new Date(),
  );
}

export async function getUserStreaksHandler(
  req: FastifyRequest<{ Params: { userId: string } }>
) {
  return getUserStreaks(req.params.userId);
}