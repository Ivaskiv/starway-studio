// packages/frontend/src/ui/Checkbox.tsx

import React from 'react'
import clsx from 'clsx'
import { Label } from '@/ui/Label'
import Input from '@/ui/Input'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className,
  ...props
}) => {
  return (
    <Label className="flex items-center gap-3 cursor-pointer select-none">
      <Input
        type="checkbox"
        className={clsx(
          'w-5 h-5 rounded-md border border-white/20 bg-white/10',
          'checked:bg-purple-600 checked:border-purple-600',
          'focus:ring-2 focus:ring-purple-500',
          className
        )}
        {...props}
      />
      {label && (
        <span className="text-sm text-gray-200">
          {label}
        </span>
      )}
    </Label>
  )
}

export default Checkbox
