// src/App.tsx
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import Header from './components/layout/Header'
import Dashboard from './pages/admin/DashboardAdmin'
import ProductsList from './pages/products/List'
import ProductForm from './pages/products/ProductForm'
import ProductBuilder from './pages/admin/ProductBuilder'
import Analytics from './pages/admin/Analytics'
import Modules from './pages/admin/Modules'
import FunnelGenerator from './pages/admin/FunnelGenerator'
import BlueprintBuilder from './pages/admin/BlueprintBuilder'
import Home from './pages/Home'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Sidebar from './components/layout/Sidebar'
import Funnels from './pages/Builder'
import LiveAnalytics from './pages/admin/LiveAnalytics'
import ABTesting from './pages/admin/ABTesting'

// function ProtectedRoute({ children }: { children: React.ReactNode }) {
//   const { user } = useStore()
//   return user ? <>{children}</> : <Navigate to="/" replace />
// }

function App() {
  const { theme, sidebarOpen } = useStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="min-h-screen bg-black text-white">
      <BrowserRouter>
        <Routes>
          {/* Публічні сторінки */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Адмінка */}
          <Route
            path="/admin/*"
            element={
              // <ProtectedRoute>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar />
                  
                  <div className={`
                    flex-1 flex flex-col overflow-hidden
                    transition-all duration-300
                    ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}
                  `}>
                    <Header />
                    
                      <main className="flex-1 overflow-y-auto p-8 bg-gray-950">
                      <Routes>
                        <Route index element={<Dashboard />} />
                        <Route path="products" element={<ProductsList />} />
                        <Route path="products/new" element={<ProductForm />} />
                        <Route path="products/edit/:id" element={<ProductForm />} />
                        <Route path="funnels" element={<Funnels />} />
                        <Route path="funnels/generate" element={<FunnelGenerator />} />
                        <Route path="funnels/blueprint" element={<BlueprintBuilder />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="analytics/live" element={<LiveAnalytics />} />
                        <Route path="analytics/ab-testing" element={<ABTesting />} />
                        <Route path="modules" element={<Modules />} />
                        <Route path="practicums/new" element={<ProductBuilder />} />
                        <Route path="*" element={<Navigate to="/admin" replace />} />
                      </Routes>
                    </main>                  </div>
                </div>
              // </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App