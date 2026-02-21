// backend/src/modules/funnel/controllers.ts
import type { Request, Response } from 'express';
import { prisma } from '@/db/client.js';
import { isSuperAdminEmail } from '@/modules/auth/superadmin.js';
import * as funnelService from './service.js';
import type { FunnelInput, GenerateAIFunnelInput } from './types.js';

// ========== GET FUNNELS ==========
export async function getFunnelsHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const funnels = await funnelService.getFunnels(userId);
    res.json({ funnels });
  } catch (error) {
    console.error('❌ getFunnels error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}

// ========== GET FUNNEL BY ID ==========
export async function getFunnelHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const funnel = await funnelService.getFunnelById(id);

    if (!funnel) {
      return res.status(404).json({ error: 'funnel_not_found' });
    }

    res.json({ funnel });
  } catch (error) {
    console.error('❌ getFunnel error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}

// ========== CREATE FUNNEL ==========
export async function createFunnelHandler(req: Request, res: Response) {
  try {
    const requesterId = req.user!.id;
    const requesterRole = req.user?.role;
    const requesterEmail = req.user?.email;
    const canOverrideOwner = requesterRole === 'ADMIN' || isSuperAdminEmail(requesterEmail);
    let ownerId = requesterId;

    const requestedOwnerId = req.body.ownerId as string | undefined;
    const ownerEmail = req.body.ownerEmail as string | undefined;
    if ((requestedOwnerId || ownerEmail) && !canOverrideOwner) {
      return res.status(403).json({ error: 'forbidden_owner_override' });
    }
    if (requestedOwnerId && canOverrideOwner) {
      const owner = await prisma.user.findUnique({ where: { id: requestedOwnerId }, select: { id: true } });
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

    const input: FunnelInput = {
      name: req.body.name,
      productIds: req.body.productIds || [],
      status: req.body.status || 'draft',
    };

    const funnel = await funnelService.createFunnel(ownerId, input);
    res.status(201).json({ funnel });
  } catch (error: any) {
    console.error('❌ createFunnel error:', error);

    if (error.message === 'Funnel name already exists') {
      return res.status(409).json({ error: 'name_already_exists' });
    }

    res.status(500).json({ error: 'server_error' });
  }
}

// ========== UPDATE FUNNEL ==========
export async function updateFunnelHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const input: Partial<FunnelInput> = {
      name: req.body.name,
      status: req.body.status,
    };

    const funnel = await funnelService.updateFunnel(id, input);
    res.json({ funnel });
  } catch (error) {
    console.error('❌ updateFunnel error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}

function canManageFunnel(req: Request, funnelOwnerId: string): boolean {
  const isAdmin = req.user?.role === 'ADMIN';
  const isSuperAdmin = isSuperAdminEmail(req.user?.email);
  return Boolean(isAdmin || isSuperAdmin || req.user?.id === funnelOwnerId);
}

export async function attachFunnelProductHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { productId } = req.body as { productId?: string };

    if (!productId) {
      return res.status(400).json({ error: 'product_id_required' });
    }

    const funnel = await funnelService.getFunnelById(id);
    if (!funnel) return res.status(404).json({ error: 'funnel_not_found' });
    if (!canManageFunnel(req, funnel.ownerId)) return res.status(403).json({ error: 'forbidden' });

    await funnelService.attachProductToFunnel(id, productId);
    const updated = await funnelService.getFunnelById(id);
    return res.json({ funnel: updated });
  } catch (error: any) {
    console.error('❌ attachFunnelProduct error:', error);
    if (error?.code === 'P2003') return res.status(404).json({ error: 'product_not_found' });
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function detachFunnelProductHandler(req: Request, res: Response) {
  try {
    const { id, productId } = req.params;
    const funnel = await funnelService.getFunnelById(id);
    if (!funnel) return res.status(404).json({ error: 'funnel_not_found' });
    if (!canManageFunnel(req, funnel.ownerId)) return res.status(403).json({ error: 'forbidden' });

    await funnelService.detachProductFromFunnel(id, productId);
    const updated = await funnelService.getFunnelById(id);
    return res.json({ funnel: updated });
  } catch (error: any) {
    console.error('❌ detachFunnelProduct error:', error);
    if (error?.code === 'P2025') return res.status(404).json({ error: 'link_not_found' });
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function getAttachableProductsHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const funnel = await funnelService.getFunnelById(id);
    if (!funnel) return res.status(404).json({ error: 'funnel_not_found' });
    if (!canManageFunnel(req, funnel.ownerId)) return res.status(403).json({ error: 'forbidden' });

    const products = await funnelService.getAttachableProductsForFunnel(id);
    return res.json({ products: products || [] });
  } catch (error) {
    console.error('❌ getAttachableProducts error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ========== DELETE FUNNEL ==========
export async function deleteFunnelHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await funnelService.deleteFunnel(id);
    res.status(204).send();
  } catch (error) {
    console.error('❌ deleteFunnel error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}

// ========== AI GENERATE FUNNEL ==========
export async function generateAIFunnelHandler(req: Request, res: Response) {
  try {
    const requesterId = req.user!.id;
    const requesterRole = req.user?.role;
    const requesterEmail = req.user?.email;
    const canOverrideOwner = requesterRole === 'ADMIN' || isSuperAdminEmail(requesterEmail);
    let ownerId = requesterId;

    const requestedOwnerId = req.body.ownerId as string | undefined;
    const ownerEmail = req.body.ownerEmail as string | undefined;
    if ((requestedOwnerId || ownerEmail) && !canOverrideOwner) {
      return res.status(403).json({ error: 'forbidden_owner_override' });
    }
    if (requestedOwnerId && canOverrideOwner) {
      const owner = await prisma.user.findUnique({ where: { id: requestedOwnerId }, select: { id: true } });
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

    const input: GenerateAIFunnelInput = {
      userPrompt: req.body.userPrompt,
      businessType: req.body.businessType,
      targetAudience: req.body.targetAudience,
    };

    if (!input.userPrompt) {
      return res.status(400).json({ error: 'user_prompt_required' });
    }

    const result = await funnelService.generateAndSaveFunnel(ownerId, input);

    res.status(201).json({
      funnel: result.funnel,
      aiResult: result.aiResult,
    });
  } catch (error) {
    console.error('❌ generateAIFunnel error:', error);
    res.status(500).json({ error: 'ai_generation_failed' });
  }
}
