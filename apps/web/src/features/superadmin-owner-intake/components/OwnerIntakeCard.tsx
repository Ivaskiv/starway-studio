import { ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOwnerIntakeForm } from '../hooks/useOwnerIntakeForm';

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-white/80">
      <span>
        {label}
        {required ? <span className="text-orange-300"> *</span> : null}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="glass-field h-11 rounded-xl"
      />
    </label>
  );
}

export default function OwnerIntakeCard() {
  const { user } = useAuth();
  const { values, updateField, submit, reset, canSubmit, isSubmitting } = useOwnerIntakeForm();

  const isSuperAdmin = useMemo(() => Boolean(user?.isSuperAdmin), [user?.isSuperAdmin]);

  if (!isSuperAdmin) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 pb-16">
      <div className="glass-card rounded-3xl border border-[color:rgba(var(--accent-rgb),0.35)] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/80 mb-2">Superadmin</p>
            <h3 className="text-2xl font-semibold text-white">Створення продукту/воронки для іншого owner</h3>
            <p className="text-white/65 mt-2 max-w-3xl">
              Заповніть owner intake шаблон. Після збереження система створить продукт і воронку
              від імені вибраного власника.
            </p>
          </div>
          <ShieldCheck className="w-8 h-8 text-emerald-300" />
        </div>

        {/* fix code_x: superadmin intake template for owner onboarding and delegation. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Owner email"
            required
            value={values.ownerEmail}
            onChange={(value) => updateField('ownerEmail', value)}
            placeholder="nadyastarway@gmail.com"
          />
          <Field
            label="Назва продукту"
            required
            value={values.productName}
            onChange={(value) => updateField('productName', value)}
            placeholder="Практикум 5 точок"
          />

          <Field
            label="Code продукту (опційно)"
            value={values.productCode}
            onChange={(value) => updateField('productCode', value)}
            placeholder="practice-5-points"
          />
          <Field
            label="Назва воронки"
            required
            value={values.funnelName}
            onChange={(value) => updateField('funnelName', value)}
            placeholder="5 днів роботи з реальністю"
          />

          <Field
            label="Мета воронки"
            required
            value={values.funnelGoal}
            onChange={(value) => updateField('funnelGoal', value)}
            placeholder="Конверсія в практикум + утримання в miniapp"
          />
          <Field
            label="Основна задача"
            required
            value={values.coreTask}
            onChange={(value) => updateField('coreTask', value)}
            placeholder="Провести користувача через колесо → щоденний цикл → оплату"
          />

          <Field
            label="Тип бізнесу"
            value={values.businessType}
            onChange={(value) => updateField('businessType', value)}
            placeholder="менторство / психологія / освітній продукт"
          />
          <Field
            label="Цільова аудиторія"
            value={values.targetAudience}
            onChange={(value) => updateField('targetAudience', value)}
            placeholder="жінки 25-45, які хочуть структуру рішень"
          />

          <Field
            label="Telegram bot username"
            value={values.telegramBotName}
            onChange={(value) => updateField('telegramBotName', value)}
            placeholder="@Test_ABsystem_bot"
          />
          <Field
            label="Telegram bot token"
            value={values.telegramBotToken}
            onChange={(value) => updateField('telegramBotToken', value)}
            placeholder="123456:AA..."
          />

          <Field
            label="Telegram contact (username/phone)"
            value={values.telegramContact}
            onChange={(value) => updateField('telegramContact', value)}
            placeholder="@owner_username або +380..."
          />

          <label className="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
            <span>Опис продукту</span>
            <textarea
              value={values.productDescription}
              onChange={(e) => updateField('productDescription', e.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              className="glass-field min-h-[92px] rounded-xl"
              placeholder="Короткий зміст цінності продукту"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
            <span>Початковий перелік продуктів (через кому або новим рядком)</span>
            <textarea
              value={values.initialProducts}
              onChange={(e) => updateField('initialProducts', e.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              className="glass-field min-h-[92px] rounded-xl"
              placeholder="Діагностика, Практикум 5 днів, Zoom супровід"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn rounded-xl bg-[color:rgba(var(--accent-rgb),0.72)] border-[color:rgba(var(--accent-rgb),0.9)]"
            disabled={!canSubmit || isSubmitting}
            onClick={() => void submit()}
          >
            {isSubmitting ? 'Створення...' : 'Створити для owner'}
          </button>
          <button
            type="button"
            className="btn rounded-xl bg-white/10 border-white/20"
            onClick={reset}
            disabled={isSubmitting}
          >
            Очистити шаблон
          </button>
        </div>
      </div>
    </section>
  );
}
