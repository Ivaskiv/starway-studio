// frontend/src/features/producer/hooks/useProducer.ts
import { useCallback, useState } from 'react'
import {
  useGenerateSEOMutation,
  useGenerateTargetingMutation,
  useAnalyzeFunnelMutation,
  useGetWeeklyReportQuery,
  useGenerateHeroMutation,
  useGenerateAdsMutation,
  useGenerateProducerPlanMutation,
  useSendProducerMessageMutation,
} from '../services/producer.api'
import type { WizardData } from '@/features/ai-generator/utils/templates'

// ─── Існуючий хук — без змін ─────────────────────────────────
export function useProducer(productId?: string) {
  const weeklyReport = useGetWeeklyReportQuery({ productId }, { skip: !productId })
  const [generateSEO,       seoState]       = useGenerateSEOMutation()
  const [generateTargeting, targetingState] = useGenerateTargetingMutation()
  const [analyzeFunnel,     funnelState]    = useAnalyzeFunnelMutation()
  const [generateHero,      heroState]      = useGenerateHeroMutation()
  const [generateAds,       adsState]       = useGenerateAdsMutation()
  return {
    weeklyReport, generateSEO, generateTargeting, analyzeFunnel, generateHero, generateAds,
    isLoading: {
      seo: seoState.isLoading, targeting: targetingState.isLoading,
      funnel: funnelState.isLoading, hero: heroState.isLoading,
      ads: adsState.isLoading, report: weeklyReport.isLoading,
    },
    results: {
      seo: seoState.data?.seo, targeting: targetingState.data?.targeting,
      funnel: funnelState.data?.funnel, hero: heroState.data?.variants, ads: adsState.data?.ads,
    },
  }
}

// ─── Wizard — RTK замість fetch ───────────────────────────────
export function useProducerWizard() {
  const [wizardData, setWizardData] = useState<WizardData>({
    name: '', audience: '', transformation: '', format: '', uniqueness: '',
  })
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null)
  const [generatePlanMutation, { isLoading: isGenerating, error: mutationError }] =
    useGenerateProducerPlanMutation()

  const setField = useCallback((key: keyof WizardData, value: string) =>
    setWizardData(prev => ({ ...prev, [key]: value })), [])

  const prefill = useCallback((data: Partial<WizardData>) =>
    setWizardData(prev => ({ ...prev, ...data })), [])

  const generate = useCallback(async () => {
    try {
      const res = await generatePlanMutation(wizardData).unwrap()
      setGeneratedPlan(res.result)
    } catch { /* error через mutationError */ }
  }, [wizardData, generatePlanMutation])

  const reset = useCallback(() => {
    setGeneratedPlan(null)
    setWizardData({ name: '', audience: '', transformation: '', format: '', uniqueness: '' })
  }, [])

  const error = mutationError
    ? ('data' in mutationError
        ? (mutationError.data as { message?: string })?.message ?? 'Помилка генерації'
        : 'Помилка з\'єднання. Спробуй ще раз.')
    : null

  return { wizardData, setField, prefill, generate, isGenerating, generatedPlan, error, reset }
}

// ─── ProducerChat — RTK замість fetch ────────────────────────
export function useProducerChat(enabled = true) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [sendMessageMutation, { isLoading }] = useSendProducerMessageMutation()

  const send = useCallback(async (text: string, stepContext?: string) => {
    if (!enabled || !text.trim() || isLoading) return
    const userMsg = { role: 'user' as const, content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    try {
      const res = await sendMessageMutation({ messages: nextMessages, stepContext }).unwrap()
      setMessages(prev => [...prev, { role: 'assistant', content: res.result }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Помилка. Спробуй ще раз.' }])
    }
  }, [messages, isLoading, sendMessageMutation, enabled])

  const init = useCallback((content: string) =>
    setMessages([{ role: 'assistant', content }]), [])

  const clear = useCallback(() => setMessages([]), [])

  return { messages, send, init, clear, isLoading }
}
