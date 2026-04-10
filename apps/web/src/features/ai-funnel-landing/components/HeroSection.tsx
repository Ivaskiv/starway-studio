import type { HeroContent } from '../types/landing.types';

interface HeroSectionProps {
  content: HeroContent;
  onPrimary: () => void;
  onSecondary: () => void;
}

export function HeroSection({ content, onPrimary, onSecondary }: HeroSectionProps) {
  return (
    <section className="liquid-hero glass-panel">
      <p className="liquid-eyebrow">{content.eyebrow}</p>
      <h1>{content.title}</h1>
      <p className="liquid-subtitle">{content.subtitle}</p>

      <ul className="liquid-bullets">
        {content.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="liquid-actions">
        <button onClick={onPrimary} className="liquid-btn liquid-btn-primary">Пройти практикум</button>
        <button onClick={onSecondary} className="liquid-btn liquid-btn-ghost">Створити свою воронку</button>
      </div>
    </section>
  );
}
