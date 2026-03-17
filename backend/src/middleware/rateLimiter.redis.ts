/**
 * Rate Limiting with Redis - OPTIONAL
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

// ✅ Create Redis client properly
let redisClient: ReturnType<typeof createClient> | null = null;

if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL
  });

  redisClient.connect().catch((err: unknown) => {
    console.error('Redis connection error:', err);
    redisClient = null;
  });
}

// General API rate limit with Redis
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && {
    store: new RedisStore({
      // @ts-expect-error - RedisStore types issue
      client: redisClient,
      prefix: 'rl:api:'
    })
  })
});

// Auth limiter with Redis
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many login attempts',
    message: 'Too many login attempts, please try again in 15 minutes.'
  },
  ...(redisClient && {
    store: new RedisStore({
      // @ts-expect-error - RedisStore types issue
      client: redisClient,
      prefix: 'rl:auth:'
    })
  })
});
