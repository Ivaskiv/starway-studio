type Props = {
  text: string
}

export default function Hint({ text }: Props) {
  return (
    <span className="group relative inline-flex">
      <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-white/10 text-[10px] font-semibold text-[var(--text-muted)] transition-all duration-200 group-hover:scale-110 group-hover:border-[rgba(var(--accent-rgb),0.35)] group-hover:text-[var(--text-primary)] group-hover:shadow-[0_0_16px_rgba(var(--accent-rgb),0.22)]">
        ?
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 translate-y-2 rounded-xl border border-white/10 bg-[rgba(11,18,32,0.95)] px-3 py-2 text-left text-xs leading-relaxed text-[var(--text-secondary)] opacity-0 shadow-[0_20px_40px_rgba(0,0,0,0.28)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        {text}
      </span>
    </span>
  )
}
