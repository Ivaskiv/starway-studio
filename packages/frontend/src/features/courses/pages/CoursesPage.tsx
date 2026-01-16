// packages/frontend/src/features/courses/pages/CoursesPage.tsx

import { useGetMeQuery } from '@/features/auth/services/auth.api'
import { SubscriptionModal } from '@/templates/ai-mentor'
import { Badge, Button, GlassCard, Progress } from '@/ui'
import { motion } from 'framer-motion'
import {
  BookOpen,
  ChevronRight,
  Clock,
  Crown,
  Loader2,
  Lock,
  Play,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

// TODO: Замінити на реальний API
// import { useGetCoursesQuery } from '@/services/courses.api'

// Mock data - потім буде з API
const MOCK_COURSES = [
  {
    id: '1',
    title: 'Стан — ключ до успіху',
    description: 'Як керувати своїм емоційним станом та енергією',
    image: '/courses/state.jpg',
    duration: '4 тижні',
    lessons: 28,
    completedLessons: 12,
    status: 'active' as const,
    category: 'Особистий розвиток',
  },
  {
    id: '2',
    title: 'Система 21',
    description: 'Формування корисних звичок за 21 день',
    image: '/courses/system21.jpg',
    duration: '3 тижні',
    lessons: 21,
    completedLessons: 0,
    status: 'free' as const,
    freeAccessDays: 5,
    freeAccessEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Продуктивність',
  },
  {
    id: '3',
    title: 'Код змін',
    description: 'Глибинна трансформація мислення та поведінки',
    image: '/courses/changes.jpg',
    duration: '6 тижнів',
    lessons: 42,
    completedLessons: 0,
    status: 'locked' as const,
    category: 'Трансформація',
  },
]

type CourseStatus = 'active' | 'free' | 'locked'

interface Course {
  id: string
  title: string
  description: string
  image: string
  duration: string
  lessons: number
  completedLessons: number
  status: CourseStatus
  freeAccessDays?: number
  freeAccessEndsAt?: string
  category: string
}

interface CourseCardProps {
  course: Course
  onSubscribe: () => void
}

const CourseCard = ({ course, onSubscribe }: CourseCardProps) => {
  const isLocked = course.status === 'locked'
  const isFree = course.status === 'free'
  const progress = course.lessons > 0 ? (course.completedLessons / course.lessons) * 100 : 0

  const daysLeft = course.freeAccessEndsAt 
    ? Math.max(0, Math.ceil((new Date(course.freeAccessEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: isLocked ? 1 : 1.02 }}
      className={`relative ${isLocked ? 'opacity-60' : ''}`}
    >
      <GlassCard className="h-full overflow-hidden">
        {/* Image */}
        <div className="relative h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-white/20" />
          </div>
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            {course.status === 'active' && (
              <Badge className="bg-green-500 text-white">
                <Play className="w-3 h-3 mr-1" />
                Активний
              </Badge>
            )}
            {isFree && (
              <Badge className="bg-amber-500 text-white">
                <Clock className="w-3 h-3 mr-1" />
                {daysLeft} днів
              </Badge>
            )}
            {isLocked && (
              <Badge className="bg-slate-500 text-white">
                <Lock className="w-3 h-3 mr-1" />
                Закрито
              </Badge>
            )}
          </div>

          {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Lock className="w-12 h-12 text-white/60" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-xs text-purple-400 mb-1">{course.category}</p>
          <h3 className="text-lg font-semibold text-white mb-2">{course.title}</h3>
          <p className="text-sm text-white/60 mb-4 line-clamp-2">{course.description}</p>

          <div className="flex items-center gap-4 text-xs text-white/50 mb-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {course.duration}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {course.lessons} уроків
            </span>
          </div>

          {course.status === 'active' && progress > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>Прогрес</span>
                <span>{course.completedLessons}/{course.lessons}</span>
              </div>
              <Progress value={progress} color="green" size="sm" />
            </div>
          )}

          {isFree && (
            <div className="mb-4 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-400 text-xs text-center">
                ⏰ Безкоштовний доступ: {daysLeft} днів
              </p>
            </div>
          )}

          {isLocked ? (
            <Button onClick={onSubscribe} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <Crown className="w-4 h-4 mr-2" />
              Отримати доступ
            </Button>
          ) : (
            <Link to={`/dashboard/courses/${course.id}`}>
              <Button className="w-full bg-white/10 hover:bg-white/20 text-white">
                {course.status === 'active' ? 'Продовжити' : 'Почати'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </GlassCard>
    </motion.div>
  )
}

export default function CoursesPage() {
  const { data } = useGetMeQuery()
  const user = data?.user
  
  // const { data: coursesData, isLoading } = useGetCoursesQuery()
  const courses = MOCK_COURSES // Потім: coursesData?.courses || []
  const isLoading = false
  
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'locked'>('all')

  const filteredCourses = courses.filter(course => {
    if (filter === 'all') return true
    if (filter === 'active') return course.status === 'active' || course.status === 'free'
    if (filter === 'locked') return course.status === 'locked'
    return true
  })

  const activeCourses = courses.filter(c => c.status === 'active' || c.status === 'free')
  const lockedCourses = courses.filter(c => c.status === 'locked')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Мої курси</h1>
          <p className="text-white/60 mt-1">
            {activeCourses.length} активних • {lockedCourses.length} доступних
          </p>
        </div>

        {user?.subscription_status !== 'active' && (
          <Button
            onClick={() => setShowSubscriptionModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
          >
            <Crown className="w-4 h-4 mr-2" />
            Отримати повний доступ
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Всі', count: courses.length },
          { key: 'active', label: 'Активні', count: activeCourses.length },
          { key: 'locked', label: 'Доступні', count: lockedCourses.length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Courses Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onSubscribe={() => setShowSubscriptionModal(true)}
          />
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <GlassCard className="p-12 text-center">
          <Sparkles className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">Немає курсів в цій категорії</p>
        </GlassCard>
      )}

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  )
}