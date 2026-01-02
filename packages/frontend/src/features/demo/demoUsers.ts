// src/features/demo/demoUsers.ts

export const DEMO_ADMIN = {
  id: 'admin123',
  name: 'Admin',
  email: 'admin@starway.test',
  password: 'admin123',
  role: 'admin' as const
}

export const DEMO_STUDENT = {
  id: 'demo123',
  name: 'Demo Student',
  email: 'demo@starway.test',
  password: 'demo123',
  role: 'student' as const
}

export const DEMO_MENTOR = {
  id: 'mentor123',
  name: 'Mentor AI',
  email: 'mentor@starway.test',
  password: 'mentor123',
  role: 'mentor' as const
}
