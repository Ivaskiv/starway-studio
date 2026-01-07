// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/Label.tsx
import { forwardRef } from 'react';

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  color?: 'green' | 'olive' | 'red' | 'yellow' | 'orange';
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ color = 'orange', children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        data-color={color}
        className="label"
        {...props}
      >
        {children}
      </label>
    );
  }
);

Label.displayName = 'Label';
