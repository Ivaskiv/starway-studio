// frontend/src/features/zoom/SessionsPage.tsx
// Сторінка /dashboard/sessions — рендериться коли юзер натискає "Сесії" в сайдбарі
// Підключається в AppRoutes через lazy import

import ZoomSchedule from "@/features/zoom/components/ZoomSchedule";


export default function SessionsPage() {
  return <ZoomSchedule />;
}