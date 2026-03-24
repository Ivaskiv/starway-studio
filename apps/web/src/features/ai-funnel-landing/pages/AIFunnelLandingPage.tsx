import { Navigate } from 'react-router-dom'

import { ROUTES } from '@/config/routes'

export default function AIFunnelLandingPage() {
  return <Navigate to={ROUTES.HOME} replace />
}
