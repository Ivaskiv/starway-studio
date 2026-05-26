import { CONTENT_TYPE_REGISTRY } from '@/features/sales-assistant/config/contentStudio.config'
import type { AnyOutputCard, ContentTypeKey } from '@/features/sales-assistant/types/output.types'
import {
  AuditOutputCard,
  BlogOutputCard,
  EmailOutputCard,
  LandingOutputCard,
  PostOutputCard,
  ReelsOutputCard,
  SalesOutputCard,
  StoriesOutputCard,
  StorytellingOutputCard,
  TelegramOutputCard,
  WarmupOutputCard,
  WebinarOutputCard,
} from './cards'

type Props = {
  contentType: ContentTypeKey
  card: AnyOutputCard
  onCopy: (value: string) => void
}

export function OutputCardRouter({ contentType, card, onCopy }: Props) {
  const meta = CONTENT_TYPE_REGISTRY.find((item) => item.key === contentType)
  if (!meta) return null

  const common = {
    contentType,
    card,
    actions: meta.actions,
    metrics: meta.metrics,
    previewMode: meta.previewMode,
    onCopy,
  } as const

  switch (contentType) {
    case 'blog': return <BlogOutputCard {...common} />
    case 'landing': return <LandingOutputCard {...common} />
    case 'storytelling': return <StorytellingOutputCard {...common} />
    case 'telegram_msg': return <TelegramOutputCard {...common} />
    case 'reels': return <ReelsOutputCard {...common} />
    case 'stories': return <StoriesOutputCard {...common} />
    case 'warmup': return <WarmupOutputCard {...common} />
    case 'webinar': return <WebinarOutputCard {...common} />
    case 'audit': return <AuditOutputCard {...common} />
    case 'post': return <PostOutputCard {...common} />
    case 'email': return <EmailOutputCard {...common} />
    case 'sales': return <SalesOutputCard {...common} />
    default: return null
  }
}
