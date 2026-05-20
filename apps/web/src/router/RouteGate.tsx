import { runtimeConfig } from '@/config/runtime'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

type RouteGateProps = {
  children: ReactNode
}

function isAllowedPath(pathname: string): boolean {
  if (pathname === '/') {
    return true
  }

  return runtimeConfig.allowedPrefixes.some((prefix) => {
    if (prefix === '/') {
      return false
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  })
}

export default function RouteGate({ children }: RouteGateProps) {
  const location = useLocation()

  if (runtimeConfig.isDev) {
    return <>{children}</>
  }

  if (!isAllowedPath(location.pathname)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
