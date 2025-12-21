// src/App.tsx
import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import Home from './pages/Home'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import { useAppSelector } from './store/hooks'
import DemoLayout from './components/demo/DemoLayout'

const Dashboard = lazy(() => import('./pages/admin/DashboardAdmin'))
const ProductsList = lazy(() => import('./pages/products/List'))
const ProductForm = lazy(() => import('./pages/products/ProductForm'))
const Funnels = lazy(() => import('./pages/Builder'))
const FunnelGenerator = lazy(() => import('./pages/admin/FunnelGenerator'))
const BlueprintBuilder = lazy(() => import('./pages/admin/BlueprintBuilder'))
const Analytics = lazy(() => import('./pages/admin/Analytics'))
const LiveAnalytics = lazy(() => import('./pages/admin/LiveAnalytics'))
const ABTesting = lazy(() => import('./pages/admin/ABTesting'))
const Modules = lazy(() => import('./pages/admin/Modules'))

const Step1DemoRegister = lazy(() => import('./pages/demo/steps/Step1DemoRegister'))
const Step2DemoLogin = lazy(() => import('./pages/demo/steps/Step2DemoLogin'))
const Step3DemoDashboard = lazy(() => import('./pages/demo/steps/Step3DemoDashboard'))

function App() {
const theme = useAppSelector(state => state.ui.theme)
const sidebarOpen = useAppSelector(state => state.ui.sidebarOpen)
const user = useAppSelector(state => state.auth.user)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  //   return user ? children : <Navigate to="/" replace />
  // }

  return (
    <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
      <BrowserRouter>
        <Routes>
          {/* Публічні сторінки */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* DEMO */}
          <Route path="/demo/*" element={<DemoLayout />}>
            <Route path="step1-register" element={<Step1DemoRegister />} />
            <Route path="step2-login" element={<Step2DemoLogin />} />
            <Route path="step3-dashboard" element={<Step3DemoDashboard />} />
            <Route path="*" element={<Navigate to="step1-register" replace />} />
          </Route>          {/* Адмінка */}
          <Route
            path="/admin/*"
            element={
              // <ProtectedRoute>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar />
                  <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
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
                        <Route path="*" element={<Navigate to="/admin" replace />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              // {/* </ProtectedRoute> */}
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
  )
}

export default App
