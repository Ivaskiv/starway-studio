import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCreateProductMutation } from '@/features/products/services/products.api';
import { ProductFormInputs } from '@/features/products/types/product.types';
import { ModuleIntro } from '@/features/modules/components/ModuleIntro';
import { ModuleUsageCounter } from '@/features/modules/components/ModuleUsageCounter';
import { getToastMessage } from '@/features/notifications/i18n/toast';
import { Button } from '@/ui/Button';
import { GlassCard } from '@/ui/GlassCard';
import { Input } from '@/ui/Input';
import { Textarea } from '@/ui/Textarea';
import { GenerationCurtain, useGenerationCurtain, withMinimumDelay } from '@/ui';

function slugify(value: string, ownerEmail: string) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const ownerCode = ownerEmail.split('@')[0];
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${dateStr}_${ownerCode}`;
}

export default function ProductCreationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [createProduct, createState] = useCreateProductMutation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerEmail, setOwnerEmail] = useState(''); 
  const curtainVisible = useGenerationCurtain(createState.isLoading, {
    enterDelay: 140,
    minVisibleMs: 1000,
  });

  const code = useMemo(() => {
    if (!name || !ownerEmail) return '';
    return slugify(name, ownerEmail);
  }, [name, ownerEmail]);

  if (String(user?.role ?? 'USER').toUpperCase() !== 'SUPERADMIN') {
    return <Navigate to={ROUTES.PRODUCTS} replace />;
  }

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
      await withMinimumDelay(createProduct(payload).unwrap(), 900);

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
        description="Створи базовий продукт і збережи його в каталозі без додаткових конструкторів."
        steps={[
          '1. Заповни назву та короткий опис.',
          '2. Вкажи власника продукту.',
          '3. Збережи продукт у каталозі.',
          '4. Повернись у каталог продуктів для подальшої роботи.',
        ]}
      />

      <ModuleUsageCounter label="Створені продукти" used={name.trim() ? 1 : 0} total={1} />

      <GlassCard className="relative overflow-hidden p-5 md:p-6 space-y-4">
        <GenerationCurtain
          open={curtainVisible}
          title="Збираємо продукт"
          subtitle="Формуємо картку продукту, код і базову конфігурацію каталогу."
        />
        <Input
          label="Назва продукту"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Наприклад: ABsystem Starter"
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
        </div>
      </GlassCard>
    </div>
  );
}
