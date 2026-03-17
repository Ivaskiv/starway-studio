// frontend/src/features/modules/components/ModuleIntro.tsx
// Liquid Glass / glassmorphism — Tailwind + CSS vars, без style={{}} і без CSS-модулів

import { GlassCard } from '@/ui/GlassCard'

interface ModuleIntroProps {
  title: string
  description?: string
  steps: string[]
}

export function ModuleIntro({ title, description, steps }: ModuleIntroProps) {
  return (
    <GlassCard className="
      relative overflow-hidden
      p-6 md:p-8
      border border-[color:rgba(var(--glass-border-rgb),0.22)]
      bg-[color:var(--glass-bg)]
      backdrop-blur-xl
      rounded-2xl
      shadow-[0_8px_40px_rgba(var(--accent-glow-rgb),0.12)]
    ">
      {/* Ambient accent glow — верхній лівий кут */}
      <div className="
        pointer-events-none absolute -top-12 -left-12
        w-48 h-48 rounded-full
        bg-[color:rgba(var(--accent-rgb),0.15)]
        blur-3xl
      " />

      {/* Accent line зверху */}
      <div className="
        absolute top-0 left-6 right-6 h-px
        bg-gradient-to-r
          from-transparent
          via-[color:rgba(var(--accent-rgb),0.55)]
          to-transparent
      " />

      {/* Заголовок */}
      <h1 className="
        relative z-10
        text-2xl md:text-3xl font-semibold
        text-[color:var(--text-primary)]
        leading-tight tracking-tight
      ">
        {title}
      </h1>

      {/* Опис */}
      {description && (
        <p className="
          relative z-10
          mt-3 text-sm leading-relaxed
          text-[color:var(--text-secondary)]
        ">
          {description}
        </p>
      )}

      {/* Роздільник */}
      {steps.length > 0 && (
        <div className="
          relative z-10 mt-5 mb-4
          h-px
          bg-gradient-to-r
            from-[color:rgba(var(--accent-rgb),0.3)]
            via-[color:rgba(var(--glass-border-rgb),0.2)]
            to-transparent
        " />
      )}

      {/* Кроки */}
      <ul className="relative z-10 grid gap-2.5">
        {steps.map((step, i) => (
          <li
            key={step}
            className="
              flex items-start gap-3
              group
            "
          >
            {/* Номер кроку */}
            <span className="
              flex-shrink-0
              w-6 h-6 mt-0.5
              rounded-lg
              flex items-center justify-center
              text-[10px] font-bold
              bg-[color:rgba(var(--accent-rgb),0.18)]
              border border-[color:rgba(var(--accent-rgb),0.3)]
              text-[color:var(--accent)]
              group-hover:bg-[color:rgba(var(--accent-rgb),0.28)]
              transition-colors duration-200
            ">
              {i + 1}
            </span>

            {/* Текст кроку */}
            <span className="
              text-sm leading-relaxed
              text-[color:var(--text-secondary)]
              group-hover:text-[color:var(--text-primary)]
              transition-colors duration-200
            ">
              {step}
            </span>
          </li>
        ))}
      </ul>

      {/* Ambient glow — правий нижній кут */}
      <div className="
        pointer-events-none absolute -bottom-10 -right-10
        w-36 h-36 rounded-full
        bg-[color:rgba(var(--accent-soft-rgb),0.1)]
        blur-2xl
      " />
    </GlassCard>
  )
}