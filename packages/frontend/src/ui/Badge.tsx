// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/Badge.tsx


export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: 'green' | 'red' | 'blue' | 'purple' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge = ({ color = 'green', size = 'md', className, ...props }: BadgeProps) => {
  return (
    <div
      data-color={color}
      data-size={size}
      className={`badge ${className || ''}`}
      {...props}
    />
  )
}

Badge.displayName = 'Badge';