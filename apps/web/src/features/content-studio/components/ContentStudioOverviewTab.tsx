import { ChevronLeft, ChevronRight, Sparkles, UploadCloud, X } from 'lucide-react'

import { InfoHint } from '@/ui'
import { FormatChecklist } from './ContentStudioStepPrimitives'
import { CM_MODAL_STEP_TOTAL, CM_PIPELINE_STEPS, CM_SECTION_TITLE_CLASS, SECTION_EYEBROW_CLASS, CTA_DESTINATION_OPTIONS, CTA_ROUTING_OPTIONS, CTA_TYPE_OPTIONS } from '../config/contentStudio.config'
import { getProgressWidthClass } from '../utils/contentTransforms'
import type { ContentStudioStep } from '../config/contentStudio.config'

export function ContentStudioOverviewTab(props: {
  itemsCount: number
  launchPotential: { views: string; dm: string; trial: string }
  handleLaunchSales: () => void
  onOpenScripts: () => void
  onOpenContext: () => void
  onStartNewPackage: () => void
  onGenerateAll: () => void
  isGenerating: boolean
  reflection: string
  setReflection: (value: string) => void
  contextHookVariants: string[]
  activeContextHookIndex: number
  canResetHookLimit: boolean
  handleResetContextHookLimit: () => void
  handleSelectContextHookVariant: (index: number) => void
  handlePrevContextHookVariant: () => void
  handleGenerateContextHook: () => void
  handleNextContextHookVariant: () => void
  selectedFormats: string[]
  handleToggleFormat: (value: string) => void
  formatOptions: ReadonlyArray<{ value: string; label: string; hint: string }>
  ctaType: string
  ctaDestination: string[]
  ctaRoutingMode: string
  ctas: string[]
  stepDefinitions: Array<{ step: ContentStudioStep; title: string; subtitle: string }>
  activeStep: ContentStudioStep | null
  openStep: (step: ContentStudioStep) => void
  summary: { total: number }
  audioReadyCount: number
  reelsReadyCount: number
}) {
  const { itemsCount, launchPotential, handleLaunchSales, onOpenScripts, onOpenContext, onStartNewPackage, onGenerateAll, isGenerating, reflection, setReflection, contextHookVariants, activeContextHookIndex, canResetHookLimit, handleResetContextHookLimit, handleSelectContextHookVariant, handlePrevContextHookVariant, handleGenerateContextHook, handleNextContextHookVariant, selectedFormats, handleToggleFormat, formatOptions, ctaType, ctaDestination, ctaRoutingMode, ctas, stepDefinitions, activeStep, openStep, summary, audioReadyCount, reelsReadyCount } = props
  return <div className="space-y-5 px-6 py-6">...</div>
}
