// features/wheel/components/WheelResult.tsx
import { WheelChart } from './WheelChart'

export const WheelResult = ({ wheel }: { wheel: any }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-white/60 text-sm">Середній бал</p>
        <p className="text-4xl font-bold text-white">
          {wheel.average_score}
        </p>
      </div>

      <div className="flex justify-center">
        <WheelChart scores={wheel.scores} size={320} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-white/60 mb-1">Сильні сторони</p>
          <pre className="text-white">
            {JSON.stringify(wheel.strengths, null, 2)}
          </pre>
        </div>
        <div>
          <p className="text-white/60 mb-1">Зони росту</p>
          <pre className="text-white">
            {JSON.stringify(wheel.gaps, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
export default WheelResult