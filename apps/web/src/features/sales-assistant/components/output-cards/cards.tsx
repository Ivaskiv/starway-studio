import type { OutputCardCommonProps } from './types'
import { GenericTypeCard } from './GenericTypeCard'

export const BlogOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} extraActions={[{ id: 'docx', label: 'Експорт .docx' }]} />
export const LandingOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} extraActions={[{ id: 'struct', label: 'Експорт структури' }]} />
export const StorytellingOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} />
export const TelegramOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} extraActions={[{ id: 'tg', label: 'Надіслати в TG' }]} />
export const ReelsOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} extraActions={[{ id: 'reelsq', label: 'У чергу Reels' }]} />
export const StoriesOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} />
export const WarmupOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} />
export const WebinarOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} />
export const AuditOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} extraActions={[{ id: 'clean', label: 'Очистити крінж-фільтр' }]} />
export const PostOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} />
export const EmailOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} />
export const SalesOutputCard = (props: OutputCardCommonProps) => <GenericTypeCard {...props} />
