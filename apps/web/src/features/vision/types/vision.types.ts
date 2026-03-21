// frontend/src/features/vision/types/vision.types.ts
/**
 * Vision Types
 */

export interface VisionAnswers {
  idealLife: string;
  noLongerNormal: string;
  pointB: string;
}

export interface VisionStatement {
  id: string;
  userId: string;
  statement: string;
  idealLife: string;
  noLongerNormal: string;
  pointB: string;
  createdAt: string;
}