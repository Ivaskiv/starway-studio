import { api } from '@/services/api';
import type { CourseProduct } from '../types/courses.types';

export const coursesApi = api.injectEndpoints({
  endpoints: builder => ({
    getCourses: builder.query<CourseProduct[], void>({
      query: () => '/courses',
      providesTags: ['Courses'],
    }),
  }),
});

export const { useGetCoursesQuery } = coursesApi;
