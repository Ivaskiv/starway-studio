import { Response, NextFunction } from 'express';
import { prisma } from '@/db/client.js';
import { isSuperAdminEmail, isSuperAdminRequest } from '@/modules/auth/superadmin.js';
import { logSuperAdminAudit } from '@/utils/logger.js';
import {
  getAllProducts,
  getProductById,
  getProductByCode,
  createProduct,
  updateProduct,
  deleteProduct,
  getUserProducts,
  enrollUser,
  checkProductAccess,
  getUserEnrollments,
} from './service.js';
import { AuthenticatedRequest } from '@/types/globalTypes.js';

interface AuthenticatedUser {
  id: string;
  role: string;
  email?: string | null;
}

// ── Helper ──────────────────────────────────────────────────────────────
function requireUser(req: AuthenticatedRequest, res: Response): AuthenticatedUser | null {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return req.user;
}

// ── GET /api/products ───────────────────────────────────────────────
export async function getProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const isSuperAdmin = isSuperAdminRequest(req);
    const ownerId = isSuperAdmin ? undefined : req.user?.id;
    const products = await getAllProducts(ownerId);
    return res.status(200).json(products);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/products/my ─────────────────────────────────────────────
export async function getMyProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const products = await getUserProducts(user.id);
    return res.status(200).json(products);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/products/:id ───────────────────────────────────────────
export async function getProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const isSuperAdmin = isSuperAdminRequest(req);
    const ownerId = isSuperAdmin ? undefined : req.user?.id;

    const product = await getProductById(id, ownerId) ?? await getProductByCode(id, ownerId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.status(200).json(product);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/products ───────────────────────────────────────────────
export async function createProductHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const {
      code, name, description,
      priceCents, currency, durationDays,
      features, limits,
      ownerId: requestedOwnerId,
      ownerEmail,
    } = req.body;

    if (!code || !name) return res.status(400).json({ error: 'Code and name are required' });

    const canOverrideOwner = user.role === 'ADMIN' || isSuperAdminEmail(user.email);

    if ((requestedOwnerId || ownerEmail) && !canOverrideOwner) {
      return res.status(403).json({ error: 'forbidden_owner_override' });
    }

    let ownerId = user.id;

    if (requestedOwnerId && canOverrideOwner) {
      const owner = await prisma.user.findUnique({
        where: { id: requestedOwnerId },
        select: { id: true },
      });
      if (!owner) return res.status(404).json({ error: 'owner_not_found' });
      ownerId = owner.id;
    } else if (ownerEmail && canOverrideOwner) {
      const owner = await prisma.user.findFirst({
        where: { email: ownerEmail.toLowerCase().trim() },
        select: { id: true },
      });
      if (!owner) return res.status(404).json({ error: 'owner_not_found' });
      ownerId = owner.id;
    }

    const product = await createProduct({
      code, name, description,
      ownerId, priceCents, currency,
      durationDays, features, limits,
    });

    return res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/products/:id ──────────────────────────────────────────
export async function updateProductHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const isSuperAdmin = isSuperAdminRequest(req);

    const product = await updateProduct(id, req.body, isSuperAdmin ? undefined : user.id);

    if (isSuperAdmin) {
      logSuperAdminAudit('UPDATE_PRODUCT', {
        actorId: user.id,
        actorEmail: user.email ?? '',
        resource: 'Product',
        resourceId: id,
        method: req.method,
        path: req.path,
      });
    }

    return res.status(200).json(product);
  } catch (err: any) {
    if (err.message === 'product_not_found' || err.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    next(err);
  }
}

// ── DELETE /api/products/:id ─────────────────────────────────────────
export async function deleteProductHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const isSuperAdmin = isSuperAdminRequest(req);

    await deleteProduct(id, isSuperAdmin ? undefined : user.id);

    if (isSuperAdmin) {
      logSuperAdminAudit('DELETE_PRODUCT', {
        actorId: user.id,
        actorEmail: user.email ?? '',
        resource: 'Product',
        resourceId: id,
        method: req.method,
        path: req.path,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    if (err.message === 'product_not_found' || err.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    next(err);
  }
}

// ── POST /api/products/:id/enroll ─────────────────────────────────────
export async function enrollInProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id: productId } = req.params;
    const { purchased, trialDays } = req.body;

    const enrollment = await enrollUser({ userId: user.id, productId, purchased, trialDays });
    return res.status(201).json(enrollment);
  } catch (err: any) {
    if (err.message.includes('already enrolled')) return res.status(409).json({ error: err.message });
    if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
    next(err);
  }
}

// ── GET /api/products/:id/access ──────────────────────────────────────
export async function checkAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id: productId } = req.params;
    const hasAccess = await checkProductAccess(user.id, productId);
    return res.status(200).json({ hasAccess });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/products/enrollments ─────────────────────────────────────
export async function getMyEnrollments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const enrollments = await getUserEnrollments(user.id);
    return res.status(200).json(enrollments);
  } catch (err) {
    next(err);
  }
}