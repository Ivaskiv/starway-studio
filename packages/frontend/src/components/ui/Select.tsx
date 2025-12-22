// src/components/ui/Select.tsx
import * as React from 'react'

type SelectContextType = {
  value: string | undefined
  onChange: (v: string) => void
}

const SelectContext = React.createContext<SelectContextType | null>(null)

/* ─────────────────────────────
   ROOT
───────────────────────────── */
interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export function Select({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
}: SelectProps) {
  const [value, setValue] = React.useState(defaultValue)
  const actualValue = controlledValue ?? value

  const handleChange = (v: string) => {
    setValue(v)
    onValueChange?.(v)
  }

  return (
    <SelectContext.Provider
      value={{ value: actualValue, onChange: handleChange }}
    >
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  )
}

/* ─────────────────────────────
   TRIGGER
───────────────────────────── */
export function SelectTrigger({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-left text-white ${className}`}
    >
      {children}
    </button>
  )
}

/* ─────────────────────────────
   VALUE
───────────────────────────── */
export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectContext)
  if (!ctx) return null

  return (
    <span className={ctx.value ? 'text-white' : 'text-gray-500'}>
      {ctx.value ?? placeholder}
    </span>
  )
}

/* ─────────────────────────────
   CONTENT
───────────────────────────── */
export function SelectContent({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="absolute z-50 mt-2 w-full bg-black border border-gray-700 rounded-lg overflow-hidden">
      {children}
    </div>
  )
}

/* ─────────────────────────────
   ITEM
───────────────────────────── */
export function SelectItem({
  value,
  children,
}: {
  value: string
  children: React.ReactNode
}) {
  const ctx = React.useContext(SelectContext)
  if (!ctx) return null

  return (
    <div
      onClick={() => ctx.onChange(value)}
      className="px-4 py-2 cursor-pointer hover:bg-gray-800 text-white"
    >
      {children}
    </div>
  )
}
