// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/Icon.tsx
import { forwardRef } from 'react';
import * as LucideIcons from 'lucide-react';

type LucideIconName = keyof typeof LucideIcons;

export interface IconProps extends React.SVGAttributes<SVGElement> {
  name: LucideIconName;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, size = 24, color, strokeWidth = 2, className, ...props }, ref) => {
    const LucideIcon = LucideIcons[name] as React.ComponentType<any>;

    if (!LucideIcon) {
      console.warn(`Icon "${name}" not found in lucide-react`);
      return null;
    }

    return (
      <LucideIcon
        ref={ref}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className={className}
        {...props}
      />
    );
  }
);

Icon.displayName = 'Icon';

export default Icon;