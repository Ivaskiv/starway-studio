import { useMemo } from 'react'

import CounterRow from '../components/CounterRow'
import LeadForm from '../components/LeadForm'
import OfferCard from '../components/OfferCard'
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import SocialProofRow from '../components/SocialProofRow'
import {
  abTestLandingAuthor,
  abTestLandingBottomStatement,
  abTestLandingButton,
  abTestLandingBullets,
  abTestLandingCtaHook,
  abTestLandingHero,
  abTestLandingInput,
  abTestLandingLogo,
  abTestLandingOffer,
  abTestLandingProof,
  abTestLandingStats,
  abTestLandingValueStrip,
} from '../config'

type HeroSectionProps = {
  phone: string
  onPhoneChange: (value: string) => void
  onPrimaryAction: () => void
}

export default function HeroSection({
  phone,
  onPhoneChange,
  onPrimaryAction,
}: HeroSectionProps) {
  const hook = useMemo(() => {
    const variants = [
      {
        headline: abTestLandingHero.headline,
        subheadline: abTestLandingHero.subheadline,
      },
      ...abTestLandingHero.variantHeadlines,
    ]

    return variants[Math.floor(Math.random() * variants.length)] ?? variants[0]
  }, [])

  return (
    <div className="shell">
      <div className="logo-bar">
        <div className="logo-gem" aria-hidden="true">
          <svg viewBox="0 0 14 14">
            <polygon points="7,1 13,4.5 13,9.5 7,13 1,9.5 1,4.5" />
          </svg>
        </div>
        <span className="logo-text">{abTestLandingLogo.label}</span>
      </div>

      <div className="hero">
        <div className="hero-card">
          <div className="hero-pill">
            <div className="pill-dot" />
            <span>{abTestLandingHero.badge}</span>
          </div>

          <div
            className="hook-text"
            dangerouslySetInnerHTML={{ __html: hook.headline }}
          />
          <div
            className="hero-outcome"
            dangerouslySetInnerHTML={{ __html: hook.subheadline }}
          />

          <div className="value-strip">
            {abTestLandingValueStrip.map((item) => (
              <div key={item.title} className="vs-item">
                <div className="vs-icon" aria-hidden="true">
                  {item.icon}
                </div>
                <div className="vs-label">
                  <b>{item.title}</b>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SocialProofRow
        leftBadge={abTestLandingProof.leftBadge}
        leftText={abTestLandingProof.leftText}
        rightTag={abTestLandingProof.rightTag}
        rightQuote={`"${abTestLandingProof.rightQuote}"`}
        rightWho={abTestLandingProof.rightWho}
      />

      <CounterRow items={abTestLandingStats} />

      <div className="bullets">
        {abTestLandingBullets.map((bullet) => (
          <div key={bullet} className="bullet">
            <div className="bdot" aria-hidden="true" />
            <span>{bullet}</span>
          </div>
        ))}
      </div>

      <div className="offer-wrap">
        <OfferCard
          emoji={abTestLandingOffer.emoji}
          title={abTestLandingOffer.title}
          subtitle={abTestLandingOffer.subtitle}
          oldPrice={abTestLandingOffer.oldPrice}
          newPrice={abTestLandingOffer.newPrice}
        />
      </div>

      <div
        className="cta-hook"
        dangerouslySetInnerHTML={{ __html: abTestLandingCtaHook.text }}
      />

      <LeadForm
        label={abTestLandingInput.label}
        placeholder={abTestLandingInput.placeholder}
        phone={phone}
        onPhoneChange={onPhoneChange}
      />

      <div className="btn-wrap">
        <PrimaryCtaButton
          label={abTestLandingButton.label}
          onClick={onPrimaryAction}
        />
        <div className="trust-line">{abTestLandingButton.trustLine}</div>
      </div>

      <div className="author">
        <div className="author-ava">{abTestLandingAuthor.initials}</div>
        <div className="author-info">
          <div className="author-name">
            <b>{abTestLandingAuthor.name}</b> · {abTestLandingAuthor.surname}
          </div>
          <div className="author-role">{abTestLandingAuthor.role}</div>
        </div>
        <span className="not-you">{abTestLandingAuthor.linkLabel}</span>
      </div>

      <div className="bottom-stmt">
        <p
          dangerouslySetInnerHTML={{
            __html: abTestLandingBottomStatement.text,
          }}
        />
      </div>

      <div className="safe" />
    </div>
  )
}
