// packages/frontend/src/features/courses/pages/CoursesPage.tsx

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Lock, 
  Play, 
  Clock, 
  Star,
  Crown,
  ChevronRight,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import { useGetMeQuery } from '@/features/auth/services/auth.api'
import { GlassCard, Button, Badge, Progress } from '@/ui'
import { SubscriptionModal } from '@/features/modals/SubscriptionModal'

// Типи
interface Course {
  id: string
  title: string
  description: string
  image: string
  duration: string
  lessons: number
  completedLessons: number
  status: 'active' | 'free' | 'locked'
  freeAccessDays?: number
  freeAccessEndsAt?: string
  category: string
}

// Mock data
const COURSES: Course[] = [
  {
    id: '1',
    title: 'Стан — ключ до успіху',
    description: 'Як керувати своїм емоційним станом та енергією',
    image: '/courses/state.jpg',
    duration: '4 тижні',
    lessons: 28,
    completedLessons: 12,
    status: 'active',
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
    status: 'free',
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
    status: 'locked',
    category: 'Трансформація',
  },
  {
    id: '4',
    title: 'Марафон Страхи',
    description: 'Подолай свої страхи та обмеження',
    image: '/courses/fears.jpg',
    duration: '2 тижні',
    lessons: 14,
    completedLessons: 0,
    status: 'locked',
    category: 'Психологія',
  },
  {
    id: '5',
    title: 'Сила свідомості',
    description: 'Розкрий потенціал свого розуму',
    image: '/courses/mind.jpg',
    duration: '5 тижнів',
    lessons: 35,
    completedLessons: 0,
    status: 'locked',
    category: 'Свідомість',
  },
]

// Компонент картки курсу
interface CourseCardProps {
  course: Course
  onOpen: () => void
  onSubscribe: () => void
}

const CourseCard = ({ course, onOpen, onSubscribe }: CourseCardProps) => {
  const isLocked = course.status === 'locked'
  const isFree = course.status === 'free'
  const progress = course.lessons > 0 ? (course.completedLessons / course.lessons) * 100 : 0

  // Розрахунок днів до закінчення free доступу
  const daysLeft = course.freeAccessEndsAt 
    ? Math.max(0, Math.ceil((new Date(course.freeAccessEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: isLocked ? 1 : 1.02 }}
      className={`relative rounded-2xl overflow-hidden transition-all ${
        isLocked ? 'opacity-50 grayscale' : ''
      }`}
    >
      <GlassCard className="h-full">
        {/* Image */}
        <div className="relative h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-white/20" />
          </div>
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            {course.status === 'active' && (
              <Badge className="bg-green-500/90 text-white">
                <Play className="w-3 h-3 mr-1" />
                Активний
              </Badge>
            )}
            {isFree && (
              <Badge className="bg-amber-500/90 text-white">
                <Clock className="w-3 h-3 mr-1" />
                {daysLeft} днів
              </Badge>
            )}
            {isLocked && (
              <Badge className="bg-slate-500/90 text-white">
                <Lock className="w-3 h-3 mr-1" />
                Закрито
              </Badge>
            )}
          </div>

          {/* Lock overlay */}
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

          {/* Meta */}
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

          {/* Progress for active courses */}
          {course.status === 'active' && progress > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>Прогрес</span>
                <span>{course.completedLessons}/{course.lessons}</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Free access timer */}
          {isFree && (
            <div className="mb-4 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-400 text-xs text-center">
                ⏰ Безкоштовний доступ: {daysLeft} днів
              </p>
            </div>
          )}

          {/* Action button */}
          {isLocked ? (
            <Button
              onClick={onSubscribe}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Отримати доступ
            </Button>
          ) : (
            <Button
              onClick={onOpen}
              className="w-full bg-white/10 hover:bg-white/20 text-white"
            >
              {course.status === 'active' ? 'Продовжити' : 'Почати'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  )
}

export default function CoursesPage() {
  const { data } = useGetMeQuery()
  const user = data?.user
  
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'locked'>('all')

  const filteredCourses = COURSES.filter(course => {
    if (filter === 'all') return true
    if (filter === 'active') return course.status === 'active' || course.status === 'free'
    if (filter === 'locked') return course.status === 'locked'
    return true
  })

  const activeCourses = COURSES.filter(c => c.status === 'active' || c.status === 'free')
  const lockedCourses = COURSES.filter(c => c.status === 'locked')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Мої курси</h1>
          <p className="text-white/60 mt-1">
            {activeCourses.length} активних • {lockedCourses.length} доступних для підписки
          </p>
        </div>

        {/* Premium CTA */}
        {user?.subscriptionStatus !== 'active' && (
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
          { key: 'all', label: 'Всі', count: COURSES.length },
          { key: 'active', label: 'Активні', count: activeCourses.length },
          { key: 'locked', label: 'Доступні', count: lockedCourses.length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {f.label}
            <span className="ml-1 opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Courses Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onOpen={() => console.log('Open course:', course.id)}
            onSubscribe={() => setShowSubscriptionModal(true)}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredCourses.length === 0 && (
        <GlassCard className="p-12 text-center">
          <Sparkles className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">Немає курсів в цій категорії</p>
        </GlassCard>
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  )
}