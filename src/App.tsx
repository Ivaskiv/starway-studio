// src/App.tsx 
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import Sidebar from './components/sidebar/Sidebar'
import Dashboard from './pages/admin/DashboardAdmin'
import ProductsList from './pages/products/List'
import ProductForm from './pages/products/ProductForm'
import Funnels from './pages/funnels/Builder'
// import Auth from './components/auth/Auth'
import Home from './pages/home/Home'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  const { theme } = useStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <BrowserRouter>
        <Routes>
          {/* Публічні */}
          <Route path="/" element={<Home />} />
          {/* <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} /> */}

          {/* Адмінка — тільки для залогінених */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <div className="flex">
                  <Sidebar />
                  <main className="flex-1 ml-64 p-8">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/products" element={<ProductsList />} />
                      <Route path="/products/new" element={<ProductForm />} />
                      <Route path="/products/edit/:id" element={<ProductForm />} />
                      <Route path="/funnels" element={<Funnels />} />
                      <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App