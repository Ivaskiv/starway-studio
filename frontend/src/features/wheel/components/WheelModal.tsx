// frontend/src/features/wheel/components/WheelModal.tsx
import { Button } from '@/ui';
import { X } from 'lucide-react';

interface WheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function WheelModal({ isOpen, onClose, onComplete }: WheelModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="
          absolute inset-0 bg-black/60 backdrop-blur-sm
          opacity-0 animate-fade-in
        "
      />

      {/* Modal */}
      <div
        className="
          relative w-full max-w-lg rounded-3xl
          bg-gradient-to-br from-slate-800/90 to-slate-900/90
          backdrop-blur-xl border border-white/10 shadow-2xl
          scale-95 opacity-0 animate-modal-in
        "
      >
        {/* Close */}
        <Button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10"
        >
          <X className="w-5 h-5 text-white/60" />
        </Button>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl shadow-lg shadow-purple-500/25">
              🎯
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Колесо балансу</h2>
            <p className="text-white/60 text-sm">
              Оціни свій стан у 8 сферах життя
            </p>
          </div>

          {/* Categories */}
          <div className="grid gap-3">
            {[
              { emoji: '💪', title: "Здоров'я", desc: 'Фізичний стан' },
              { emoji: '💰', title: 'Фінанси', desc: 'Матеріальна стабільність' },
              { emoji: '❤️', title: 'Стосунки', desc: 'Близькі люди' },
              { emoji: '🎯', title: "Кар'єра", desc: 'Професійний розвиток' },
            ].map((cat, i) => (
              <div
                key={i}
                className="
                  flex items-center gap-3 p-3 rounded-xl
                  bg-white/5 border border-white/10
                  opacity-0 animate-slide-in
                "
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">
                  {cat.emoji}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">
                    {cat.title}
                  </div>
                  <div className="text-xs text-white/60">
                    {cat.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={onComplete}
              className="
                w-full px-6 py-3 rounded-xl
                bg-gradient-to-r from-orange-500 to-orange-600
                text-white font-semibold
                transition-transform hover:scale-[1.02] active:scale-[0.98]
                shadow-lg shadow-orange-500/25
              "
            >
              Почати оцінку
            </Button>

            <Button
              onClick={onClose}
              className="w-full px-6 py-2 text-white/60 hover:text-white text-sm"
            >
              Пізніше
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
