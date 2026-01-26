// features/wheel/components/ScoreSlider.tsx

import { Button, Input } from '@/ui'

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
          <Button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`
              w-9 h-9 rounded-xl font-semibold text-sm 
              transition-all duration-200    
              hover:scale-110 active:scale-95
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
          </Button>
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