// backend/src/modules/auth/middleware/auth.ts

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/modules/auth/auth.service.js';

/**
 * Extend Express Request type
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email: string;
      };
    }
  }
}

/**
 * 🔐 AUTH REQUIRED MIDDLEWARE
 * Verifies JWT token and attaches user to request
 */
export async function authRequired(req: Request, res: Response, next: NextFunction) {
  console.log('═══════════════════════════════════════');
  console.log('🔐 [Auth Middleware] START');
  console.log('═══════════════════════════════════════');
  console.log('📋 Path:', req.path);
  console.log('📋 Method:', req.method);

  try {
    // 1️⃣ GET AUTHORIZATION HEADER
    const authHeader = req.headers.authorization;
    console.log('📋 Authorization header:', authHeader ? `Present (${authHeader.substring(0, 30)}...)` : '❌ Missing');

    if (!authHeader) {
      console.log('❌ [Auth] No Authorization header found');
      return res.status(401).json({ 
        error: 'token_required',
        message: 'Authorization header is required' 
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ [Auth] Authorization header does not start with "Bearer "');
      return res.status(401).json({ 
        error: 'invalid_token_format',
        message: 'Authorization header must start with "Bearer "' 
      });
    }

    // 2️⃣ EXTRACT TOKEN
    const token = authHeader.split(' ')[1];
    console.log('🔑 Token extracted:', token.substring(0, 20) + '...');

    if (!token) {
      console.log('❌ [Auth] Token is empty');
      return res.status(401).json({ 
        error: 'token_required',
        message: 'JWT token is required' 
      });
    }

    // 3️⃣ VERIFY TOKEN
    console.log('🔍 Verifying token...');
    const decoded = verifyToken(token);

    console.log('✅ Token decoded successfully:', {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email
    });

    // 4️⃣ ATTACH USER TO REQUEST
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    console.log('✅ req.user set successfully');
    console.log('═══════════════════════════════════════');
    console.log('✅ [Auth Middleware] PASSED - calling next()');
    console.log('═══════════════════════════════════════\n');

    next();

  } catch (err: any) {
    console.error('═══════════════════════════════════════');
    console.error('❌ [Auth Middleware] ERROR');
    console.error('═══════════════════════════════════════');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);

    // JWT specific errors
    if (err.name === 'TokenExpiredError') {
      console.error('⏰ Token has expired');
      return res.status(401).json({
        error: 'token_expired',
        message: 'JWT token has expired. Please login again.',
      });
    }

    if (err.name === 'JsonWebTokenError') {
      console.error('🔒 Invalid JWT token');
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Invalid JWT token',
      });
    }

    if (err.name === 'NotBeforeError') {
      console.error('⏳ Token not yet active');
      return res.status(401).json({
        error: 'token_not_active',
        message: 'Token is not yet valid',
      });
    }

    // Generic auth error
    console.error('💥 Generic auth error');
    return res.status(401).json({
      error: 'authentication_failed',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Authentication failed',
    });
  }
}

/**
 * 🔓 OPTIONAL AUTH MIDDLEWARE
 * Tries to authenticate but doesn't fail if no token
 */
export async function authOptional(req: Request, res: Response, next: NextFunction) {
  console.log('ℹ️  [Auth Optional] START');

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('ℹ️  [Auth Optional] No token provided - continuing without auth');
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    console.log('✅ [Auth Optional] User authenticated:', decoded.email);
    next();

  } catch (err) {
    console.log('ℹ️  [Auth Optional] Auth failed - continuing without user');
    next(); // Continue without user
  }
}

/**
 * 👑 ADMIN ONLY MIDDLEWARE
 * Requires user to be ADMIN
 */
export async function adminOnly(req: Request, res: Response, next: NextFunction) {
  console.log('👑 [Admin Only] Checking admin access...');

  if (!req.user) {
    console.log('❌ [Admin Only] No user in request');
    return res.status(401).json({ 
      error: 'authentication_required',
      message: 'You must be authenticated to access this resource' 
    });
  }

  if (!['ADMIN'].includes(req.user.role)) {
    console.log('❌ [Admin Only] User is not admin:', req.user.role);
    return res.status(403).json({
      error: 'admin_only',
      message: 'This resource is only accessible to administrators',
      currentRole: req.user.role
    });
  }

  console.log('✅ [Admin Only] Admin access granted:', req.user.email);
  next();
}