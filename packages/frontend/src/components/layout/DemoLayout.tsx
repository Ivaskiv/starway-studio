// /starway-studio/packages/frontend/src/components/demo/DemoLayout.tsx
// src/components/demo/DemoLayout.tsx
import { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'

interface DemoLayoutProps {
  children?: ReactNode
}

export default function DemoLayout({ children }: DemoLayoutProps) {
  
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="p-8">
        {children ?? <Outlet />}
      </div>
      <footer className="py-4 text-gray-400 text-center">Demo Mode — Starway</footer>
    </div>
  )
}