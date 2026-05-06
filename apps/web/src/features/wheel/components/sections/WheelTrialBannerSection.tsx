import WheelTrialBanner from '@/features/wheel/components/ui/WheelTrialBanner'

type Props = {
  trialActive: boolean
  trialDaysLeft: number
  trialProgress: number
  onOpenSubscription: () => void
}

export default function WheelTrialBannerSection({
  trialActive,
  trialDaysLeft,
  trialProgress,
  onOpenSubscription,
}: Props) {
  if (!trialActive) return null

  return (
    <WheelTrialBanner
      trialDaysLeft={trialDaysLeft}
      trialProgress={trialProgress}
      onOpenSubscription={onOpenSubscription}
    />
  )
}
