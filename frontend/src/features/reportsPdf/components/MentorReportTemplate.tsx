// frontend/src/features/reports/components/MentorReportTemplate.tsx
// Glassmorphism PDF Template — генеруємо через html2canvas + jsPDF

import React from 'react';

export interface MentorReportTemplateProps {
  userId: string;
  answers: Array<{ questionId: string; value: string | number }>;
  decisions: Array<{ type: string; supportMessage?: string; id: string }>;
  metrics: {
    stability: number;
    drains: number;
    consistency: number;
  };
  wheelData?: Array<{ area: string; score: number }>;
}

export const MentorReportTemplate: React.FC<MentorReportTemplateProps> = ({
  userId,
  answers,
  decisions,
  metrics,
  wheelData,
}) => {
  return (
    <div className="w-[210mm] min-h-[297mm] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-12 font-sans">
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PAGE 1 — COVER */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="h-[297mm] flex flex-col justify-between relative overflow-hidden">
        
        {/* Background Blur Circles */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl" />
        
        {/* Header */}
        <div className="relative z-10">
          <div className="glassmorphism-card p-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl">
            <h1 className="text-6xl font-bold text-white mb-4">
              AI-МЕНТОР
            </h1>
            <p className="text-2xl text-purple-200">
              Звіт про твій стан
            </p>
          </div>
        </div>

        {/* Center Metrics */}
        <div className="relative z-10 grid grid-cols-3 gap-6">
          <MetricCard
            label="Стабільність"
            value={metrics.stability}
            max={10}
            color="from-green-400 to-emerald-600"
          />
          <MetricCard
            label="Злив енергії"
            value={metrics.drains}
            max={10}
            color="from-red-400 to-rose-600"
          />
          <MetricCard
            label="Послідовність"
            value={metrics.consistency}
            max={10}
            color="from-blue-400 to-cyan-600"
          />
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <div className="glassmorphism-card p-6 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl">
            <p className="text-white/60 text-sm">
              Користувач: <span className="text-white font-mono">{userId}</span>
            </p>
            <p className="text-white/60 text-sm mt-2">
              Згенеровано: {new Date().toLocaleDateString('uk-UA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PAGE 2 — WHEEL BALANCE (якщо є дані) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {wheelData && wheelData.length > 0 && (
        <div className="page-break h-[297mm] flex flex-col gap-8 pt-12">
          <div className="glassmorphism-card p-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl">
            <h2 className="text-4xl font-bold text-white mb-6">
              🎯 Колесо балансу
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {wheelData.map((item, idx) => (
                <WheelItem
                  key={idx}
                  area={item.area}
                  score={item.score}
                />
              ))}
            </div>
          </div>

          {/* Найслабша сфера */}
          <div className="glassmorphism-card p-6 backdrop-blur-xl bg-red-500/20 border border-red-400/30 rounded-2xl">
            <h3 className="text-xl font-semibold text-red-200 mb-2">
              ⚠️ Зона уваги
            </h3>
            <p className="text-white/80">
              {wheelData.reduce((min, curr) => curr.score < min.score ? curr : min).area}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PAGE 3 — ANSWERS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="page-break h-[297mm] flex flex-col gap-6 pt-12">
        <div className="glassmorphism-card p-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl">
          <h2 className="text-4xl font-bold text-white mb-6">
            📝 Твої відповіді
          </h2>
          
          <div className="space-y-4">
            {answers.map((answer, idx) => (
              <AnswerRow
                key={idx}
                questionId={answer.questionId}
                value={answer.value}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PAGE 4 — DECISIONS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="page-break h-[297mm] flex flex-col gap-6 pt-12">
        <div className="glassmorphism-card p-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl">
          <h2 className="text-4xl font-bold text-white mb-6">
            ⚡ Рішення системи
          </h2>
          
          <div className="space-y-4">
            {decisions.map((decision, idx) => (
              <DecisionCard
                key={idx}
                type={decision.type}
                message={decision.supportMessage}
                id={decision.id}
              />
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="glassmorphism-card p-6 backdrop-blur-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-2xl">
          <h3 className="text-2xl font-bold text-white mb-2">
            🚀 Наступний крок
          </h3>
          <p className="text-white/80">
            Система веде тебе до змін. Дотримуйся рішень.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MICRO COMPONENTS
═══════════════════════════════════════════════════════════════ */

const MetricCard: React.FC<{
  label: string;
  value: number;
  max: number;
  color: string;
}> = ({ label, value, max, color }) => (
  <div className="glassmorphism-card p-6 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl">
    <p className="text-white/60 text-sm mb-2">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-bold text-white">{value}</span>
      <span className="text-xl text-white/40">/ {max}</span>
    </div>
    
    {/* Progress Bar */}
    <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  </div>
);

const WheelItem: React.FC<{
  area: string;
  score: number;
}> = ({ area, score }) => {
  const getColor = (score: number) => {
    if (score >= 8) return 'from-green-400 to-emerald-600';
    if (score >= 5) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-rose-600';
  };

  return (
    <div className="glassmorphism-card p-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white font-medium">{area}</span>
        <span className="text-2xl font-bold text-white">{score}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColor(score)} rounded-full`}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
    </div>
  );
};

const AnswerRow: React.FC<{
  questionId: string;
  value: string | number;
}> = ({ questionId, value }) => (
  <div className="glassmorphism-card p-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
    <span className="text-white/80">{questionId}</span>
    <span className="text-white font-semibold font-mono">{value}</span>
  </div>
);

const DecisionCard: React.FC<{
  type: string;
  message?: string;
  id: string;
}> = ({ type, message, id }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'support': return 'from-green-400/20 to-emerald-600/20 border-green-400/30';
      case 'upsell': return 'from-purple-400/20 to-violet-600/20 border-purple-400/30';
      case 'task': return 'from-blue-400/20 to-cyan-600/20 border-blue-400/30';
      case 'redirect': return 'from-orange-400/20 to-amber-600/20 border-orange-400/30';
      default: return 'from-white/10 to-white/5 border-white/20';
    }
  };

  return (
    <div className={`glassmorphism-card p-5 backdrop-blur-xl bg-gradient-to-r ${getTypeColor(type)} border rounded-xl`}>
      <div className="flex items-start gap-3">
        <span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold text-white uppercase">
          {type}
        </span>
        <p className="text-white flex-1">
          {message || `Рішення #${id.slice(0, 8)}`}
        </p>
      </div>
    </div>
  );
};