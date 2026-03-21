// fix style $100k — premium editable card using liquid-glass surfaces
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
    <GlassCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h3>
        <Button
          variant={isEditing ? 'solid' : 'outline'}
          color="accent"
          size="sm"
          className="glass-button"
          onClick={isEditing ? handleSave : () => setIsEditing(true)}
        >
          {isEditing ? 'Зберегти' : 'Редагувати'}
        </Button>
      </div>
      <div className="space-y-3">{children(isEditing)}</div>
    </GlassCard>
  );
};

export default EditableCard;
