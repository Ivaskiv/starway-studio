// backend/src/modules/products/controller.ts
/**
 * Products Controller - UPDATED
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/db/client.js';
import { isSuperAdminEmail } from '@/modules/auth/superadmin.js';
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
  getUserEnrollments
} from './service.js';

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const products = await getAllProducts();
    return res.status(200).json(products);
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    let product = await getProductById(id);
    if (!product) {
      product = await getProductByCode(id);
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

export async function getMyProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const products = await getUserProducts(userId);
    return res.status(200).json(products);
  } catch (error) {
    next(error);
  }
}

export async function createProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;
    const requesterEmail = req.user?.email;

    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      code,
      name,
      description,
      priceCents,
      currency,
      durationDays,
      features,
      limits,
      ownerId: requestedOwnerId,
      ownerEmail,
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const canOverrideOwner =
      requesterRole === 'ADMIN' || isSuperAdminEmail(requesterEmail);
    let ownerId = requesterId;

    if ((requestedOwnerId || ownerEmail) && !canOverrideOwner) {
      return res.status(403).json({ error: 'forbidden_owner_override' });
    }

    if (requestedOwnerId && canOverrideOwner) {
      const owner = await prisma.user.findUnique({
        where: { id: requestedOwnerId },
        select: { id: true },
      });
      if (!owner) {
        return res.status(404).json({ error: 'owner_not_found' });
      }
      ownerId = owner.id;
    } else if (ownerEmail && canOverrideOwner) {
      const owner = await prisma.user.findFirst({
        where: { email: String(ownerEmail).toLowerCase().trim() },
        select: { id: true },
      });
      if (!owner) {
        return res.status(404).json({ error: 'owner_not_found' });
      }
      ownerId = owner.id;
    }

    const product = await createProduct({
      code,
      name,
      description,
      ownerId,
      priceCents,
      currency,
      durationDays,
      features,
      limits
    });

    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

export async function updateProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const product = await updateProduct(id, req.body);
    return res.status(200).json(product);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    next(error);
  }
}

export async function deleteProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await deleteProduct(id);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    next(error);
  }
}

export async function enrollInProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: productId } = req.params;
    const { purchased, trialDays } = req.body;

    const enrollment = await enrollUser({
      userId,
      productId,
      purchased,
      trialDays
    });

    return res.status(201).json(enrollment);
  } catch (error: any) {
    if (error.message.includes('already enrolled')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
}

export async function checkAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: productId } = req.params;
    const hasAccess = await checkProductAccess(userId, productId);
    
    return res.status(200).json({ hasAccess });
  } catch (error) {
    next(error);
  }
}

export async function getMyEnrollments(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const enrollments = await getUserEnrollments(userId);
    return res.status(200).json(enrollments);
  } catch (error) {
    next(error);
  }
}
