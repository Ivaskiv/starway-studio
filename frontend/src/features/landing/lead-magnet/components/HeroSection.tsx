// frontend/src/features/lead-magnet/components/HeroSection.tsx

// Геометрична SVG-мережа (як на скріні — вузлові лінії + точки)
function GeometricLines() {
  return (
    <svg
      className="lm-hero-geo"
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="nodeGlowH" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.15" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Central glowing node */}
      <circle cx="420" cy="370" r="60" fill="url(#nodeGlowH)" />
      <circle cx="420" cy="370" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <circle cx="420" cy="370" r="4"  fill="rgba(255,255,255,0.9)" />

      {/* Lines from center */}
      <line x1="420" y1="370" x2="750"  y2="80"  stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
      <line x1="420" y1="370" x2="1100" y2="200" stroke="rgba(255,255,255,0.2)"  strokeWidth="1" />
      <line x1="420" y1="370" x2="900"  y2="420" stroke="rgba(255,255,255,0.2)"  strokeWidth="1" />
      <line x1="420" y1="370" x2="1050" y2="580" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <line x1="420" y1="370" x2="600"  y2="650" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

      {/* Secondary nodes */}
      <circle cx="750"  cy="80"  r="2.5" fill="rgba(255,255,255,0.55)" />
      <circle cx="1100" cy="200" r="2"   fill="rgba(255,255,255,0.4)"  />
      <circle cx="900"  cy="420" r="2"   fill="rgba(255,255,255,0.35)" />

      {/* Cross-connections */}
      <line x1="750" y1="80" x2="1100" y2="200" stroke="rgba(255,255,255,0.13)" strokeWidth="0.8" />
      <line x1="750" y1="80" x2="900"  y2="420" stroke="rgba(255,255,255,0.1)"  strokeWidth="0.8" />
    </svg>
  )
}

export function HeroSection() {
  const scrollToForm = () => {
    document.getElementById('lm-cta-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="lm-hero">
      {/* Layer 0: background gradients */}
      <div className="lm-hero-bg-radial-left"  aria-hidden="true" />
      <div className="lm-hero-bg-radial-right" aria-hidden="true" />

      {/* Layer 1: geometric network */}
      <GeometricLines />

      {/* Layer 2: фото справа */}
      <div className="lm-hero-photo-wrap" aria-hidden="true">
        <div className="lm-hero-photo-fade-left" />
        <div className="lm-hero-photo-fade-bottom" />
        <img
          src="/images/img5tochok/3.png"
          alt="Nadya Starway"
          className="lm-hero-photo"
        />
      </div>

      {/* Layer 3: УРОК 1 badge — top center */}
      <div className="lm-hero-badge-wrap">
        <div className="lm-hero-badge">УРОК 1</div>
      </div>

      {/* Layer 4: content — left */}
      <div className="lm-hero-content">
        <h1 className="lm-hero-title">
          ЯК ЗА 24 ГОДИНИ ПОБАЧИТИ,<br />
          ЩО РЕАЛЬНО КЕРУЄ ТВОЄЮ<br />
          ПОВЕДІНКОЮ
        </h1>

        {/* Welcome glass card */}
        <div className="lm-hero-welcome">
          <p className="lm-hero-welcome-title">
            ВІТАЮ НА<br />ПРАКТИКУМІ
          </p>
          <p className="lm-hero-welcome-sub">У тебе 5 днів та три життя</p>
          <div className="lm-hero-hearts" aria-label="три серця">
            <span className="lm-heart lm-heart--1">❤️</span>
            <span className="lm-heart lm-heart--2">❤️</span>
            <span className="lm-heart lm-heart--3">❤️</span>
          </div>
        </div>
      </div>
    </section>
  )
}