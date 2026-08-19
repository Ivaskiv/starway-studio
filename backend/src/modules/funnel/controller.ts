// backend/src/modules/funnel/controller.ts

import type { Response } from 'express';
import { prisma } from '../../db/client.js';
import * as funnelService from './index.js';
import { canOverrideFunnelOwner } from './policy.js';
import type { AuthenticatedRequest, FunnelInput } from '../../types/globalTypes.js';


// ────────────────────────────────────────────────
// CREATE FUNNEL
// ────────────────────────────────────────────────
export async function createFunnelHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    // 1️⃣ Без user далі рухатись не можна
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const auth = req.user;

    // За замовчуванням funnel створюється для себе
    let ownerId = auth.id;

    const { ownerId: bodyOwnerId, ownerEmail, name, status } = req.body;

    // 2️⃣ Якщо намагаються створити funnel для іншого —
    // перевіряємо чи має юзер на це право
    const wantsOverride = bodyOwnerId || ownerEmail;

    if (wantsOverride && !canOverrideFunnelOwner(auth)) {
      return res.status(403).json({ error: 'forbidden_owner_override' });
    }

    // 3️⃣ Якщо передали ownerId — перевіряємо чи існує такий user
    if (bodyOwnerId) {
      const owner = await prisma.user.findUnique({
        where: { id: bodyOwnerId },
        select: { id: true },
      });

      if (!owner) {
        return res.status(404).json({ error: 'owner_not_found' });
      }

      ownerId = owner.id;
    }

    // 4️⃣ Якщо передали ownerEmail — шукаємо user по email
    if (ownerEmail) {
      const owner = await prisma.user.findUnique({
        where: { email: ownerEmail },
        select: { id: true },
      });

      if (!owner) {
        return res.status(404).json({ error: 'owner_not_found' });
      }

      ownerId = owner.id;
    }

    // ⚠ Якщо передані і ownerId і ownerEmail —
    // email має пріоритет (можна змінити логіку якщо потрібно)

    // 5️⃣ Базова валідація
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name_required' });
    }

    const input: FunnelInput = {
      name: name.trim(),
      status: status ?? 'draft',
    };

    const funnel = await funnelService.createFunnel(ownerId, input);

    // Якщо створили не для себе — логнемо
    if (auth.id !== ownerId) {
      console.log(
        `[AUDIT] ${auth.role} ${auth.id} created funnel for ${ownerId}`,
      );
    }

    return res.status(201).json({ funnel });

  } catch (error) {
    console.error('[createFunnelHandler]', error);
    return res.status(500).json({ error: 'server_error' });
  }
}


// ────────────────────────────────────────────────
// CREATE CUSTOM WORKFLOW
// ────────────────────────────────────────────────
export async function createCustomWorkflow(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { funnelName, stages } = req.body;

    // Валідація: stages обовʼязково масив
    if (!funnelName || !Array.isArray(stages)) {
      return res.status(400).json({
        error: 'invalid_input',
        message: 'funnelName and stages array required',
      });
    }

    const result = await funnelService.createFullWorkflow({
      funnelName: funnelName.trim(),
      ownerId: req.user.id,
      expertId: req.user.expertId ?? null,
      stages,
    });

    return res.json(result);

  } catch (error) {
    console.error('[createCustomWorkflow]', error);
    return res.status(500).json({ error: 'server_error' });
  }
}


// ────────────────────────────────────────────────
// CREATE WORKFLOW FROM ALL COURSES
// ────────────────────────────────────────────────
export async function createWorkflowFromCourses(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { funnelName } = req.body;

    if (!funnelName || typeof funnelName !== 'string') {
      return res.status(400).json({
        error: 'invalid_input',
        message: 'funnelName required',
      });
    }

    const result = await funnelService.createWorkflowFromAllCourses(
      funnelName.trim(),
      req.user.id,
      req.user.expertId ?? null,
    );

    return res.json(result);

  } catch (error: any) {
    console.error('[createWorkflowFromCourses]', error);

    if (error.message === 'No active courses available') {
      return res.status(400).json({ error: 'no_active_courses' });
    }

    return res.status(500).json({ error: 'server_error' });
  }
}


// ────────────────────────────────────────────────
// ONE-CLICK CREATE FUNNEL
// ────────────────────────────────────────────────
export async function oneClickCreateFunnel(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const result = await funnelService.createQuickFunnel(
      req.user.id,
      req.user.expertId ?? null,
    );

    return res.json({
      success: true,
      message: 'Funnel created successfully',
      ...result,
    });

  } catch (error) {
    console.error('[oneClickCreateFunnel]', error);
    return res.status(500).json({ error: 'server_error' });
  }
}