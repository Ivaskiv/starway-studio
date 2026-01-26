// /frontend/src/ui/EditableCard.tsx

import { ReactNode, useState } from 'react';
import { Button, GlassCard } from '../ui';

interface EditableCardProps {
  title: string;
  onSave: () => void;
  children: (isEditing: boolean) => ReactNode;
}

const EditableCard: React.FC<EditableCardProps> = ({ title, onSave, children }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onSave();
    setIsEditing(false);
  };

  return (
    <GlassCard className="p-6 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <Button
          className="px-3 py-1 rounded bg-orange-500 hover:bg-orange-600 text-white text-sm"
          onClick={isEditing ? handleSave : () => setIsEditing(true)}
        >
          {isEditing ? 'Зберегти' : 'Редагувати'}
        </Button>
      </div>
      {children(isEditing)}
    </GlassCard>
  );
};

export default EditableCard;
