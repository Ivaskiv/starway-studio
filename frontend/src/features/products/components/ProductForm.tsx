// /features/products/components/ProductForm.tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useCreateProductMutation,
  useGetProductByIdQuery,
  useUpdateProductMutation,
} from '@/services/admin.api';
// import {
//   CURRENCY_SYMBOLS,
//   PRODUCT_TYPE_LABELS,
// } from '@/types/product.labels';
import {
  formToCreatePayload,
  formToUpdatePayload,
  productToForm,
} from '@/features/products/types/product.mappers';
import type {
  Currency,
  ProductFormat,
  ProductFormInputs,
  ProductIntegration,
  ProductType,
} from '@/shared/types/product.types';
import { Button } from '@/ui';
import { FormFieldController } from '@/ui/FormFieldController';

const productTypeOptions = Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
  value: value as ProductType,
  label,
}));

const currencyOptions = [
  { value: 'UAH' as Currency, label: `Українська гривня (${CURRENCY_SYMBOLS.UAH})` },
  { value: 'EUR' as Currency, label: `Євро (${CURRENCY_SYMBOLS.EUR})` },
  { value: 'USD' as Currency, label: `Долар США (${CURRENCY_SYMBOLS.USD})` },
];

const formatOptions = [
  { value: 'web' as ProductFormat, label: 'Тільки веб-версія' },
  { value: 'mini_app' as ProductFormat, label: 'Telegram Mini App' },
  { value: 'telegram_task' as ProductFormat, label: 'Завдання в Telegram' },
  { value: 'mixed' as ProductFormat, label: 'Web + Telegram' },
];

const integrationOptions = [
  { value: 'telegram' as ProductIntegration, label: 'Telegram (нагадування + Mini App)' },
  { value: 'web' as ProductIntegration, label: 'Тільки веб' },
  { value: 'future' as ProductIntegration, label: 'Майбутні соцмережі' },
];

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data: product, isLoading: isLoadingProduct } = useGetProductByIdQuery(id!, {
    skip: !isEdit,
  });

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const isSubmitting = isCreating || isUpdating;

  const { control, handleSubmit, reset } = useForm<ProductFormInputs>({
    defaultValues: {
      name: '',
      description: '',
      type: 'membership',
      price: 0,
      currency: 'EUR',
      includesTrial: false,
      trialDays: 7,
      includesMentorship: false,
      format: 'mini_app',
      integration: 'telegram',
      status: 'draft',
      thumbnailUrl: '',
      modules: [],
    },
  });

  useEffect(() => {
    if (product) reset(productToForm(product));
  }, [product, reset]);

  const onSubmit = async (data: ProductFormInputs) => {
    try {
      if (isEdit && id) {
        await updateProduct({ id, data: formToUpdatePayload(data) }).unwrap();
        toast.success('Продукт успішно оновлено!');
      } else {
        await createProduct(formToCreatePayload(data)).unwrap();
        toast.success('Продукт успішно створено!');
      }
      navigate('/products');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Щось пішло не так');
    }
  };

  if (isEdit && isLoadingProduct) {
    return <p className="p-8 text-center text-slate-400">Завантаження продукту...</p>;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-white">
        {isEdit ? 'Редагування продукту' : 'Створення нового продукту'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Текстові поля */}
        <FormFieldController name="name" label="Назва продукту" />
        <FormFieldController
          name="type"
          label="Тип продукту"
          type="select"
          options={productTypeOptions}
        />
        <FormFieldController name="price" label="Ціна" type="number" />
        <FormFieldController
          name="currency"
          label="Валюта"
          type="select"
          options={currencyOptions}
        />
        <FormFieldController
          name="format"
          label="Формат доставки"
          type="select"
          options={formatOptions}
        />
        <FormFieldController
          name="integration"
          label="Основна інтеграція"
          type="select"
          options={integrationOptions}
        />
        <FormFieldController name="description" label="Опис продукту" type="textarea" />
        <FormFieldController name="thumbnailUrl" label="Посилання на обкладинку (thumbnail)" />

        {/* Чекбокси */}
        <FormFieldController
          name="includesTrial"
          label="Включити пробний період (7 днів)"
          type="checkbox"
        />
        <FormFieldController
          name="includesMentorship"
          label="Включити індивідуальне наставництво"
          type="checkbox"
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          data-color="purple"
          data-size="lg"
          className="w-full py-5 text-lg font-bold"
        >
          {isSubmitting ? 'Зберігаємо...' : isEdit ? 'Зберегти зміни' : 'Створити продукт'}
        </Button>
      </form>
    </div>
  );
}
