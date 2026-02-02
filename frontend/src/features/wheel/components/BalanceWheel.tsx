// frontend/src/features/wheel/components/BalanceWheel.tsx
import React from 'react';
import type { WheelScore, WheelCategory } from '@/features/wheel/types/wheel.types';
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';

interface BalanceWheelProps {
  scores: WheelScore[];           // масив оцінок користувача
  maxScore?: number;              // макс. значення (0-10)
}

export const BalanceWheel: React.FC<BalanceWheelProps> = ({ scores, maxScore = 10 }) => {
  const categories: WheelCategory[] = WHEEL_CATEGORIES;
  const points = categories.length;
  const radius = 100;
  const centerX = 120;
  const centerY = 120;

  // Зіставляємо оцінки з категоріями
  const getScoreForCategory = (id: string) => {
    const found = scores.find(s => s.category_id === id);
    return found?.score ?? 0;
  };

  // Генеруємо точки полігону
  const generatePoints = (values: number[]) =>
    values.map((score, i) => {
      const ratio = score / maxScore;
      const angle = (i * 2 * Math.PI) / points - Math.PI / 2;
      const r = radius * ratio;
      return {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      };
    });

  const userScores = categories.map(c => getScoreForCategory(c.id));
  const polygonPoints = generatePoints(userScores);
  const maxPolygonPoints = generatePoints(Array(points).fill(maxScore));

  return (
    <div className="relative w-64 h-64 mx-auto p-4 rounded-2xl glassmorphism shadow-lg">
      <svg width="240" height="240" viewBox="0 0 240 240" className="absolute inset-0">
        <defs>
          <linearGradient id="polygonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#ec4899" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.4" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Сітка */}
        <polygon
          points={maxPolygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        {maxPolygonPoints.map((p, i) => (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}

        {/* Основний полігон */}
        <polygon
          points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="url(#polygonGradient)"
          stroke="#a855f7"
          strokeWidth="3"
          filter="url(#glow)"
          className="transition-all duration-700"
        />

        {/* Точки на вершинах */}
        {polygonPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#ffffff"
            stroke="#a855f7"
            strokeWidth="2"
            className="transition-all duration-700"
          />
        ))}

        {/* Центр */}
        <circle cx={centerX} cy={centerY} r="6" fill="#f97316" filter="url(#glow)" />
      </svg>

      {/* Емоджі навколо */}
      {categories.map((c, i) => {
        const angle = (i * 2 * Math.PI) / points - Math.PI / 2;
        const r = radius + 20;
        return (
          <div
            key={c.id}
            className="absolute text-2xl transition-transform hover:scale-125"
            style={{
              left: centerX + r * Math.cos(angle) - 16,
              top: centerY + r * Math.sin(angle) - 16,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {c.emoji}
          </div>
        );
      })}

      {/* Центральний скор */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-4xl font-bold text-white">
            {Math.round(userScores.reduce((a, b) => a + b, 0) / points)}
          </div>
          <div className="text-xs text-white/60">середній бал</div>
        </div>
      </div>
    </div>
  );
};
