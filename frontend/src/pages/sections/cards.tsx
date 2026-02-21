import { hasAccess } from '@/config/menu';
import { GlassCard } from '@/ui/GlassCard';
import { Lock, type LucideIcon, Users } from 'lucide-react';
import { useState } from 'react';

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  gradient: string;
};

export function FeatureCard({ icon: Icon, title, description, gradient }: FeatureCardProps) {
  return (
    <GlassCard className="p-10 hover:scale-105 transition-transform">
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 bg-gradient-to-br ${gradient}`}>
        <Icon className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      {description ? <p className="text-slate-400 text-sm">{description}</p> : null}
    </GlassCard>
  );
}

type ModuleCardProps = {
  icon: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: 'green' | 'blue' | 'locked';
  time?: string;
  frequency?: string;
  requiresPaid: boolean;
  user: any;
  onClick: () => void;
};

export function ModuleCard({
  icon,
  title,
  description,
  badge,
  badgeColor,
  time,
  frequency,
  requiresPaid,
  user,
  onClick,
}: ModuleCardProps) {
  const itemHasAccess = hasAccess({ path: '#', label: title, requiresPaid }, user);
  const locked = !itemHasAccess;

  const badgeColors = {
    green: 'bg-green-500/10 border-green-500 text-green-400',
    blue: 'bg-blue-500/10 border-blue-500 text-blue-400',
    locked: 'bg-slate-500/10 border-slate-500 text-slate-400',
  } as const;

  return (
    <GlassCard
      className={`p-6 transition-all cursor-pointer ${locked ? 'opacity-50' : 'hover:scale-105 hover:border-orange-500/50'}`}
      onClick={() => {
        if (locked) {
          alert('Доступно тільки в платній версії');
          return;
        }
        onClick();
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center text-3xl">
          {icon}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColors[badgeColor]} flex items-center gap-1`}>
          {locked ? <Lock className="w-3 h-3" /> : null}
          {badge}
        </span>
      </div>

      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm mb-4">{description}</p>

      {time || frequency ? (
        <div className="flex gap-4 text-xs text-slate-500 pt-4 border-t border-white/5">
          {time ? <span>⏱ {time}</span> : null}
          {frequency ? <span>📅 {frequency}</span> : null}
        </div>
      ) : null}
    </GlassCard>
  );
}

type StatsCardProps = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export function StatsCard({ value, label, icon: Icon }: StatsCardProps) {
  return (
    <GlassCard className="p-6 text-center hover:scale-105 transition-transform">
      <Icon className="w-8 h-8 text-orange-500 mx-auto mb-3" />
      <div className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent mb-2">
        {value}
      </div>
      <div className="text-sm text-slate-400 uppercase tracking-wider">{label}</div>
    </GlassCard>
  );
}

export function TrendingItem({ rank, title, stats }: { rank: string; title: string; stats: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
      <div className="text-xl font-bold text-orange-500 min-w-[40px]">{rank}</div>
      <div className="flex-1">
        <h5 className="font-semibold group-hover:text-orange-500 transition-colors">{title}</h5>
        <div className="text-xs text-slate-400">{stats}</div>
      </div>
    </div>
  );
}

export function LeaderboardItem({
  rank,
  name,
  points,
}: {
  rank: string;
  name: string;
  points: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-105 cursor-pointer">
      <div className="text-2xl font-bold min-w-[40px] text-center">{rank}</div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center font-bold">
        {name.split(' ').map((n) => n[0]).join('')}
      </div>
      <div className="flex-1">
        <div className="font-semibold">{name}</div>
        <div className="text-xs text-slate-400">
          <span className="font-bold text-orange-500">{points}</span> балів
        </div>
      </div>
    </div>
  );
}

export function CourseCard({
  icon,
  title,
  progress,
  students,
  rating,
}: {
  icon: string;
  title: string;
  progress: number;
  students: string;
  rating: string;
}) {
  return (
    <GlassCard className="p-6 hover:scale-105 transition-transform cursor-pointer group">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-2xl flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-lg group-hover:text-orange-500 transition-colors">{title}</h4>
          <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
            <Users className="w-4 h-4" />
            <span>{students} студентів</span>
            <span className="text-yellow-500">⭐ {rating}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Прогрес</span>
          <span className="font-semibold text-orange-500">{progress}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </GlassCard>
  );
}

export function AIMentorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content:
        'AI — не психолог і не чат. Я керуючий модуль, що веде вас по системі: СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.\n\nЗадайте питання або опишіть вашу ситуацію.',
    },
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: input }]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'Це демо-відповідь. В реальній версії тут буде інтеграція з AI API.' },
      ]);
    }, 800);

    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <GlassCard className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold">🤖 AI Ментор</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center font-bold flex-shrink-0">
                {msg.role === 'ai' ? 'AI' : 'V'}
              </div>
              <div
                className={`max-w-[70%] p-3 rounded-xl ${
                  msg.role === 'user' ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-white/5'
                }`}
              >
                <p className="whitespace-pre-line text-sm">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
              placeholder="Напишіть повідомлення..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
            />
            <button
              onClick={sendMessage}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl font-semibold hover:scale-105 transition-transform"
            >
              ➤
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
