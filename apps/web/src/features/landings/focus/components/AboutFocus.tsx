// apps/web/src/features/landings/focus/components/AboutFocus.tsx

import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'

import focusImg1Desktop from '../assets/img-focus/focus-img1-desktop.webp'
import focusImg1Mobile from '../assets/img-focus/focus-img1-mobile.webp'
import focusImg1Mobile2x from '../assets/img-focus/focus-img1-mobile@2x.webp'
import focusImg1Tablet from '../assets/img-focus/focus-img1-tablet.webp'
import focusImg1Tablet2x from '../assets/img-focus/focus-img1-tablet@2x.webp'

function FocusImage1({ className }: { className?: string }) {
  return (
    <picture>
      <source
        media="(max-width: 680px)"
        srcSet={`${focusImg1Mobile} 1x, ${focusImg1Mobile2x} 2x`}
      />

      <source
        media="(max-width: 1100px)"
        srcSet={`${focusImg1Tablet} 1x, ${focusImg1Tablet2x} 2x`}
      />

      <img
        src={focusImg1Desktop}
        alt=""
        className={className}
        decoding="async"
      />
    </picture>
  )
}

export default function AboutFocus() {
  const {
    subtitlesection,
    title,
    text,
    listTitle,
    items,
    note,
  } = FOCUS_PAGE.aboutfocus

  return (
    <section
      id="about"
      className="focus-section o-ambient o-ambient--center"
      data-reveal
    >
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

      <div
        className="focus-container focus-reveal"
        data-reveal
        data-reveal-delay="3"
      >
        <div className="focus-about-shell">
          <div className="focus-about-content">
            <div className="focus-card stack">
              {text.map((item: string, i: number) => (
                <p
                  key={i}
                  className="focus-note-secondary"
                >
                  {item}
                </p>
              ))}

              <p className="focus-note-primary">
                {listTitle}
              </p>

              <ul className="focus-detail-list stack">
                {items.map((item: string, i: number) => (
                  <li
                    key={i}
                    className="focus-list-item"
                  >
                    <span className="focus-list-item__marker" />

                    <span className="focus-list-item__text">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="focus-about-image-wrap"
            aria-hidden="true"
          >
            <FocusImage1 className="focus-about-image" />
          </div>

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
      </div>
    </section>
  )
}