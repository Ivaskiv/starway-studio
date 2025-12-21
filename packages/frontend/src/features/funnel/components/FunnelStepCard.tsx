/** src/features/funnel/components/FunnelStepCard.tsx */

// src/features/funnel/components/FunnelStepCard.tsx
import { Button, Input, Textarea } from '@/components/ui'
import { FunnelStep } from '@starway/shared'
import { Trash2, Edit3, Save, Zap } from 'lucide-react'

type Props = {
  step: FunnelStep
  isEditing?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onUpdate?: (id: string, field: keyof FunnelStep, value: string) => void
  onAIGenerate?: (stepId?: string) => void
}

export default function FunnelStepCard({
  step,
  isEditing,
  onEdit,
  onDelete,
  onUpdate,
  onAIGenerate
}: Props) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-5 relative">
      {step.isCustom && (
        <span className="absolute top-2 right-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
          Мій
        </span>
      )}

      {isEditing ? (
        <div className="space-y-3">
          <Input
            value={step.title}
            onChange={e => onUpdate?.(step.id as string, 'title', e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm"
          />
          <Textarea
            value={step.description}
            onChange={e => onUpdate?.(step.id as string, 'description', e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm"
          />
          <Button
            onClick={onEdit}
            className="flex items-center gap-2 text-green-400 text-sm"
          >
            <Save size={16} /> Зберегти
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-xs text-gray-400">
                {step.stage}
              </div>
              <h3 className="font-semibold text-white">
                {step.title}
              </h3>
            </div>

            <div className="flex gap-2">
              {onEdit && (
                <Button onClick={onEdit} className="text-blue-400">
                  <Edit3 size={16} />
                </Button>
              )}
              {onDelete && (
                <Button onClick={onDelete} className="text-red-400">
                  <Trash2 size={16} />
                </Button>
              )}
              {onAIGenerate && (
                <Button
                  onClick={() => onAIGenerate(step.id)}
                  className="text-yellow-400"
                >
                  <Zap size={16} /> AI
                </Button>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-400">
            {step.description}
          </p>
        </>
      )}
    </div>
  )
}
