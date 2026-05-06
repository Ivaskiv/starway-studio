// apps/web/src/features/landings/focus/components/Break.tsx

export default function Break() {
  return (
    <section id="break" className="focus-section focus-break">
      <div className="focus-break-glow" aria-hidden="true" />

      {/* HEADER — той самий паттерн що Problem */}
      <div className="focus-reveal">
        <div className="focus-subtitle">ЧОМУ ВСЕ ПОВТОРЮЄТЬСЯ?</div>
        <h2 className="focus-section-title">
          I СПРАВА НЕ В ТОМУ, ЩО ТИ
          <span className="focus-title-accent"> НЕ ЗНАЄШ</span>
          </h2>
      </div>

      {/* BODY */}
      <div className="focus-reveal">
        <p className="focus-break-body">
          Проблема в тому, що ти не доходиш до конкретного рішення —
          <br />і не закріплюєш його дією.
          Саме тому все повторюється.
        </p>

        <div className="focus-quote-glass focus-glass">
          <p className="focus-hero-inner-voice">
            Ти вже розумієш достатньо
          </p>
        </div>

        <div className="focus-break-divider" aria-hidden="true" />
      </div>

      {/* SHIFTS */}
      <div className="focus-break-shifts focus-reveal">
        <div className="focus-break-shift">
          <div className="focus-break-shift-from">
            <span className="focus-break-shift-label focus-break-shift-label--dim">Було</span>
            <span className="focus-break-shift-text">Мені треба ще знання</span>
          </div>
          <div className="focus-break-shift-arrow" aria-hidden="true">→</div>
          <div className="focus-break-shift-to">
            <span className="focus-break-shift-label focus-break-shift-label--bright">Стає</span>
            <span className="focus-break-shift-text focus-break-shift-text--bright">Мені потрібна дія</span>
          </div>
        </div>

        <div className="focus-break-shift">
          <div className="focus-break-shift-from">
            <span className="focus-break-shift-label focus-break-shift-label--dim">Було</span>
            <span className="focus-break-shift-text">Я ще не готова</span>
          </div>
          <div className="focus-break-shift-arrow" aria-hidden="true">→</div>
          <div className="focus-break-shift-to">
            <span className="focus-break-shift-label focus-break-shift-label--bright">Стає</span>
            <span className="focus-break-shift-text focus-break-shift-text--bright">Я роблю вибір цього тижня</span>
          </div>
        </div>

        <div className="focus-break-shift">
          <div className="focus-break-shift-from">
            <span className="focus-break-shift-label focus-break-shift-label--dim">Було</span>
            <span className="focus-break-shift-text">Я розумію, але не змінюю</span>
          </div>
          <div className="focus-break-shift-arrow" aria-hidden="true">→</div>
          <div className="focus-break-shift-to">
            <span className="focus-break-shift-label focus-break-shift-label--bright">Стає</span>
            <span className="focus-break-shift-text focus-break-shift-text--bright">Я закріплюю рішення дією</span>
          </div>
        </div>
      </div>

    </section>
  )
}