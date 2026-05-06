// apps/web/src/features/content-studio/components/ContentStudioStepBody.tsx
import type {
  ContentStudioAIStrategy,
  ContentStudioFunnelInsight,
  ContentStudioItem,
  ContentStudioLeadMagnetPayload,
  LeadMagnet,
} from '../types/contentStudio.types';

import ContentStudioContextStep from './ContentStudioContextStep';
import ContentStudioLeadMagnetStep from './ContentStudioLeadMagnetStep';
import ContentStudioCtaStep from './ContentStudioCtaStep';
import ContentStudioFormulaStep from './ContentStudioFormulaStep';
import ContentStudioHookStep from './ContentStudioHookStep';
import ContentStudioApiStep from './ContentStudioApiStep';
import ContentStudioResearchStep from './ContentStudioResearchStep';
import ContentStudioTextsStep from './ContentStudioTextsStep';
import ContentStudioBannersStep from './ContentStudioBannersStep';

type ContentStudioStepBodyProps = {
  activeStep: string;

  // Context Step
  sectionTitleClass: string;
  segmentClass?: string;
  fieldClass: string;
  stackColumnsClass?: string;
  stackColumnClass?: string;
  sectionCardClass?: string;
  textareaClass: string;
  campaignProductValue: string;
  campaignProductOptions: readonly string[];
  dispatchUpdateProduct: (value: string) => void;
  platform: string;
  platformOptions: ReadonlyArray<{ value: string; label: string }>;
  handlePlatformChange: (value: string) => void;
  contextAudienceText: string;
  updateAudience: (value: string) => void;
  adMessageGoal: string;
  adMessageGoalOptions: ReadonlyArray<{ value: string; label: string }>;
  setAdMessageGoal: (value: string) => void;
  contextPainText: string;
  updatePain: (value: string) => void;
  aiInsightPreview: string;
  onAiInsightChange: (value: string) => void;
  leadMagnetStepAdded: boolean;
  leadMagnetStepDismissedFor: string | null;
  onAddLeadMagnetStep: () => void;
  onSkipLeadMagnetStep: (signature: string) => void;

  // Lead Magnet Step
  productLabel: string;
  aiStrategy: ContentStudioAIStrategy | null;
  funnelInsight: ContentStudioFunnelInsight | null;
  leadMagnetDraft: LeadMagnet | null;
  setLeadMagnetDraft: (value: LeadMagnet | null) => void;
  leadMagnetSelectedFormat: string;
  leadMagnetConfirmations: boolean[];
  setLeadMagnetConfirmations: (value: boolean[]) => void;
  onSaveLeadMagnet: (payload: ContentStudioLeadMagnetPayload) => Promise<unknown>;
  onPublishLeadMagnet: (payload: ContentStudioLeadMagnetPayload) => Promise<unknown>;

  // CTA Step
  campaignContextSample: string;
  reflection: string;
  setReflection: (value: string) => void;
  ctaType: string;
  ctaTypeOptions: ReadonlyArray<{ value: string; label: string; hint: string }>;
  setCtaType: (value: string) => void;
  ctaDestination: string[];
  ctaDestinationOptions: ReadonlyArray<{ value: string; label: string; hint: string }>;
  setCtaDestination: (value: string) => void;
  ctaRoutingMode: string;
  ctaRoutingOptions: ReadonlyArray<{ value: string; label: string; hint: string }>;
  setCtaRoutingMode: (value: string) => void;
  ctaSuggestions: readonly string[];
  selectedCtas: string[];
  handleAddCtaSuggestion: (value: string) => void;
  updateCtaField: (value: string) => void;

  // Formula Step
  formulaType: string;
  setFormulaType: (value: string) => void;
  formulaCards: ReadonlyArray<{
    key: string;
    badge: string;
    badgeClass: string;
    title: string;
    description: string;
    bullets: readonly { key: string; text: string }[];
    footer: string;
    note?: string;
    accentClass: string;
  }>;

  // Hook Step
  contextHookVariants: string[];
  activeContextHookIndex: number;
  canResetHookLimit: boolean;
  handleResetContextHookLimit: () => void;
  canRestorePreviousContext: boolean;
  handleRestorePreviousContext: () => void;
  handleSelectContextHookVariant: (index: number) => void;
  handlePrevContextHookVariant: () => void;
  handleGenerateContextHook: () => void;
  handleNextContextHookVariant: () => void;
  selectedHookType: string;
  selectedHookLabel: string;
  setSelectedHookType: (value: string) => void;
  researchUpdatedLabel: string;
  researchSourceLabel: string;
  hookScoreContext: {
    blended: number;
    categoryScore: number;
    problemScore: number;
    formatScore: number;
    destinationScore: number;
    goalScore: number;
    typeScore: number;
    sourceLabel: string;
  };
  hasResearchMeta: boolean;
  isFallback: boolean;
  isResearchStale: boolean;
  researchHookOptions: ReadonlyArray<{
    key: string;
    eyebrow: string;
    title: string;
    body: string;
    footer: string;
  }>;

  // API Step
  elevenKeyMode: 'saved' | 'manual';
  setElevenKeyMode: (value: 'saved' | 'manual') => void;
  savedElevenKeyLabel: string;
  setSavedElevenKeyLabel: (value: string) => void;
  elevenKey: string;
  setElevenKey: (value: string) => void;
  voiceIdMode: 'saved' | 'manual';
  setVoiceIdMode: (value: 'saved' | 'manual') => void;
  savedVoiceIdLabel: string;
  setSavedVoiceIdLabel: (value: string) => void;
  voiceId: string;
  setVoiceId: (value: string) => void;
  openAiKeyMode: 'saved' | 'manual';
  setOpenAiKeyMode: (value: 'saved' | 'manual') => void;
  savedOpenAiKeyLabel: string;
  setSavedOpenAiKeyLabel: (value: string) => void;
  gptKey: string;
  setGptKey: (value: string) => void;
  telegramTokenMode: 'saved' | 'manual';
  setTelegramTokenMode: (value: 'saved' | 'manual') => void;
  savedTelegramBotLabel: string;
  setSavedTelegramBotLabel: (value: string) => void;
  tgToken: string;
  setTgToken: (value: string) => void;
  telegramChatMode: 'saved' | 'manual';
  setTelegramChatMode: (value: 'saved' | 'manual') => void;
  savedTelegramChatLabel: string;
  setSavedTelegramChatLabel: (value: string) => void;
  tgChat: string;
  setTgChat: (value: string) => void;

  // Research Step
  isRefreshing: boolean;
  onRefresh: () => void;
  campaignCards: ReadonlyArray<{
    key: string;
    eyebrow: string;
    title: string;
    body: string;
    metrics: readonly string[];
  }>;

  // Texts Step
  groups: ReadonlyArray<{ key: string; label: string }>;
  activeGroup: string;
  setActiveGroup: (value: string) => void;
  isGenerating: boolean;
  isStrategyReady: boolean;
  runGenerateAll: () => Promise<ContentStudioItem[] | undefined>;
  textItems: ContentStudioItem[];
  busyItemId: string | null;
  onRegenerateItem: (item: ContentStudioItem) => Promise<ContentStudioItem | null> | ContentStudioItem | null;
  onApproveItem: (id: string) => void;
  onCopy: (value: string) => Promise<void> | void;
  onUpdateItemContent: (id: string, value: string) => void;
  textVariantPresets: ReadonlyArray<{ title: string; badge: string; tone: string }>;

  // Banners Step
  adItems: ContentStudioItem[];
  bannerVariantPresets: ReadonlyArray<{
    key: string;
    title: string;
    badge: string;
    emoji: string;
    imagePrompt: string;
  }>;
  imageBusyItemId: string | null;
  onUpdatePrompt: (id: string, value: string) => void;
  onGenerateImagesExisting: (item: ContentStudioItem) => Promise<ContentStudioItem | null | undefined>;
  onGenerateImagesTemplate: (index: number) => Promise<ContentStudioItem | null | undefined>;
  onRegenerateExisting: (item: ContentStudioItem) => Promise<ContentStudioItem | null | undefined>;
  onRegenerateTemplate: () => Promise<ContentStudioItem[] | null | undefined>;
  onPublishItem: (item: ContentStudioItem) => Promise<void> | void;
};

export default function ContentStudioStepBody(props: ContentStudioStepBodyProps) {
  const {
    activeStep,
    segmentClass = 'rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4',
    stackColumnsClass = 'grid gap-4 lg:grid-cols-2',
    stackColumnClass = 'space-y-4',
    sectionCardClass = 'rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5',
  } = props;
  const resolvedProps = {
    ...props,
    segmentClass,
    stackColumnsClass,
    stackColumnClass,
    sectionCardClass,
  };

  switch (activeStep) {
    case 'context':      return <ContentStudioContextStep {...resolvedProps} />;
    case 'lead-magnet':  return <ContentStudioLeadMagnetStep {...resolvedProps} />;
    case 'cta':          return <ContentStudioCtaStep {...resolvedProps} />;
    case 'formula':      return <ContentStudioFormulaStep {...resolvedProps} />;
    case 'hook':         return <ContentStudioHookStep {...resolvedProps} />;
    case 'api':          return <ContentStudioApiStep {...resolvedProps} />;
    case 'research':     return <ContentStudioResearchStep {...resolvedProps} />;
    case 'texts':        return <ContentStudioTextsStep {...resolvedProps} />;
    case 'banners':      return <ContentStudioBannersStep {...resolvedProps} />;
    default:             return null;
  }
}
