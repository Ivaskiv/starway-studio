// backend/src/modules/mini-courses/servise.ts
import { prisma } from '@/db/client.js';
import { CourseType, Course, CourseRecommendation, CourseEnrollment } from './types.js';

const COURSES: Course[] = [/* ...твої курси */];

export async function getAllCourses(): Promise<Course[]> {
  return COURSES;
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  return COURSES.find(c => c.id === courseId) || null;
}

export async function getCourseRecommendations(userId: string): Promise<CourseRecommendation[]> {
  // ...твій код, як зараз
}

export async function enrollInCourse(userId: string, courseId: string): Promise<CourseEnrollment> {
  const enrollment = await prisma.courseEnrollment.create({
    data: {
      userId,
      courseId,
      purchasedAt: new Date(),
      createdAt: new Date(),
    },
  });

  return enrollment;
}

export async function getUserEnrollments(userId: string): Promise<CourseEnrollment[]> {
  return prisma.courseEnrollment.findMany({
    where: { userId },
    orderBy: { purchasedAt: 'desc' },
  });
}
