// // packages/frontend/src/pages/funnel/FunnelCreatePage.tsx
// packages/frontend/src/pages/funnel/FunnelCreatePage.tsx

export default function FunnelCreatePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-4xl font-bold">Створити воронку</h1>
      <p className="text-gray-400 mt-4">Це сторінка створення воронки</p>
    </div>
  )
}
// import { useState } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { useForm } from 'react-hook-form'
// import { z } from 'zod'
// import { ArrowLeft, Sparkles } from 'lucide-react'
// import { Button, Card, CardContent, Input, Textarea } from '@starway-studio/shared'
// import { Label } from '@frontend/components/ui'

// const createFunnelSchema = z.object({
//   name: z.string().min(3, 'Назва має містити мінімум 3 символи'),
//   slug: z
//     .string()
//     .min(3, 'Slug має містити мінімум 3 символи')
//     .regex(/^[a-z0-9-]+$/, 'Тільки малі літери, цифри та дефіс'),
//   description: z.string().optional(),
// })

// type CreateFunnelData = z.infer<typeof createFunnelSchema>

// export default function FunnelCreatePage() {
//   const navigate = useNavigate()
//   const [serverError, setServerError] = useState('')

//   const {
//     register,
//     handleSubmit,
//     formState: { errors, isSubmitting },
//     setError,
//   } = useForm<CreateFunnelData>()

//   const onSubmit = async (data: CreateFunnelData) => {
//     try {
//       setServerError('')
      
//       // Валідація через Zod
//       const result = createFunnelSchema.safeParse(data)
      
//       if (!result.success) {
//         result.error.errors.forEach((err) => {
//           setError(err.path[0] as keyof CreateFunnelData, {
//             message: err.message,
//           })
//         })
//         return
//       }

//       // TODO: API call to create funnel
//       console.log('Creating funnel:', result.data)
//       navigate('/dashboard/funnels')
//     } catch (error) {
//       setServerError('Помилка при створенні воронки')
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
//       <div className="container mx-auto px-4 py-8">
//         <Button
//           variant="ghost"
//           onClick={() => navigate('/dashboard/funnels')}
//           className="mb-6"
//         >
//           <ArrowLeft className="mr-2 h-4 w-4" />
//           Назад до списку
//         </Button>

//         <Card className="max-w-2xl mx-auto">
//           <CardContent className="pt-6">
//             <div className="flex items-center gap-3 mb-6">
//               <Sparkles className="h-8 w-8 text-purple-600" />
//               <h1 className="text-3xl font-bold">Створити нову воронку</h1>
//             </div>

//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
//               <div>
//                 <Label htmlFor="name">Назва воронки</Label>
//                 <Input
//                   id="name"
//                   {...register('name')}
//                   placeholder="Моя перша воронка"
//                 />
//                 {errors.name && (
//                   <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
//                 )}
//               </div>

//               <div>
//                 <Label htmlFor="slug">Slug (URL)</Label>
//                 <Input
//                   id="slug"
//                   {...register('slug')}
//                   placeholder="moya-persha-voronka"
//                 />
//                 {errors.slug && (
//                   <p className="text-sm text-red-600 mt-1">{errors.slug.message}</p>
//                 )}
//               </div>

//               <div>
//                 <Label htmlFor="description">Опис (опціонально)</Label>
//                 <Textarea
//                   id="description"
//                   {...register('description')}
//                   placeholder="Опишіть вашу воронку..."
//                   rows={4}
//                 />
//               </div>

//               {serverError && (
//                 <p className="text-sm text-red-600">{serverError}</p>
//               )}

//               <Button type="submit" disabled={isSubmitting} className="w-full">
//                 {isSubmitting ? 'Створення...' : 'Створити воронку'}
//               </Button>
//             </form>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   )
// }