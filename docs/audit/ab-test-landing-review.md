# AB Test Landing Review

## Component map before changes

- `AbTestLandingRouteView` → route wrapper only.
- `AbTestLandingLayout` → SEO/meta injection, viewport, assistant overlay suppression, global landing shell.
- `AbTestLandingPage` → holds `phone` state and Telegram CTA action.
- `HeroSection` → assembles the full landing from `landing.config.ts`.
- `HeroSection` children:
  - `SocialProofRow`
  - `CounterRow`
  - `OfferCard`
  - `LeadForm`
  - `PrimaryCtaButton`
- Source of truth for all copy, CTA labels and SEO remained `apps/web/src/features/ab-test-landing/config/landing.config.ts`.

## Style map before changes

- `index.scss` → imports and base page/body rules.
- `_variables.scss` → AB landing tokens and forwarded shared variables.
- `_mixins.scss` → forwarded shared breakpoint/layout mixins.
- `_hero.scss` → nearly all real landing styles, including hero, proof, counters, CTA, form and footer statement.
- `_responsive.scss` → width caps and repeated breakpoint overrides.
- `_form.scss`, `_cta.scss`, `_social-proof.scss` → placeholders only.

## 1. What was the problem

- The landing behaved like a narrow centered card because `.shell` was capped around `390px`, with only minor breakpoint growth.
- Desktop and laptop viewports wasted large amounts of horizontal space.
- Tablet breakpoints mostly preserved the mobile card instead of using available width.
- Responsive logic was split between a hard width cap and repeated padding overrides.
- Motion and decorative effects were slightly heavier than needed for a conversion-first first screen.

## 2. What was optimized

- Rebuilt the layout as a fluid, mobile-first grid using `clamp()` and viewport-aware spacing instead of fixed shell widths.
- Kept the same content order on mobile, then promoted the same blocks into a two-column desktop composition with CSS grid only.
- Increased usable width on tablet, laptop and desktop without stretching content unnaturally.
- Tightened first-screen rhythm on phones: more balanced typography, denser but readable spacing, clearer CTA focus.
- Consolidated repeated section paddings into shared fluid shell variables.
- Reduced animation overhead by removing per-child stagger timing and adding `prefers-reduced-motion` handling.
- Replaced the locked viewport meta with `viewport-fit=cover` to better support modern mobile screens and safe areas.

## 3. What stayed unchanged

- All copy, CTA text, SEO text and marketing structure remain in `landing.config.ts`.
- The funnel sequence did not change: hero → proof → stats → bullets → offer → CTA hook → phone input → CTA button → author → bottom statement.
- Telegram action behavior did not change.
- Random headline variant behavior did not change.

## 4. Which styles were removed

- Hard shell width constraint (`390px` / `430px` style behavior) was removed.
- Repeated mobile padding overrides in `_responsive.scss` were removed.
- Child-by-child stagger animation delay rules in `_hero.scss` were removed.
- The legacy `maximum-scale=1.0` viewport lock was removed from layout meta handling.
- The old `safe` spacer dependency was effectively retired in favor of shell padding with safe-area support.

## 5. Which styles were merged

- Shared section side paddings are now driven by one fluid gutter variable.
- Shared surface treatment for proof cards, offer card, input and author block is consolidated.
- Breakpoint logic is now primarily expressed in `_hero.scss` around the actual layout, with `_responsive.scss` reduced to small, complementary overrides.
- Card radii, paddings and vertical rhythm now use common fluid variables instead of one-off values.

## 6. Which components were simplified

- `HeroSection` now hoists headline variants once instead of rebuilding the variants array on every render.
- `LeadForm` now uses a real `<label>` + `htmlFor` pairing for cleaner markup and accessibility.
- No content props were moved out of `landing.config.ts`; components still read config-derived values only.

## 7. Why the changes are safe

- The DOM structure and component boundaries are almost unchanged; the main upgrade is CSS layout orchestration.
- No texts, offers, CTA labels, SEO fields or deep links were duplicated or relocated.
- Desktop scaling is achieved through CSS grid placement, not through conditional rendering or alternate content paths.
- Mobile remains the default linear flow, so behavioral regressions are low risk.

## 8. Confirmation of compatibility

- Functionality remains the same.
- Funnel logic remains the same.
- Content source of truth remains `apps/web/src/features/ab-test-landing/config/landing.config.ts`.
- The work is an incremental senior-level refinement, not a redesign or rewrite.

## Files touched in this review

- `apps/web/src/features/ab-test-landing/styles/_hero.scss`
- `apps/web/src/features/ab-test-landing/styles/_responsive.scss`
- `apps/web/src/features/ab-test-landing/components/LeadForm.tsx`
- `apps/web/src/features/ab-test-landing/sections/HeroSection.tsx`
- `apps/web/src/features/ab-test-landing/page/AbTestLandingLayout.tsx`

## Validation plan

- Lint
- Typecheck
- Build
- Visual viewport check targets: `320px`, `375px`, `390px`, `768px`, `1024px`, `1440px`, `1920px`
