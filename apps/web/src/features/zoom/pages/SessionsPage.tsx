// frontend/src/features/zoom/SessionsPage.tsx
// Сторінка /dashboard/sessions — рендериться коли юзер натискає "Сесії" в сайдбарі
// Підключається в AppRoutes через lazy import

import CalendarToolbar from "@/features/zoom/components/calendar/CalendarToolbar";


export default function SessionsPage() {
  return <CalendarToolbar />;
}