interface BuilderGuideSectionProps {
  steps: string[];
}

export function BuilderGuideSection({ steps }: BuilderGuideSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="liquid-h2">Для власника: старт конструктора (11 кроків)</h2>
      <article className="glass-panel">
        <p className="mb-3">
          Кожен крок має <strong>3 генерації</strong>. Невикористані генерації переносяться на наступний крок.
          Підсумок: власне колесо, автоматичний аналіз, звіти, Telegram і miniapp.
        </p>
        <ol className="liquid-list liquid-ordered">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </article>
    </section>
  );
}
