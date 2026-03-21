import { ArrowRight, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { useCreateProductMutation } from '@/features/products/services/products.api';
import { ProductFormInputs } from '@/features/products/types/product.types';
import { ModuleIntro } from '@/shared/components/ModuleIntro';
import { ModuleUsageCounter } from '@/shared/components/ModuleUsageCounter';
import { getToastMessage } from '@/shared/i18n/toast';
import { Button } from '@/ui/Button';
import { GlassCard } from '@/ui/GlassCard';
import { Input } from '@/ui/Input';
import { Textarea } from '@/ui/Textarea';

function slugify(value: string, ownerEmail: string) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const ownerCode = ownerEmail.split('@')[0];
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${dateStr}_${ownerCode}`;
}

export default function ProductCreationPage() {
  const navigate = useNavigate();
  const [createProduct, createState] = useCreateProductMutation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerEmail, setOwnerEmail] = useState(''); 

  const code = useMemo(() => {
    if (!name || !ownerEmail) return '';
    return slugify(name, ownerEmail);
  }, [name, ownerEmail]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(getToastMessage('module.productNameRequired'));
      return;
    }
    if (!ownerEmail.trim()) {
      toast.error('Вкажіть власника продукту');
      return;
    }

    try {
      const payload: ProductFormInputs = {
        code,
        name: name.trim(),
        title: name.trim(),
        description: description.trim(),
        ownerEmail: ownerEmail.trim(),
        type: 'course',
        format: 'video',
        price: 0,
        currency: 'EUR',
        includesTrial: false,
        trialDays: 7,
        includesMentorship: false,
        integration: 'telegram',
        status: 'draft',
        thumbnailUrl: '',
        modules: [],
        goals: [],
      };
      await createProduct(payload).unwrap();

      toast.success(getToastMessage('module.productCreated'));
      navigate(ROUTES.PRODUCTS);
    } catch (error: any) {
      const apiMessage = error?.data?.error || error?.error;
      toast.error(apiMessage ? String(apiMessage) : getToastMessage('module.productCreateFailed'));
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <ModuleIntro
        title="Створення продукту"
        description="Створи базовий продукт, після цього доповни його AI-генерацією або підключи до воронки."
        steps={[
          '1. Заповни назву та короткий опис.',
          '2. Вкажи власника продукту.',
          '3. Збережи продукт у каталозі.',
          '4. Перейди в AI Генератор або AI Воронку для розширення.',
        ]}
      />

      <ModuleUsageCounter label="Створені продукти" used={name.trim() ? 1 : 0} total={1} />

      <GlassCard className="p-5 md:p-6 space-y-4">
        <Input
          label="Назва продукту"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Наприклад: AI Mentor Starter"
        />

        <Input
          label="Код продукту"
          value={code}
          readOnly
          helperText="Код генерується автоматично з назви та власника."
        />

        <Input
          label="Власник продукту (email)"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="Наприклад: nadyastarway@gmail.com"
        />

        <Textarea
          label="Короткий опис"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Що отримає користувач після проходження продукту?"
          rows={4}
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCreate} loading={createState.isLoading}>
            Створити продукт
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`${ROUTES.AI_GENERATOR}?tab=mentor`)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Перейти в AI Генератор
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate(`${ROUTES.AI_FUNNEL_BUILDER}?tab=funnel`)}
          >
            AI Воронка
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
