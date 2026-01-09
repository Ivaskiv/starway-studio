// features/wheel/components/ScoreSlider.tsx

import { Input } from '@/ui'
import { motion } from 'framer-motion'

interface ScoreSliderProps {
  value: number
  onChange: (value: number) => void
  color: string
}

export const ScoreSlider = ({ value, onChange, color }: ScoreSliderProps) => {
  return (
    <div className="w-full space-y-4">
      {/* Number buttons */}
      <div className="flex justify-between gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <motion.button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`
              w-9 h-9 rounded-xl font-semibold text-sm transition-all duration-200
              ${value === num 
                ? 'scale-110 shadow-lg text-white' 
                : 'bg-white/5 text-white/60 hover:bg-white/10'
              }
            `}
            style={{
              backgroundColor: value === num ? color : undefined,
              boxShadow: value === num ? `0 4px 20px ${color}50` : undefined,
            }}
          >
            {num}
          </motion.button>
        ))}
      </div>
      
      {/* Range slider */}
      <Input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${(value - 1) * 11.11}%, rgba(255,255,255,0.1) ${(value - 1) * 11.11}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-white/40">
        <span>Критично</span>
        <span>Ідеально</span>
      </div>
    </div>
  )
}