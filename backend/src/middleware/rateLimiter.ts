//
import rateLimit from 'express-rate-limit';
/**
 * Rate Limiting Middleware - FIXED
 */

// ✅ ПРОСТИЙ ВАРІАНТ БЕЗ REDIS (для початку)
// Redis потрібен тільки для distributed systems (multiple servers)

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth endpoints rate limit (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many login attempts',
    message: 'Too many login attempts, please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// AI endpoints rate limit (expensive)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 AI requests per hour
  message: {
    error: 'AI rate limit exceeded',
    message: 'You have exceeded the AI request limit. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Payment endpoints rate limit
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 payment attempts per hour
  message: {
    error: 'Payment rate limit exceeded',
    message: 'Too many payment attempts. Please contact support.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// File upload rate limit
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});