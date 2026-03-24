import { Navigate } from 'react-router-dom'

import { ROUTES } from '@/config/routes'

export default function AIProducerAssistantPage() {
  return <Navigate to={ROUTES.PRODUCTS} replace />
}
