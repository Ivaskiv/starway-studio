// packages/frontend/src/components/funnel/FunnelCard.tsx
import type { FunnelCardProps } from '@/features/funnels/types/funnel.types'
import { Button, Card, CardContent } from '@/ui'
import { Edit, MoreVertical, Pause, Play, Trash2, TrendingUp, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'


export default function FunnelCard({ funnel, onUpdate }: FunnelCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Ви впевнені що хочете видалити цю воронку?')) return

    const token = localStorage.getItem('starway_auth_token')
    await fetch(`/api/funnels/${funnel.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    onUpdate?.()
  }

  const handleToggleStatus = async () => {
    const newStatus = funnel.status === 'active' ? 'paused' : 'active'
    const token = localStorage.getItem('starway_auth_token')

    await fetch(`/api/funnels/${funnel.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    })

    onUpdate?.()
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    draft: 'bg-gray-100 text-gray-700',
    paused: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-red-100 text-red-700',
  }

  const statusLabels: Record<string, string> = {
    active: 'Активна',
    draft: 'Чернетка',
    paused: 'Призупинена',
    archived: 'Архівована',
  }

  return (
    <Card hover className="overflow-hidden">
      <CardContent className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {funnel.name}
            </h3>
            {funnel.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {funnel.description}
              </p>
            )}
          </div>

          <div className="relative">
            <Button size="sm" onClick={() => setShowMenu(v => !v)}>
              <MoreVertical className="w-5 h-5" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                <Button
                  onClick={() => {
                    setShowMenu(false)
                    handleToggleStatus()
                  }}
                  className="w-full justify-start"
                >
                  {funnel.status === 'active' ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Призупинити
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Активувати
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    setShowMenu(false)
                    handleDelete()
                  }}
                  className="w-full justify-start text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Видалити
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[funnel.status]}`}>
            {statusLabels[funnel.status]}
          </span>
          <span className="text-xs text-gray-500">
            {funnel.steps?.length || 0} кроків
          </span>
        </div>
      </CardContent>

      <CardContent className="grid grid-cols-2 gap-4 p-4 bg-gray-50">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Користувачі</p>
            <p className="font-semibold text-gray-900">
              {funnel.analytics?.uniqueVisitors || 0}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Конверсія</p>
            <p className="font-semibold text-gray-900">
              {funnel.analytics?.conversions || 0}
            </p>
          </div>
        </div>
      </CardContent>

      <CardContent className="p-4 border-t">
        <Link to={`/dashboard/funnels/${funnel.id}/edit`}>
          <Button className="w-full">
            <Edit className="w-4 h-4 mr-2" />
            Редагувати
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
