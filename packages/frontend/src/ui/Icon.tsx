// packages/frontend/src/ui/Icon.tsx

import { forwardRef } from 'react';
import { ReactSVG } from 'react-svg';
import * as LucideIcons from 'lucide-react';
import { getIconPath } from '@/constants/socialPlatforms';

// ============ TYPES ============

type LucideIconName = keyof typeof LucideIcons;

export interface IconProps extends Omit<React.SVGAttributes<SVGElement>, 'name'> {
  name: LucideIconName | string; // Lucide або назва SVG файлу
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

// ============ COMPONENT ============

const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, size = 24, color, strokeWidth = 2, className, ...props }, ref) => {
    const LucideIcon = (LucideIcons as Record<string, any>)[name];

    // ✅ Lucide іконка
    if (LucideIcon) {
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

    // ✅ SVG файл з /public/icons/
    const svgPath = getIconPath(name);

    return (
      <ReactSVG
        src={svgPath}
        beforeInjection={(svg) => {
          svg.setAttribute('width', String(size));
          svg.setAttribute('height', String(size));

          if (className) {
            svg.classList.add(...className.split(' '));
          }

          if (color) {
            svg.setAttribute('fill', color);
            svg.style.color = color;
          }
        }}
        wrapper="span"
        className="inline-flex items-center justify-center"
        fallback={() => {
          console.warn(`[Icon] "${name}" not found at ${svgPath}`);
          return null;
        }}
      />
    );
  }
);

Icon.displayName = 'Icon';
export default Icon;