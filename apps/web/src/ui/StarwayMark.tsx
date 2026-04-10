type StarwayMarkProps = {
  size?: number
  className?: string
}

export default function StarwayMark({ size = 28, className }: StarwayMarkProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center text-white',
        className ?? '',
      ].join(' ')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} fill="none">
        <path
          d="M9.35 3.9c.22 0 .42.15.48.36l.88 3.01a1 1 0 0 0 .7.69l3.06.9a.5.5 0 0 1 0 .96l-3.06.9a1 1 0 0 0-.7.69l-.88 3.01a.5.5 0 0 1-.96 0L8 11.4a1 1 0 0 0-.69-.69l-3.06-.9a.5.5 0 0 1 0-.96l3.06-.9A1 1 0 0 0 8 7.27l.87-3.01a.5.5 0 0 1 .48-.36Z"
          fill="white"
        />
        <path
          d="M15.85 11.2a.5.5 0 0 1 .48.36l.46 1.6a.9.9 0 0 0 .62.62l1.63.48a.5.5 0 0 1 0 .96l-1.63.48a.9.9 0 0 0-.62.62l-.46 1.6a.5.5 0 0 1-.96 0l-.46-1.6a.9.9 0 0 0-.62-.62l-1.63-.48a.5.5 0 0 1 0-.96l1.63-.48a.9.9 0 0 0 .62-.62l.46-1.6a.5.5 0 0 1 .48-.36Z"
          fill="white"
          opacity="0.95"
        />
        <path
          d="M6.1 14.8a.5.5 0 0 1 .48.36l.28.98a.75.75 0 0 0 .52.52l1 .29a.5.5 0 0 1 0 .96l-1 .29a.75.75 0 0 0-.52.52l-.28.98a.5.5 0 0 1-.96 0l-.29-.98a.75.75 0 0 0-.52-.52l-.99-.29a.5.5 0 0 1 0-.96l.99-.29a.75.75 0 0 0 .52-.52l.29-.98a.5.5 0 0 1 .48-.36Z"
          fill="white"
          opacity="0.72"
        />
      </svg>
    </span>
  )
}
