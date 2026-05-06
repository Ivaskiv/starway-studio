// apps/web/src/features/content-studio/components/ContentStudioLeadMagnetStep.tsx
import type { ContentStudioAIStrategy, ContentStudioFunnelInsight, ContentStudioLeadMagnetPayload, LeadMagnet } from '../types/contentStudio.types';
import { LeadMagnetBuilderBlock } from './lead-magnet/LeadMagnetBuilderBlock';

type Props = {
  productLabel: string;
  aiStrategy: ContentStudioAIStrategy | null;
  funnelInsight: ContentStudioFunnelInsight | null;
  aiInsightPreview: string;
  leadMagnetDraft: LeadMagnet | null;
  setLeadMagnetDraft: (value: LeadMagnet | null) => void;
  leadMagnetSelectedFormat: string;
  leadMagnetConfirmations: boolean[];
  setLeadMagnetConfirmations: (value: boolean[]) => void;
  onSaveLeadMagnet: (payload: ContentStudioLeadMagnetPayload) => Promise<unknown>;
  onPublishLeadMagnet: (payload: ContentStudioLeadMagnetPayload) => Promise<unknown>;
};

export default function ContentStudioLeadMagnetStep(props: Props) {
  const {
    productLabel,
    aiStrategy,
    funnelInsight,
    aiInsightPreview,
    leadMagnetDraft,
    setLeadMagnetDraft,
    leadMagnetSelectedFormat,
    leadMagnetConfirmations,
    setLeadMagnetConfirmations,
    onSaveLeadMagnet,
    onPublishLeadMagnet,
  } = props;

  return (
    <LeadMagnetBuilderBlock
      insight={aiStrategy}
      funnelInsight={funnelInsight}
      productLabel={productLabel}
      formatKey={leadMagnetSelectedFormat}
      formatLabel={leadMagnetSelectedFormat}
      aiInsight={aiInsightPreview}
      confirmations={leadMagnetConfirmations}
      setConfirmations={setLeadMagnetConfirmations}
      destinations={leadMagnetDraft?.destinations ?? ['telegram_bot']}
      setDestinations={(value) => {
        if (!leadMagnetDraft) {
          setLeadMagnetDraft({
            id: `${Date.now()}`,
            title: `${productLabel} · Lead magnet`,
            promise: 'Перший результат за 10 хвилин',
            format: 'checklist',
            structure: {
              hook: aiStrategy?.hookAngle ?? 'Ти відчуваєш, що результат ще не зрушив з місця?',
              explanation: aiStrategy?.coreProblem ?? 'Після lead magnet людина не бачить ясного наступного кроку',
              steps: (aiStrategy?.actions ?? ['Спростити onboarding до 1 дії', 'Додати миттєву цінність', 'Підсилити CTA']).slice(0, 5),
              result: `Людина швидко бачить перший зсув і розуміє, як ${aiStrategy?.contentFocus ?? 'рухатися далі'} саме у ${productLabel}.`,
              transitionToProduct: aiStrategy?.ctaStrategy ?? `Перейди в ${productLabel} і забери наступний крок одразу.`,
            },
            status: 'review',
            destinations: value,
            createdAt: new Date(),
          });
          return;
        }
        setLeadMagnetDraft({ ...leadMagnetDraft, destinations: value });
      }}
      leadMagnet={leadMagnetDraft}
      setLeadMagnet={setLeadMagnetDraft}
      onSave={onSaveLeadMagnet}
      onPublish={onPublishLeadMagnet}
      onReset={() => {
        setLeadMagnetDraft(null);
        setLeadMagnetConfirmations([false, false, false, false, false]);
      }}
    />
  );
}