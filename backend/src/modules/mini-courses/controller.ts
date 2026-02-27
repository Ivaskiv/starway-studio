// backend/src/modules/mini-courses/controller.ts
/**
 * Mini-Courses Controller
 */

import {  Response, NextFunction } from 'express';
import {
  getCourseRecommendations,
  getAllCourses,
  getCourseById,
  enrollInCourse,
  getUserEnrollments
} from '@/modules/mini-courses/servise.js';
import { AuthenticatedRequest } from '@/types/globalTypes.js';

export async function getRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const recommendations = await getCourseRecommendations(userId);
    return res.status(200).json(recommendations);
  } catch (error: any) {
    console.error('[CoursesController] getRecommendations error:', error);
    next(error);
  }
}

export async function getCourses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const courses = await getAllCourses();
    return res.status(200).json(courses);
  } catch (error: any) {
    console.error('[CoursesController] getCourses error:', error);
    next(error);
  }
}

export async function getCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const course = await getCourseById(id);
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.status(200).json(course);
  } catch (error: any) {
    console.error('[CoursesController] getCourse error:', error);
    next(error);
  }
}

export async function enroll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId required' });
    }

    const enrollment = await enrollInCourse(userId, courseId);
    return res.status(200).json(enrollment);
  } catch (error: any) {
    console.error('[CoursesController] enroll error:', error);
    next(error);
  }
}

export async function getMyEnrollments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const enrollments = await getUserEnrollments(userId);
    return res.status(200).json(enrollments);
  } catch (error: any) {
    console.error('[CoursesController] getMyEnrollments error:', error);
    next(error);
  }
}