// frontend/src/features/wheel/components/WheelCategoryCard.tsx
import { WheelCategory } from '@/features/wheel/types/wheel.types'
import React from 'react'

interface WheelCategoryCardProps {
  category: WheelCategory
  score?: number
  note?: string
  onClick?: (categoryId: string) => void
}

export const WheelCategoryCard: React.FC<WheelCategoryCardProps> = ({
  category,
  score,
  note,
  onClick,
}) => {
  return (
    <div
      className="p-4 rounded-2xl glassmorphism shadow-lg flex flex-col items-center cursor-pointer hover:scale-105 transition-transform duration-300"
      style={{ borderColor: category.color }}
      onClick={() => onClick?.(category.id)}
    >
      <div className="text-3xl">{category.emoji}</div>
      <div className="mt-2 text-sm text-white/80">{category.nameUk}</div>

      {score !== undefined && (
        <div className="mt-1 text-white font-bold text-lg">{score}/10</div>
      )}

      {note && (
        <div className="mt-1 text-xs text-white/50 text-center">{note}</div>
      )}
    </div>
  )
}
