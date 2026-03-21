import type { PlanTier } from '../types/landing.types';

interface PricingSectionProps {
  plans: PlanTier[];
  onSelect: (planId: string) => void;
}

export function PricingSection({ plans, onSelect }: PricingSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="liquid-h2">Обирай тариф</h2>
      <div className="liquid-grid-two">
        {plans.map((plan) => (
          <article key={plan.id} className="glass-panel">
            <h3>{plan.name}</h3>
            <p className="liquid-price">
              <span>{plan.price}</span>
              <small>{plan.oldPrice}</small>
            </p>
            <ul className="liquid-list">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button className="liquid-btn liquid-btn-primary" onClick={() => onSelect(plan.id)}>
              Отримати доступ
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
