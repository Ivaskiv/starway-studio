type Props = {
  eyebrow: string
  title: string
  description: string
}

export default function WheelHeaderSection({
  eyebrow,
  title,
  description,
}: Props) {
  return (
    <section className="card-surface liquid-glass min-h-0 rounded-2xl p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)] md:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </section>
  )
}
