import { FOCUS_PAGE } from "@/features/landings/focus/content/focus.content"

export default function Footer() {
  const { brand, accent, copy } = FOCUS_PAGE.footer
  const [brandStart = brand, brandEnd = ''] = brand.split(accent)

  return (
    <footer className="focus-footer">
      {/* SECTION CONTENT START */}
      <div className="focus-nav-logo">
        {brandStart}
        <span className="focus-nav-logo-accent">{accent}</span>
        {brandEnd}
      </div>
      <p className="focus-footer-copy">{copy}</p>
      {/* SECTION CONTENT END */}
    </footer>
  )
}
