import { useEffect, useState } from 'react';
import axios from 'axios';
import { GlassCard } from '@/ui';
import { Edit2, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

export type LandingCard = {
  id: string;
  title: string;
  url: string;
  price: number;
  productId?: string;
};

type LandingCardsProps = {
  userId: string;
};

const DEMO_CARDS: LandingCard[] = [
  { id: 'demo-hero', title: 'Warm Welcome Page', url: 'https://demo.ai/landing/hero', price: 0 },
  { id: 'demo-automation', title: 'Funnel Builder', url: 'https://demo.ai/landing/funnel', price: 49 },
  { id: 'demo-membership', title: 'Premium Membership', url: 'https://demo.ai/landing/premium', price: 99 },
];

export default function LandingCards({ userId }: LandingCardsProps) {
  const [cards, setCards] = useState<LandingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadCards = async () => {
    try {
      const res = await axios.get(`/api/landing/cards?userId=${userId}`);
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setCards(list.length ? list : DEMO_CARDS);
      setError(false);
    } catch (err) {
      console.error('Failed to load landing cards:', err);
      setCards(DEMO_CARDS);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [userId]);

  const handleLivePreview = (url: string) => {
    window.open(url, '_blank');
  };

  const handleEdit = (card: LandingCard) => {
    toast(`Редагування лендінгу: ${card.title}`);
  };

  const sendTelegramNotification = async (card: LandingCard) => {
    try {
      await axios.post('/api/telegram/notify', {
        userId,
        landingId: card.id,
        title: card.title,
        url: card.url,
      });
    } catch (err) {
      console.error('Telegram notification failed:', err);
    }
  };

  if (loading) return <p>Завантаження лендінгів...</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {error && (
        <p className="text-sm text-yellow-500 col-span-full mb-2">
          У вас ще немає лендінгів або не вдалося підвантажити ваші лендінги. Показано демо-версію.
        </p>
      )}
      {cards.map((card) => (
        <GlassCard key={card.id} className="p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-lg">{card.title}</h3>
            <p className="text-xs text-[var(--text-muted-light)] mt-1">
              URL: <a href={card.url} target="_blank" rel="noreferrer" className="underline">{card.url}</a>
            </p>
            <p className="text-sm mt-1">Ціна: €{card.price}</p>
          </div>
          <div className="flex justify-between mt-3">
            <button
              onClick={() => handleLivePreview(card.url)}
              className="flex items-center gap-1 text-[var(--accent)] text-sm font-semibold hover:underline"
            >
              Live Preview <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                handleEdit(card);
                sendTelegramNotification(card);
              }}
              className="flex items-center gap-1 text-[var(--accent)] text-sm font-semibold hover:underline"
            >
              Edit <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
