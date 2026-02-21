import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGenerateTelegramLinkMutation } from '@/features/social/services/social.api';
import type { OwnerOnboardingProfile } from '@/features/products/types/generator.types';
import { BadgeCheck, Bot, Link, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';

type Props = {
  value: OwnerOnboardingProfile;
  onChange: <K extends keyof OwnerOnboardingProfile>(
    key: K,
    newValue: OwnerOnboardingProfile[K],
  ) => void;
  onApplyNadyaTemplate?: () => void;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-white/75">
      <span>
        {label}
        {required ? <span className="text-orange-300"> *</span> : null}
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="glass-field h-11 rounded-xl"
      />
    </label>
  );
}

export default function OwnerOnboardingCard({ value, onChange, onApplyNadyaTemplate }: Props) {
  const { user } = useAuth();
  const [generateTelegramLink, tgState] = useGenerateTelegramLinkMutation();

  const isSuperAdmin = useMemo(() => Boolean(user?.isSuperAdmin), [user?.isSuperAdmin]);

  const handleGenerateTelegramLink = async () => {
    const res = await generateTelegramLink().unwrap();
    if (res?.link) window.open(res.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-[color:rgba(var(--accent-rgb),0.3)] space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mb-1">Owner onboarding</p>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            Профіль власника + Telegram bot card
          </h3>
          <p className="text-sm text-white/55 mt-2">
            {/* fix code_x: one unified onboarding card for owner data, bot profile, and save-funnel pipeline. */}
            Дані зберігаються разом із воронкою, продуктами та AI-архітектурою.
          </p>
          {isSuperAdmin && onApplyNadyaTemplate ? (
            <button
              type="button"
              onClick={onApplyNadyaTemplate}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[color:rgba(var(--accent-rgb),0.5)] bg-[color:rgba(var(--accent-rgb),0.18)] px-3 py-1.5 text-xs text-white hover:bg-[color:rgba(var(--accent-rgb),0.28)]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Шаблон: Надя (AI Ментор + 5 точок опори)
            </button>
          ) : null}
        </div>
        <Bot className="w-5 h-5 text-white/65" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isSuperAdmin ? (
          <Field
            label="Owner email"
            value={value.ownerEmail}
            onChange={next => onChange('ownerEmail', next)}
            placeholder="nadyastarway@gmail.com"
            required
          />
        ) : null}

        <Field
          label="Назва продукту"
          value={value.productName}
          onChange={next => onChange('productName', next)}
          placeholder="Практикум 5 точок"
          required
        />

        <Field
          label="Code продукту"
          value={value.productCode}
          onChange={next => onChange('productCode', next)}
          placeholder="practice-5-points"
        />

        <Field
          label="Назва воронки"
          value={value.funnelName}
          onChange={next => onChange('funnelName', next)}
          placeholder="5 днів роботи з реальністю"
          required
        />

        <Field
          label="Мета воронки"
          value={value.funnelGoal}
          onChange={next => onChange('funnelGoal', next)}
          placeholder="Trial → Subscription → Upsell"
          required
        />

        <Field
          label="Core task"
          value={value.coreTask}
          onChange={next => onChange('coreTask', next)}
          placeholder="Колесо → Щоденний цикл → CTA"
          required
        />

        <Field
          label="Тип бізнесу"
          value={value.businessType}
          onChange={next => onChange('businessType', next)}
          placeholder="менторство / психологія"
        />

        <Field
          label="Цільова аудиторія"
          value={value.targetAudience}
          onChange={next => onChange('targetAudience', next)}
          placeholder="Жінки 25-40, стан застою"
        />

        <Field
          label="Telegram bot username"
          value={value.telegramBotName}
          onChange={next => onChange('telegramBotName', next)}
          placeholder="@Starway_byNadya_Bot"
        />

        <Field
          label="Telegram bot token"
          value={value.telegramBotToken}
          onChange={next => onChange('telegramBotToken', next)}
          placeholder="123456:AA..."
        />

        <Field
          label="Telegram contact"
          value={value.telegramContact}
          onChange={next => onChange('telegramContact', next)}
          placeholder="@owner_username або +380..."
        />

        <label className="flex flex-col gap-2 text-sm text-white/75 md:col-span-2">
          <span>Опис продукту</span>
          <textarea
            value={value.productDescription}
            onChange={e => onChange('productDescription', e.target.value)}
            className="glass-field min-h-[80px] rounded-xl"
            placeholder="Коротко, яку трансформацію отримує користувач"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-white/75 md:col-span-2">
          <span>Початковий перелік продуктів</span>
          <textarea
            value={value.initialProducts}
            onChange={e => onChange('initialProducts', e.target.value)}
            className="glass-field min-h-[76px] rounded-xl"
            placeholder="Діагностика, Практикум, Підписка, Наставництво"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-white/65">
        <button
          type="button"
          className="btn rounded-xl bg-white/10 border-white/20"
          onClick={() => void handleGenerateTelegramLink()}
          disabled={tgState.isLoading}
        >
          <Link className="w-4 h-4" />
          Підключити Telegram цього акаунту
        </button>
        <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
          <BadgeCheck className="w-4 h-4 text-emerald-300" />
          Після збереження бот-профіль прикріпиться до metadata продукту
        </span>
      </div>
    </div>
  );
}
