import { useState } from 'react'

import { PreviewStatusBadge } from './PreviewStatusBadge'
import type { PreviewStatus } from './types'

export function StoriesPreview({
  slides,
  cta,
  status,
}: {
  slides: string[]
  cta?: string
  status: PreviewStatus
}) {
  const preparedSlides = slides.length > 0 ? slides.slice(0, 4) : ['Story slide preview']
  const [activeSlide, setActiveSlide] = useState(0)
  const slide = preparedSlides[activeSlide] ?? preparedSlides[0]

  return (
    <div className="cp-frame cp-frame--stories">
      <div className="cp-phone cp-phone--stories">
        <div className="cp-stories-head">
          <div className="cp-stories-progress">
            {preparedSlides.map((entry, index) => (
              <button
                key={entry}
                type="button"
                onClick={() => setActiveSlide(index)}
                className={`cp-stories-progress-bar ${index === activeSlide ? 'is-active' : ''}`}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
          <PreviewStatusBadge status={status} />
        </div>
        <div className="cp-stories-canvas">
          <div className="cp-stories-slide">{slide}</div>
          <div className="cp-stories-swipe">{cta || 'Swipe / Написати "СТАРТ"'}</div>
        </div>
      </div>
    </div>
  )
}
