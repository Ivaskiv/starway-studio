import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import {
  useCreateOwnerProductMutation,
  useGenerateOwnerFunnelMutation,
} from '../services/intake.api';
import type { OwnerIntakeFormValues } from '../types/intake.types';
import {
  OWNER_INTAKE_DEFAULTS,
  toOwnerIntakeFunnelPayload,
  toOwnerIntakeProductPayload,
} from '../utils/intake.utils';

export function useOwnerIntakeForm() {
  const [values, setValues] = useState<OwnerIntakeFormValues>(OWNER_INTAKE_DEFAULTS);
  const [createOwnerProduct, createState] = useCreateOwnerProductMutation();
  const [generateOwnerFunnel, funnelState] = useGenerateOwnerFunnelMutation();

  const isSubmitting = createState.isLoading || funnelState.isLoading;

  const updateField = <K extends keyof OwnerIntakeFormValues>(key: K, value: OwnerIntakeFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const canSubmit = useMemo(() => {
    return (
      Boolean(values.ownerEmail.trim()) &&
      Boolean(values.productName.trim()) &&
      Boolean(values.funnelName.trim()) &&
      Boolean(values.funnelGoal.trim()) &&
      Boolean(values.coreTask.trim())
    );
  }, [values]);

  const submit = async () => {
    if (!canSubmit) {
      toast.error('Заповніть обовʼязкові поля owner intake.');
      return;
    }

    try {
      const productPayload = toOwnerIntakeProductPayload(values);
      const product = await createOwnerProduct(productPayload).unwrap();

      const funnelPayload = toOwnerIntakeFunnelPayload(values);
      const funnel = await generateOwnerFunnel(funnelPayload).unwrap();

      toast.success('Створено продукт і AI-воронку для вибраного owner.');

      return {
        productId: product.id,
        funnelId: funnel.funnel?.id,
      };
    } catch (error: any) {
      const message =
        error?.data?.error || error?.data?.message || 'Не вдалося створити owner продукт/воронку';
      toast.error(String(message));
      throw error;
    }
  };

  const reset = () => setValues(OWNER_INTAKE_DEFAULTS);

  return {
    values,
    updateField,
    submit,
    reset,
    canSubmit,
    isSubmitting,
  };
}
