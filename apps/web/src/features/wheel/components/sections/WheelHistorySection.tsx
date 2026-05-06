import { WheelHistory } from '@/features/wheel/components/WheelHistory'

type Props = {
  userId: string
}

export default function WheelHistorySection({ userId }: Props) {
  if (!userId) return null

  return <WheelHistory userId={userId} showLegend={false} />
}
