import { prisma } from '@/db/client.js';
import { Prisma } from '@/db/generated/prisma/client.js';

// ==========================================
// TYPES
// ==========================================

export interface MiniCourseInput {
  title: string;
  slug: string;
  description?: string;
  definition: Record<string, unknown>;
  isActive?: boolean;
  ownerId: string;
  expertId?: string | null;
  priceCents?: number;
  durationDays?: number;
}

export interface CourseWithProducts {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  definition: Prisma.JsonValue;
  isActive: boolean;
  priceCents: number;
  durationDays: number;
  createdAt: Date;
  updatedAt: Date;
  productCount?: number;
}

// ==========================================
// GET ALL COURSES
// ==========================================

export async function getAllCourses(activeOnly = true): Promise<CourseWithProducts[]> {
  const courses = await prisma.miniCourse.findMany({
    where: activeOnly ? { isActive: true, deletedAt: null } : { deletedAt: null },
    orderBy: { createdAt: 'desc' }
  });

  return courses.map(course => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    definition: course.definition,
    isActive: course.isActive,
    priceCents: course.priceCents,
    durationDays: course.durationDays,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt
  }));
}

// ==========================================
// GET COURSE BY ID
// ==========================================

export async function getCourseById(id: string): Promise<CourseWithProducts | null> {
  const course = await prisma.miniCourse.findUnique({
    where: { id }
  });

  if (!course || course.deletedAt) return null;

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    definition: course.definition,
    isActive: course.isActive,
    priceCents: course.priceCents,
    durationDays: course.durationDays,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt
  };
}

// ==========================================
// CREATE COURSE
// ==========================================

export async function createCourse(data: MiniCourseInput) {
  return prisma.miniCourse.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description ?? null,
      definition: data.definition as Prisma.InputJsonValue,
      isActive: data.isActive ?? true,
      ownerId: data.ownerId,
      expertId: data.expertId ?? null,
      priceCents: data.priceCents ?? 0,
      durationDays: data.durationDays ?? 30
    }
  });
}

// ==========================================
// UPDATE COURSE
// ==========================================

export async function updateCourse(id: string, data: Partial<MiniCourseInput>) {
  const updateData: Prisma.MiniCourseUpdateInput = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.definition !== undefined) updateData.definition = data.definition as Prisma.InputJsonValue;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.priceCents !== undefined) updateData.priceCents = data.priceCents;
  if (data.durationDays !== undefined) updateData.durationDays = data.durationDays;

  return prisma.miniCourse.update({
    where: { id },
    data: updateData
  });
}

// ==========================================
// DELETE COURSE (Soft Delete)
// ==========================================

export async function deleteCourse(id: string) {
  return prisma.miniCourse.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date()
    }
  });
}

// ==========================================
// TOGGLE COURSE STATUS
// ==========================================

export async function toggleCourseStatus(id: string, isActive: boolean) {
  return prisma.miniCourse.update({
    where: { id },
    data: { isActive }
  });
}

// ==========================================
// GENERATE PRODUCT FROM COURSE
// ==========================================

export async function generateProductFromCourse(
  courseId: string,
  ownerId: string
): Promise<string> {
  const course = await prisma.miniCourse.findUnique({
    where: { id: courseId }
  });

  if (!course) throw new Error('Course not found');

  const product = await prisma.product.create({
    data: {
      code: `course_${course.slug}_${Date.now()}`,
      ownerId,
      name: course.title,
      description: course.description ?? '',
      priceCents: course.priceCents,
      currency: 'EUR',
      durationDays: course.durationDays,
      features: {
        courseId: course.id,
        courseTitle: course.title,
        courseDefinition: course.definition
      },
      limits: {
        type: 'mini_course',
        duration: course.durationDays
      }
    }
  });

  return product.id;
}

// ==========================================
// ENROLLMENTS
// ==========================================

export async function getUserEnrollments(userId: string) {
  return prisma.courseEnrollment.findMany({
    where: { userId },
    include: { course: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function enrollInCourse(userId: string, courseId: string) {
  return prisma.courseEnrollment.upsert({
    where: {
      userId_courseId: { userId, courseId }
    },
    update: {},
    create: {
      userId,
      courseId
    }
  });
}

// ==========================================
// GET COURSE RECOMMENDATIONS
// ==========================================

export async function getCourseRecommendations(userId: string) {
  // TODO: Implement recommendation logic based on user behavior
  const allCourses = await getAllCourses(true);
  return allCourses.slice(0, 5); // Return top 5 for now
}