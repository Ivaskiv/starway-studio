// apps/web/src/features/landings/focus/components/Fit.tsx
import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import FocusImage, { type FocusImageSrc } from './FocusImage'

import focusImg2Desktop from '../assets/img-focus/focus-img2-desktop.webp'
import focusImg2Mobile from '../assets/img-focus/focus-img2-mobile.webp'
import focusImg2Mobile2x from '../assets/img-focus/focus-img2-mobile@2x.webp'
import focusImg2Tablet from '../assets/img-focus/focus-img2-tablet.webp'
import focusImg2Tablet2x from '../assets/img-focus/focus-img2-tablet@2x.webp'

import focusImg3Desktop from '../assets/img-focus/focus-img3-desktop.webp'
import focusImg3Mobile from '../assets/img-focus/focus-img3-mobile.webp'
import focusImg3Mobile2x from '../assets/img-focus/focus-img3-mobile@2x.webp'
import focusImg3Tablet from '../assets/img-focus/focus-img3-tablet.webp'
import focusImg3Tablet2x from '../assets/img-focus/focus-img3-tablet@2x.webp'

import focusImg4Desktop from '../assets/img-focus/focus-img4-desktop.webp'
import focusImg4Mobile from '../assets/img-focus/focus-img4-mobile.webp'
import focusImg4Mobile2x from '../assets/img-focus/focus-img4-mobile@2x.webp'
import focusImg4Tablet from '../assets/img-focus/focus-img4-tablet.webp'
import focusImg4Tablet2x from '../assets/img-focus/focus-img4-tablet@2x.webp'

import focusImg5Desktop from '../assets/img-focus/focus-img5-desktop.webp'
import focusImg5Mobile from '../assets/img-focus/focus-img5-mobile.webp'
import focusImg5Mobile2x from '../assets/img-focus/focus-img5-mobile@2x.webp'
import focusImg5Tablet from '../assets/img-focus/focus-img5-tablet.webp'
import focusImg5Tablet2x from '../assets/img-focus/focus-img5-tablet@2x.webp'

import focusImg6Desktop from '../assets/img-focus/focus-img6-desktop.webp'
import focusImg6Mobile from '../assets/img-focus/focus-img6-mobile.webp'
import focusImg6Mobile2x from '../assets/img-focus/focus-img6-mobile@2x.webp'
import focusImg6Tablet from '../assets/img-focus/focus-img6-tablet.webp'
import focusImg6Tablet2x from '../assets/img-focus/focus-img6-tablet@2x.webp'

const FIT_IMAGES: FocusImageSrc[] = [
  {
    mobile: focusImg2Mobile,
    mobile2x: focusImg2Mobile2x,
    tablet: focusImg2Tablet,
    tablet2x: focusImg2Tablet2x,
    desktop: focusImg2Desktop,
  },
  {
    mobile: focusImg3Mobile,
    mobile2x: focusImg3Mobile2x,
    tablet: focusImg3Tablet,
    tablet2x: focusImg3Tablet2x,
    desktop: focusImg3Desktop,
  },
  {
    mobile: focusImg4Mobile,
    mobile2x: focusImg4Mobile2x,
    tablet: focusImg4Tablet,
    tablet2x: focusImg4Tablet2x,
    desktop: focusImg4Desktop,
  },
  {
    mobile: focusImg5Mobile,
    mobile2x: focusImg5Mobile2x,
    tablet: focusImg5Tablet,
    tablet2x: focusImg5Tablet2x,
    desktop: focusImg5Desktop,
  },
  {
    mobile: focusImg6Mobile,
    mobile2x: focusImg6Mobile2x,
    tablet: focusImg6Tablet,
    tablet2x: focusImg6Tablet2x,
    desktop: focusImg6Desktop,
  },
]

export default function Fit() {
  const { subtitlesection, title, items } = FOCUS_PAGE.fit

  return (
    <section
      id="fit"
      className="focus-section stack o-ambient o-ambient--center"
      data-reveal
    >
      <div className="focus-container focus-reveal stack">
        {subtitlesection && (
          <div className="focus-section-eyebrow">{subtitlesection}</div>
        )}

        <h2 className="focus-section-title">{title}</h2>
      </div>

      <div className="focus-container focus-reveal">
        <div
          className="lp-chess lp-chess--fit" 
        >
          {items.map((item: string, i: number) => (
            <article key={item} className="fit-card">
              <div className="ls-media">
                {FIT_IMAGES[i] && (
                  <FocusImage src={FIT_IMAGES[i]} className="fit-card-img" />
                )}
              </div>

              <div className="ls-body fit-card-body">
                <span className="focus-item-num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="fit-card-text">{item}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
