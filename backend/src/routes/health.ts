/**
 * Health Check Routes
 */

import { Router } from 'express';
import { prisma } from '../db/client.js';

const router = Router();

router.get('/health', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: '✗',
      openai: '✗',
      memory: '✗'
    },
    memory: {
      used: 0,
      total: 0,
      percentage: 0
    }
  };

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.services.database = '✓';
  } catch (error) {
    checks.services.database = '✗ Error';
    checks.status = 'degraded';
  }

  // OpenAI check
  try {
    if (process.env.OPENAI_API_KEY) {
      checks.services.openai = '✓';
    }
  } catch (error) {
    checks.services.openai = '✗';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  checks.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024),
    total: Math.round(memUsage.heapTotal / 1024 / 1024),
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
  };

  if (checks.memory.percentage > 90) {
    checks.services.memory = '⚠️ High';
    checks.status = 'degraded';
  } else {
    checks.services.memory = '✓';
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(checks);
});

router.get('/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Database not ready' });
  }
});

router.get('/health/live', (req, res) => {
  res.status(200).json({ alive: true });
});

export default router;