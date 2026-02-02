// frontend/src/features/ai-mentor/pages/AIMentorPage.tsx
import { TelegramModal } from '@/features/integrations/components/TelegramModal';
import { Button, GlassCard, Input } from '@/ui';
import { Bot, MessageCircle, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AIMentorPage() {
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const hasSeenModal = localStorage.getItem('telegram_modal_seen');
    if (!hasSeenModal && !isTelegramConnected) {
      setShowTelegramModal(true);
      localStorage.setItem('telegram_modal_seen', 'true');
    }
  }, [isTelegramConnected]);

  const handleConnectTelegram = () => {
    console.log('Connecting to Telegram...');
    setIsTelegramConnected(true);
    setShowTelegramModal(false);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    console.log('Sending:', message);
    setMessage('');
  };

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Ментор</h1>
              <p className="text-white/60 text-sm">Твій персональний асистент</p>
            </div>
          </div>

          <Button
            variant={isTelegramConnected ? 'glass' : 'solid'}
            // color={isTelegramConnected ? 'green' : 'orange'}
            size="sm"
            onClick={() => !isTelegramConnected && setShowTelegramModal(true)}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
            {isTelegramConnected ? 'Підключено' : 'Підключити'}
          </Button>
        </div>

        <GlassCard blur="xl" className="min-h-[500px] flex flex-col">
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Привіт! Я твій AI ментор</h3>
                <p className="text-white/60 text-sm max-w-md">
                  Задай мені питання або розкажи про свій день. Я допоможу зі збалансованим
                  розвитком та досягненням цілей.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Напиши своє питання..."
                className="flex-1"
              />
              <Button
                color="purple"
                size="md"
                onClick={handleSendMessage}
                disabled={!message.trim()}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { icon: '🎯', label: 'Постави ціль', color: 'from-orange-500 to-red-500' },
            { icon: '📊', label: 'Аналіз прогресу', color: 'from-blue-500 to-cyan-500' },
            { icon: '💡', label: 'Отримай пораду', color: 'from-purple-500 to-pink-500' },
          ].map((action, i) => (
            <button
              key={i}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105"
            >
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-xl mb-2`}
              >
                {action.icon}
              </div>
              <div className="text-sm text-white font-medium">{action.label}</div>
            </button>
          ))}
        </div>
      </div>

      <TelegramModal
        isOpen={showTelegramModal}
        onClose={() => setShowTelegramModal(false)}
        onConnect={handleConnectTelegram}
      />
    </>
  );
}
