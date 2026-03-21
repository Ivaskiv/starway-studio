// /features/products/components/ProductBuilder.tsx

import { useCreateProductMutation } from '@/features/products/services/products.api';
import {
  MentorPromptConfig,
  ProductFormInputs,
  ProductFormat,
  ProductType,
  formToCreatePayload,
  ProductIntegration,
} from '@/features/products/types/product.types';
import { Step4MentorConfig } from './Step4MentorConfig';
import { Step5PromptPreview } from './Step5PromptPreview';
import { Step6Publish } from './Step6Publish';
import { generateSystemPrompt, DEFAULT_MENTOR_PROMPT_CONFIG } from '../utils/promptTemplate';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Label } from '@/ui/Label';
import { Select } from '@/ui/Select';
import { Textarea } from '@/ui/Textarea';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ===== Константи для селектів =====
const PRODUCT_TYPES: { label: string; value: ProductType }[] = [
  { label: '📚 Курс', value: 'course' },
  { label: '🎯 Funnel/Практикум', value: 'funnel' },
  { label: '🤝 Наставництво', value: 'mentorship' },
  { label: '🤖 AI-ментор', value: 'mentor' },
];

const FORMATS: { label: string; value: ProductFormat }[] = [
  { label: '🎬 Video', value: 'video' },
  { label: '📄 Text', value: 'text' },
  { label: '🔀 Mixed', value: 'mixed' },
  { label: '🗂 Digital', value: 'digital' },
];

const INTEGRATIONS: { label: string; value: ProductIntegration }[] = [
  { label: 'Telegram', value: 'telegram' },
  { label: 'Web', value: 'web' },
  { label: 'Future', value: 'future' },
];

const DEFAULT_FORM: ProductFormInputs = {
  name: '',
  description: '',
  title: '',
  type: 'course',
  price: 0,
  currency: 'EUR',
  includesTrial: false,
  trialDays: 7,
  includesMentorship: false,
  format: 'video',
  integration: 'telegram',
  status: 'draft',
  thumbnailUrl: '',
  modules: [],
  systemPrompt: generateSystemPrompt(DEFAULT_MENTOR_PROMPT_CONFIG),
  mentorConfig: { ...DEFAULT_MENTOR_PROMPT_CONFIG },
};

const ProductBuilder: React.FC = () => {
  const [mentorConfig, setMentorConfig] = useState<MentorPromptConfig>({
    ...DEFAULT_MENTOR_PROMPT_CONFIG,
  });
  const [productForm, setProductForm] = useState<ProductFormInputs>(DEFAULT_FORM);
  const [createProduct, { isLoading }] = useCreateProductMutation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const systemPrompt = useMemo(() => generateSystemPrompt(mentorConfig), [mentorConfig]);

  const handleChange = <K extends keyof ProductFormInputs>(key: K, value: ProductFormInputs[K]) => {
    setProductForm(prev => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    try {
      if (!user?.id) {
        throw new Error('User must be logged in to create a product');
      }
      const payload = formToCreatePayload(
        { ...productForm, mentorConfig, systemPrompt },
        user.id,
      );
      const result = await createProduct(payload).unwrap();
      navigate(`/admin/products/${result.id}/edit`);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  useEffect(() => {
    setProductForm(prev => ({
      ...prev,
      mentorConfig,
      systemPrompt,
    }));
  }, [mentorConfig, systemPrompt]);

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-xl text-white">
      <h2 className="text-2xl font-bold mb-4">Створення продукту</h2>

      {/* Назва */}
      <div>
        <Label>Назва продукту</Label>
        <Input
          value={productForm.name}
          onChange={e => handleChange('name', e.target.value)}
          placeholder="Наприклад: Сила свідомості"
        />
      </div>

      {/* Опис */}
      <div>
        <Label>Опис продукту</Label>
        <Textarea
          value={productForm.description}
          onChange={e => handleChange('description', e.target.value ?? '')}
          placeholder="Короткий опис продукту"
          rows={3}
        />
      </div>

      {/* Тип */}
      <div>
        <Label>Тип продукту</Label>
        <Select
          value={productForm.type}
          onChange={e => handleChange('type', e.target.value as ProductType)}
        >
          {PRODUCT_TYPES.map(t => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Формат */}
      <div>
        <Label>Формат</Label>
        <Select
          value={productForm.format}
          onChange={e => handleChange('format', e.target.value as ProductFormat)}
        >
          {FORMATS.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Інтеграція */}
      <div>
        <Label>Інтеграція</Label>
        <Select
          value={productForm.integration}
          onChange={e => handleChange('integration', e.target.value as ProductIntegration)}
        >
          {INTEGRATIONS.map(i => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Ціна */}
      <div>
        <Label>Ціна</Label>
        <Input
          type="number"
          value={productForm.price}
          onChange={e => handleChange('price', Number(e.target.value))}
        />
      </div>

      {/* Триал */}
      <div className="flex items-center gap-3">
        <Input
          type="checkbox"
          checked={productForm.includesTrial}
          onChange={e => handleChange('includesTrial', e.target.checked)}
          id="trial"
        />
        <Label htmlFor="trial">Має триал</Label>
      </div>

      {/* Дні триалу */}
      {productForm.includesTrial && (
        <div>
          <Label>Кількість днів триалу</Label>
          <Input
            type="number"
            value={productForm.trialDays}
            onChange={e => handleChange('trialDays', Number(e.target.value))}
          />
        </div>
      )}

      {/* Менторство */}
      <div className="flex items-center gap-3">
        <Input
          type="checkbox"
          checked={productForm.includesMentorship}
          onChange={e => handleChange('includesMentorship', e.target.checked)}
          id="mentorship"
        />
        <Label htmlFor="mentorship">Має менторство</Label>
      </div>

      <Step4MentorConfig value={mentorConfig} onChange={setMentorConfig} />
      <Step5PromptPreview config={mentorConfig} />
      <Step6Publish config={mentorConfig} loading={isLoading} onPublish={handleCreate} />
    </div>
  );
};

export default ProductBuilder;
