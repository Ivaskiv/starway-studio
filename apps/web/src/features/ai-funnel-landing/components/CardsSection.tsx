import type { CardItem } from '../types/landing.types';

interface CardsSectionProps {
  title: string;
  items: CardItem[];
}

export function CardsSection({ title, items }: CardsSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="liquid-h2">{title}</h2>
      <div className="liquid-grid-cards">
        {items.map((item) => (
          <article key={item.title} className="glass-panel">
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
