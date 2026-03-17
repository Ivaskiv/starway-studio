// backend/src/modules/funnel/service.ts
import { prisma } from '../../db/client.js';
import type { FunnelBlueprint } from '../../modules/ai-generator/types.js';
import { CourseWithProducts, generateProductFromCourse, getAllCourses } from '../../modules/mini-courses/servise.js';
import { FunnelWithStagesAndProducts } from '../../types/globalTypes.js';

// ────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = `funnel_${Math.random().toString(36).slice(2, 8)}`;
    const exists = await prisma.funnel.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  return `funnel_${Date.now().toString(36)}`;
}

// ────────────────────────────────────────────────
// CREATE FUNNEL FROM BLUEPRINT
// ────────────────────────────────────────────────
export async function createFunnelFromBlueprint(
  ownerId: string,
  blueprint: FunnelBlueprint
): Promise<string> {
  const code = await generateUniqueCode();
  const slug = generateSlug(blueprint.name);

  const funnel = await prisma.funnel.create({
    data: {
      ownerId,
      code,
      slug,
      name: blueprint.name,
      status: 'draft',
      definition: {},
    },
  });

  return funnel.id;
}

// ────────────────────────────────────────────────
// GET FUNNELS
// ────────────────────────────────────────────────
export async function getFunnels(ownerId?: string): Promise<Array<FunnelWithStagesAndProducts>> {
  const funnels = await prisma.funnel.findMany({
    where: ownerId ? { ownerId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { products: { include: { product: true } }, stages: true },
  });

  return funnels.map((funnel) => ({
    ...funnel,
    products: funnel.products.map((fp) => fp.product), // TS сам виводить Product
  }));
}

export async function getFunnelById(
  id: string,
  ownerId?: string
): Promise<FunnelWithStagesAndProducts | null> {
  const funnel = await prisma.funnel.findUnique({
    where: { id },
    include: { products: { include: { product: true } }, stages: true },
  });

  if (!funnel) return null;
  if (ownerId && funnel.ownerId !== ownerId) return null;

  return {
    ...funnel,
    products: funnel.products.map((fp) => fp.product), // без as
  };
}

// ────────────────────────────────────────────────
// CREATE FUNNEL
// ────────────────────────────────────────────────
export async function createFunnel(
  ownerId: string,
  input: { name: string; status?: string }
) {
  const code = await generateUniqueCode();
  const slug = generateSlug(input.name);

  const funnel = await prisma.funnel.create({
    data: {
      ownerId,
      code,
      slug,
      name: input.name,
      status: input.status || 'draft',
      definition: {},
    },
  });

  return getFunnelById(funnel.id);
}

// ────────────────────────────────────────────────
// UPDATE FUNNEL
// ────────────────────────────────────────────────
export async function updateFunnel(
  id: string,
  input: { name?: string; status?: string },
  ownerId?: string
) {
  if (ownerId) {
    const existing = await prisma.funnel.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== ownerId) {
      throw new Error('funnel_not_found');
    }
  }

  return prisma.funnel.update({
    where: { id },
    data: {
      name: input.name,
      status: input.status,
    },
  });
}

// ────────────────────────────────────────────────
// ATTACH PRODUCT TO FUNNEL
// ────────────────────────────────────────────────
export async function attachProductToFunnel(
  funnelId: string,
  productId: string
) {
  const existing = await prisma.funnelProduct.findUnique({
    where: {
      funnelId_productId: { funnelId, productId },
    },
  });

  if (existing) return existing;

  return prisma.funnelProduct.create({
    data: {
      funnelId,
      productId,
    },
  });
}

// ────────────────────────────────────────────────
// DETACH PRODUCT FROM FUNNEL
// ────────────────────────────────────────────────
export async function detachProductFromFunnel(
  funnelId: string,
  productId: string
) {
  return prisma.funnelProduct.delete({
    where: {
      funnelId_productId: { funnelId, productId },
    },
  });
}

