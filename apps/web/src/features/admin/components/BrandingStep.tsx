// frontend/src/features/admin/components/BrandingStep.tsx

import { Button, Input, Label, Textarea } from '@/ui';
import { Upload } from 'lucide-react';
import React from 'react';
import './BrandingStep.css';

interface BrandingStepProps {
  data: any;
  onChange: (data: any) => void;
}
interface TextFieldConfig {
  key: string;
  label: string;
  component: React.FC<any>;
  hint?: string;
}
const textFields: TextFieldConfig[] = [
  {
    key: 'name',
    label: 'Назва продукту',
    component: Input,
    hint: 'Це буде головна назва',
  },
  {
    key: 'description',
    label: 'Опис',
    component: Textarea,
  },
];
export const BrandingStep: React.FC<BrandingStepProps> = ({ data, onChange }) => {
  const updateBranding = (field: string, value: any) => {
    onChange({
      ...data,
      branding: {
        ...data.branding,
        [field]: value,
      },
    });
  };

  const updateColor = (type: 'primary' | 'secondary', value: string) => {
    onChange({
      ...data,
      branding: {
        ...data.branding,
        colors: {
          ...data.branding.colors,
          [type]: value,
        },
      },
    });
  };

  const textFields = [
    {
      key: 'name',
      label: 'Назва продукту *',
      component: Input,
      placeholder: 'Наприклад: Сила свідомості',
      hint: 'Це буде головна назва вашого продукту',
    },
    {
      key: 'description',
      label: 'Опис продукту *',
      component: Textarea,
      placeholder: 'Короткий опис вашого продукту для користувачів',
      rows: 3,
    },
  ];

  const colors = [
    { key: 'primary', label: 'Основний колір', placeholder: '#8B5CF6' },
    { key: 'secondary', label: 'Додатковий колір', placeholder: '#EC4899' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Назва + опис */}
      {textFields.map(({ key, label, component: Component, hint, ...props }) => (
        <div key={key}>
          <Label className="block text-sm font-medium text-gray-300 mb-2">{label}</Label>
          <Component
            value={data.branding[key]}
            onChange={(e: any) => updateBranding(key, e.target.value)}
            className="w-full"
            {...props}
          />
          {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
        </div>
      ))}

      {/* Logo */}
      <div>
        <Label className="block text-sm font-medium text-gray-300 mb-2">Логотип</Label>
        <div className="flex items-center gap-4">
          {data.branding.logo_url && (
            <img
              src={data.branding.logo_url}
              alt="Logo"
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <Button
            type="button"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white flex items-center gap-2"
            onClick={() => console.log('Upload logo')}
          >
            <Upload className="w-4 h-4" />
            Завантажити
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">PNG або JPG, рекомендовано 256x256px</p>
      </div>

      {/* Кольори */}
      <div className="grid grid-cols-2 gap-4">
        {colors.map(({ key, label, placeholder }) => (
          <div key={key}>
            <Label className="block text-sm font-medium text-gray-300 mb-2">{label}</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={data.branding.colors[key]}
                onChange={e => updateColor(key, e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer"
              />
              <Input
                value={data.branding.colors[key]}
                onChange={e => updateColor(key, e.target.value)}
                placeholder={placeholder}
                className="flex-1"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="mt-6 p-6 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-xs text-gray-500 mb-3">Попередній перегляд:</p>
        <div
          className="p-6 rounded-lg text-white branding-preview"
        >
          <h3 className="text-2xl font-bold mb-2">{data.branding.name || 'Назва продукту'}</h3>
          <p className="text-white/80">{data.branding.description || 'Опис продукту'}</p>
        </div>
      </div>
    </div>
  );
};
export default BrandingStep;
