// frontend/src/features/actions/components/ActionsSelector.tsx
// Селектор дій для конструктора воронки
import { ActionCard } from '@/features/actions/components/ActionCard';
import { ReactNode } from 'react';

export type FunnelActionType =
  | 'ai_message'
  | 'email'
  | 'delay'
  | 'condition'
  | 'webhook';

export interface FunnelActionDefinition {
  type: FunnelActionType;
  title: string;
  description: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface ActionsSelectorProps {
  actions: FunnelActionDefinition[];
  onSelect: (action: FunnelActionDefinition) => void;
}

export default function ActionsSelector({
  actions,
  onSelect,
}: ActionsSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {actions.map(action => (
        <ActionCard
          key={action.type}
          title={action.title}
          description={action.description}
          icon={action.icon}
          isDisabled={action.disabled}
          onClick={() => onSelect(action)}
        />
      ))}
    </div>
  );
}
