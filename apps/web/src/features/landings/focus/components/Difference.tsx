import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import FocusImage, { type FocusImageSrc } from './FocusImage'

import focusImg7Desktop from '../assets/img-focus/focus-img7-desktop.webp'
import focusImg7Desktop2x from '../assets/img-focus/focus-img7-desktop@2x.webp'
import focusImg7Mobile from '../assets/img-focus/focus-img7-mobile.webp'
import focusImg7Mobile2x from '../assets/img-focus/focus-img7-mobile@2x.webp'
import focusImg7Tablet from '../assets/img-focus/focus-img7-tablet.webp'
import focusImg7Tablet2x from '../assets/img-focus/focus-img7-tablet@2x.webp'

const src: FocusImageSrc = {
  mobile: focusImg7Mobile,
  mobile2x: focusImg7Mobile2x,
  tablet: focusImg7Tablet,
  tablet2x: focusImg7Tablet2x,
  desktop: focusImg7Desktop,
}

export default function Difference() {
  const {
    subtitlesection,
    title,
    note,
    items,
  } = FOCUS_PAGE.difference

  return (
    <section
      id="difference"
      className="focus-section o-ambient o-ambient--center"
      data-reveal
    >
      {/* HEADER */}
      <div
        className="focus-container stack focus-reveal"
        data-reveal
        data-reveal-delay="1"
      >
        <div className="focus-section-eyebrow">
          {subtitlesection}
        </div>

        <h2
          className="focus-section-title"
          data-reveal
          data-reveal-delay="2"
        >
          {title}
        </h2>
      </div>

      {/* MAIN CONTENT */}
      <div
        className="focus-container focus-reveal"
        data-reveal
        data-reveal-delay="3"
      >
        <div className="focus-about-shell">
          {/* LEFT CONTENT */}
          <div className="focus-about-content">
            <ul className="focus-detail-list stack">
              {items.map((item: string, i: number) => (
                <li
                  key={i}
                  className="focus-list-item focus-glass-item"
                >
                  <span
                    className="focus-list-item__marker"
                    aria-hidden="true"
                  />

                  <span className="focus-list-item__text">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT IMAGE */}
          <div
            className="focus-about-image-wrap"
            aria-hidden="true"
          >
            <FocusImage
              src={src}
              className="focus-about-image"
            />
          </div>
        </div>

        {/* NOTE */}
          {note && (
            <div
              className="focus-about-note-row focus-reveal"
              data-reveal
              data-reveal-delay="4"
            >
              <div className="focus-quote-glass">
                <div className="focus-note">
                  <p className="focus-note-primary">
                    {note[0]}
                  </p>

                  {note[1] && (
                    <p className="focus-note-secondary">
                      {note[1]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>
    </section>
  )
}
