import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '@/types/globalTypes.js';
import { verifyToken } from '@/modules/auth/auth.service.js';

export async function authRequired(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'token_required',
        message: 'Authorization header is required',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'invalid_token_format',
        message: 'Authorization header must start with "Bearer "',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'token_required',
        message: 'JWT token is required',
      });
    }

    const decoded = verifyToken(token);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (err: unknown) {
    const error = err as { name?: string; message?: string };

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'token_expired',
        message: 'JWT token has expired. Please login again.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Invalid JWT token',
      });
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        error: 'token_not_active',
        message: 'Token is not yet valid',
      });
    }

    return res.status(401).json({
      error: 'authentication_failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Authentication failed',
    });
  }
}

export async function authOptional(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch {
    next();
  }
}

export async function adminOnly(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({
      error: 'authentication_required',
      message: 'You must be authenticated to access this resource',
    });
  }

  if (req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({
      error: 'admin_only',
      message: 'This resource is only accessible to administrators',
      currentRole: req.user.role,
    });
  }

  next();
}