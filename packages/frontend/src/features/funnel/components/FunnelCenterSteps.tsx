// src/features/funnel/components/FunnelCenterSteps.tsx
import FunnelStepCard from './FunnelStepCard'

type Props = {
  steps: FunnelStep[]
  editingStepId?: string | null
  onEdit?: (id: string | null) => void
  onDelete?: (id: string) => void
  onUpdateStep?: (
    id: string,
    field: keyof FunnelStep,
    value: string
  ) => void
  onAIGenerate?: (stepId?: string) => void
}


export default function FunnelCenterSteps({
  steps,
  editingStepId,
  onEdit,
  onDelete,
  onUpdateStep,
  onAIGenerate   
}: Props) {
  return (
    <main className="space-y-4">
      {steps.map(step => (
        <FunnelStepCard
          key={step.id}
          step={step}
          isEditing={editingStepId === step.id}
          onEdit={
            onEdit
              ? () => onEdit(editingStepId === step.id ? null : step.id)
              : undefined
          }
          onDelete={onDelete ? () => onDelete(step.id as string) : undefined}
          onUpdate={onUpdateStep}
          onAIGenerate={onAIGenerate}   
        />
      ))}
    </main>
  )
}

