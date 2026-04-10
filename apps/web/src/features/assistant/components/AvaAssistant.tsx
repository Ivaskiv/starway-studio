import StarwayMark from '@/ui/StarwayMark'

interface AvaHeadProps {
  width?: number
}

export function AvaHead({ width = 44 }: AvaHeadProps) {
  return <StarwayMark size={width} className="ava-head" />
}
