import { Navigate } from 'react-router-dom'

import { ROUTES } from '@/config/routes'

export default function FunnelEditorPage() {
  return <Navigate to={ROUTES.PRODUCTS} replace />
}
