// frontend/src/ui/Icon.tsx
import { forwardRef, SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: string
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

const getIconPath = (name: string): string => {
  return `/icons/icons8-${name}.svg`
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, size = 24, color, strokeWidth = 2, className = '', ...props }, ref) => {
    const svgPath = getIconPath(name)

    return (
      <span className="inline-flex items-center justify-center">
        <img
          src={svgPath}
          alt={name}
          width={size}
          height={size}
          className={className}
          style={{ 
            filter: color ? `brightness(0) saturate(100%) invert(${color === 'white' ? '1' : '0'})` : undefined 
          }}
          onError={(e) => {
            console.warn(`[Icon] "${name}" not found at ${svgPath}`)
            e.currentTarget.style.display = 'none'
          }}
        />
      </span>
    )
  }
)

Icon.displayName = 'Icon'