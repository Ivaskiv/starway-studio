// // starway-studio/packages/frontend/src/pages/demo/steps/Step2DemoLogin.tsx

// import { Button, Input } from '@/components/ui'
// import { useNavigate } from 'react-router-dom'
// import { useAppDispatch } from '@/store/hooks'
// import { loginDemo } from '@/features/auth/authSlice'
// import { useState } from 'react'
// import { Eye, EyeOff } from 'lucide-react'

// export default function Step2DemoLogin() {
//   const navigate = useNavigate()
//   const dispatch = useAppDispatch()
//   const demoUser = JSON.parse(localStorage.getItem('demoUser')!)
//   const [showPassword, setShowPassword] = useState(false)

//   const handleLogin = () => {
//     dispatch(loginDemo()) 
//     navigate('/demo/step3-dashboard')
//   }

//   if (!demoUser) return null

//   return (
//     <div className="min-h-screen bg-gray-900 text-white flex flex-col">
//       <header className="flex justify-between p-8 max-w-4xl w-full mx-auto">
//         <h1 className="text-2xl font-bold">Dashboard Demo — Nova AI</h1>
//         <Button variant="ghost" onClick={() => navigate('/')}>Вийти</Button>
//       </header>

//       <div className="flex-1 flex items-center justify-center px-8 py-12">
//         <div className="w-full max-w-md">
//           <h1 className="text-3xl font-bold mb-6">Demo Login</h1>
//           <p className="text-gray-400 mb-6">
//             🔐 Увійдіть використовуючи дані адміністратора
//           </p>
          
//           <Input label="Email" value={demoUser.email} readOnly className="mb-4"/>
          
//           <div className="relative mb-6">
//             <Input
//               label="Пароль"
//               value={demoUser.password}
//               type={showPassword ? 'text' : 'password'}
//               readOnly
//               className="pr-10"
//             />
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               className="absolute right-3 top-[38px] text-gray-400 hover:text-white transition-colors"
//             >
//               {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//             </button>
//           </div>

//           <Button variant="primary" className="w-full" onClick={handleLogin}>
//             Увійти
//           </Button>
//         </div>
//       </div>
//     </div>
//   )
// }