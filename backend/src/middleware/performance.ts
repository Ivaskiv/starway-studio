/**
 * Performance Monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger.js';

const SLOW_REQUEST_THRESHOLD = 3000; 

export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        threshold: `${SLOW_REQUEST_THRESHOLD}ms`
      });
    }
  });

  next();
}