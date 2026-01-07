// /packages/frontend/src/ui/Card.tsx

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
  glass?: boolean;
  gradient?: boolean;
}

export const Card = ({
  className,
  hover,
  glow,
  glass = true,
  gradient,
  children,
  ...props
}: CardProps) => {
  return (
    <div
      className={`glass-card ${glass ? '' : ''} ${hover ? 'hover' : ''} ${glow ? 'glow' : ''} ${
        gradient ? 'gradient' : ''
      } ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pb-4 ${className || ''}`} {...props}>
    {children}
  </div>
)

export const CardContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pt-0 ${className || ''}`} {...props}>
    {children}
  </div>
)

export const CardFooter = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pt-4 border-t border-border ${className || ''}`} {...props}>
    {children}
  </div>
)

Card.displayName = 'Card'
CardHeader.displayName = 'CardHeader'
CardContent.displayName = 'CardContent'
CardFooter.displayName = 'CardFooter'

