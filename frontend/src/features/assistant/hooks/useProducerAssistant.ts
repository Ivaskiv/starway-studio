import { useMemo } from 'react'
import { useGetAssistantProgressQuery } from '@/features/producer/services/producer.api'
import { useProducerChat } from '@/features/producer/hooks/useProducer'
import type { AssistantProgressDTO, AssistantStep, AssistantStepStatus } from '../types/assistant.types'

const funnelStatusMap: Record<AssistantProgressDTO['funnelStage'], AssistantStepStatus> = {
  not_started: 'ready',
  draft: 'ready',
  ready: 'completed',
}

function getProductStepStatus(productStage: AssistantProgressDTO['productStage'], mentorStage: AssistantProgressDTO['mentorStage']): AssistantStepStatus {
  if (productStage === 'none') {
    return mentorStage === 'locked' ? 'locked' : 'ready'
  }
  return 'completed'
}

export function useProducerAssistant(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const { data: progress, isFetching } = useGetAssistantProgressQuery(undefined, { skip: !enabled })
  const {
    messages,
    send: sendMessage,
    isLoading: isMessageSending,
  } = useProducerChat(enabled)

  const steps = useMemo((): AssistantStep[] => {
    if (!enabled || !progress) {
      return []
    }

    const funnelStage = funnelStatusMap[progress.funnelStage]
    const mentorStatus = progress.mentorStage === 'active' ? 'completed' : 'locked'
    const productStatus = getProductStepStatus(progress.productStage, progress.mentorStage)
    const attachStatus: AssistantStepStatus = progress.productStage === 'none'
      ? 'locked'
      : progress.funnelAttached
        ? 'completed'
        : 'ready'
    const distributionStatus: AssistantStepStatus = !progress.funnelAttached
      ? 'locked'
      : progress.distributionStage === 'active'
        ? 'completed'
        : 'ready'

    return [
      {
        id: 1,
        title: 'Фуннель 5 точок',
        description: 'Завершіть або оновіть AI-фуннель, щоб мати матеріал для продукту.',
        status: funnelStage,
        ctaLabel: 'Відкрити воронку',
        action: 'open_funnel',
      },
      {
        id: 2,
        title: 'AI-ментор',
        description: 'Запустіть 7-денний trial і спостерігайте за AI-ментором.',
        status: mentorStatus,
        ctaLabel: 'Почати ментор',
        action: 'open_mentor',
      },
      {
        id: 3,
        title: 'Продукт',
        description: 'Створіть пропозицію або доведіть її до публікації.',
        status: productStatus,
        ctaLabel: 'Створити продукт',
        action: 'create_product',
      },
      {
        id: 4,
        title: 'Прив’язка продукту',
        description: 'Прикріпіть продукт до funnel і налаштуйте фінальні кроки.',
        status: attachStatus,
        ctaLabel: 'Підключити продукт',
        action: 'create_funnel',
      },
      {
        id: 5,
        title: 'Дистрибуція',
        description: 'Запустіть воронку та поділіться посиланням з аудиторією.',
        status: distributionStatus,
        ctaLabel: 'Запустити funnel',
        action: 'distribute',
      },
    ]
  }, [progress, enabled])

  return {
    progress,
    steps,
    nextAction: progress?.nextRecommendedAction ?? 'Завантажуємо контрольну точку…',
    isLoading: isFetching,
    chat: {
      messages,
      sendMessage,
      isSending: isMessageSending,
    },
  }
}
