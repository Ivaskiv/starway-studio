export default function WheelSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="h-6 w-40 bg-white/10 rounded mb-6" />

      <div className="h-64 bg-white/5 rounded-3xl mb-6" />

      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-20 bg-white/10 rounded-xl"
          />
        ))}
      </div>
    </div>
  )
}
