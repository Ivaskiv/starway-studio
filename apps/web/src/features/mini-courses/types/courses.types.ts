export type CourseTag = 'free' | 'trial' | 'paid';

export interface CourseProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: number | null;
  tag: CourseTag;
  icon: string;
  path: string | null;
  cta?: string;
  ctaLink?: string;
}
