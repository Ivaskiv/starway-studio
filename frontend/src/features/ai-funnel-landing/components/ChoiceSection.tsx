import type { LandingChoice } from '../types/landing.types';

interface ChoiceSectionProps {
  onChoose: (choice: LandingChoice) => void;
}

export function ChoiceSection({ onChoose }: ChoiceSectionProps) {
  return (
    <section className="liquid-grid-two">
      <article className="glass-panel">
        <h3>Я користувач продукту</h3>
        <p>Проходжу практикум, отримую аналіз, звіти, Telegram-нагадування та miniapp.</p>
        <button onClick={() => onChoose('user')} className="liquid-btn liquid-btn-primary">Почати як користувач</button>
      </article>
      <article className="glass-panel">
        <h3>Я власник AI-воронки</h3>
        <p>Створюю свої продукти, сценарії та miniapp за модульною схемою.</p>
        <button onClick={() => onChoose('builder')} className="liquid-btn liquid-btn-ghost">Почати як власник</button>
      </article>
    </section>
  );
}