// ────────────────────────────────────────────────
// GET ATTACHABLE PRODUCTS
// ────────────────────────────────────────────────
export async function getAttachableProductsForFunnel(funnelId: string) {
  const funnel = await prisma.funnel.findUnique({
    where: { id: funnelId },
    select: { ownerId: true },
  });

  if (!funnel) return null;

  const attached = await prisma.funnelProduct.findMany({
    where: { funnelId },
    select: { productId: true },
  });

  const attachedIds = attached.map(item => item.productId);

  return prisma.product.findMany({
    where: {
      ownerId: funnel.ownerId,
      ...(attachedIds.length ? { id: { notIn: attachedIds } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ────────────────────────────────────────────────
// DELETE FUNNEL
// ────────────────────────────────────────────────
export async function deleteFunnel(id: string, ownerId?: string) {
  if (ownerId) {
    const existing = await prisma.funnel.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== ownerId) {
      throw new Error('funnel_not_found');
    }
  }

  await prisma.funnel.delete({
    where: { id },
  });
}

// ────────────────────────────────────────────────
// GENERATE AND SAVE FUNNEL (AI)
// ────────────────────────────────────────────────
export async function generateAndSaveFunnel(
  ownerId: string,
  input: { concept: string; targetAudience: string }
) {
  // TODO: Implement AI generation
  throw new Error('AI funnel generation not yet implemented');
}

// ────────────────────────────────────────────────
// WORKFLOW FUNCTIONS (переміщено з workflow.service.ts)
// ────────────────────────────────────────────────
export interface WorkflowInput {
  funnelName: string;
  ownerId: string;
  expertId?: string | null;
  stages: Array<{
    name: string;
    order: number;
    courseIds: string[];
  }>;
}

export interface WorkflowResult {
  funnelId: string;
  stagesCreated: number;
  productsCreated: number;
  stages: Array<{
    stageId: string;
    stageName: string;
    products: string[];
  }>;
}

export async function createFullWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  return prisma.$transaction(async (tx) => {
    const funnel = await tx.funnel.create({
      data: {
        ownerId: input.ownerId,
        expertId: input.expertId ?? null,
        code: `funnel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        slug: input.funnelName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50),
        name: input.funnelName,
        status: 'draft',
        definition: {},
      },
    });

    const stagesResult: Array<{
      stageId: string;
      stageName: string;
      products: string[];
    }> = [];

    let totalProductsCreated = 0;

    for (const stageInput of input.stages) {
      const productIds: string[] = [];

      for (const courseId of stageInput.courseIds) {
        const productId = await generateProductFromCourse(courseId, input.ownerId);
        productIds.push(productId);
        totalProductsCreated++;
      }

      for (const productId of productIds) {
        await tx.funnelProduct.create({
          data: {
            funnelId: funnel.id,
            productId,
          },
        });
      }

      stagesResult.push({
        stageId: `stage_${stageInput.order}`,
        stageName: stageInput.name,
        products: productIds,
      });
    }

    return {
      funnelId: funnel.id,
      stagesCreated: input.stages.length,
      productsCreated: totalProductsCreated,
      stages: stagesResult,
    };
  });
}

// ────────────────────────────────────────────────
// CREATE WORKFLOW FROM ALL COURSES
// ────────────────────────────────────────────────
export async function createWorkflowFromAllCourses(
  funnelName: string,
  ownerId: string,
  expertId?: string | null
): Promise<WorkflowResult> {
  const courses: CourseWithProducts[] = await getAllCourses(true);

  if (courses.length === 0) {
    throw new Error('No active courses available');
  }

  const coursesPerStage = 5;
  const stages: WorkflowInput['stages'] = [];

  for (let i = 0; i < courses.length; i += coursesPerStage) {
    const stageCourses = courses.slice(i, i + coursesPerStage); // типізовано CourseWithProducts[]
    stages.push({
      name: `Stage ${Math.floor(i / coursesPerStage) + 1}`,
      order: Math.floor(i / coursesPerStage) + 1,
      courseIds: stageCourses.map((course) => course.id), // чисто, без any
    });
  }

  return createFullWorkflow({
    funnelName,
    ownerId,
    expertId,
    stages,
  });
}

export async function createQuickFunnel(
  ownerId: string,
  expertId?: string | null
): Promise<WorkflowResult> {
  return createWorkflowFromAllCourses(
    `Auto Funnel ${new Date().toISOString().split('T')[0]}`,
    ownerId,
    expertId
  );
}