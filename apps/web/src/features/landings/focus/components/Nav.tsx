import { FOCUS_PAGE } from "@/features/landings/focus/content/focus.content";

export default function Nav() {
  return (
    <nav className="focus-nav">
      <div className="focus-nav-pill">
        <span className="focus-nav-pill-dot" aria-hidden="true" />
        <span className="focus-nav-pill-text">
          {FOCUS_PAGE.nav.pill}
        </span>
      </div>

    </nav>
  )
}
