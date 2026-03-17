/**
 * AvaHead — shared Ava avatar component.
 * Used in AssistantBubble (chat row) and AssistantPanel (header).
 *
 * Animations are defined in:
 *   src/styles/components/assistantBubble.scss
 *
 * Classes consumed:
 *   .ava-float   .ava-blink-l   .ava-blink-r
 *   .ava-lash-l  .ava-lash-r
 *   .ava-shine-l .ava-shine-r
 */

interface AvaHeadProps {
  /** px width of the rendered SVG (height scales proportionally) */
  width?: number
}

export function AvaHead({ width = 44 }: AvaHeadProps) {
  const height = Math.round(width * (42 / 44))

  return (
    <svg
      viewBox="12 28 96 90"
      width={width}
      height={height}
      className="ava-head"
      fill="none"
    >
      <defs>
        <radialGradient id="ava-skin" cx="44%" cy="32%" r="66%">
          <stop offset="0%" stopColor="#fde8d2" />
          <stop offset="100%" stopColor="#e8a070" />
        </radialGradient>

        <linearGradient id="ava-hair" x1="0" y1="0" x2=".05" y2="1">
          <stop offset="0%" stopColor="#14141e" />
          <stop offset="100%" stopColor="#090910" />
        </linearGradient>

        <linearGradient id="ava-lips" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d91a1a" />
          <stop offset="100%" stopColor="#8a0e0e" />
        </linearGradient>

        <clipPath id="ava-eyeL">
          <ellipse cx="46" cy="59" rx="9" ry="7" />
        </clipPath>
        <clipPath id="ava-eyeR">
          <ellipse cx="74" cy="59" rx="9" ry="7" />
        </clipPath>
      </defs>

      {/* soft bg glow — makes dark hair visible on dark UI */}
      <ellipse cx="60" cy="62" rx="38" ry="44" fill="rgba(210,195,255,0.28)" />

      {/* ── hair back + bob volume ── */}
      <path
        d="M19,57 L17,42 Q14,18 32,10 Q44,3 60,3 Q76,3 88,10 Q106,18 103,42 L101,57 Q96,36 60,36 Q24,36 19,57Z"
        fill="url(#ava-hair)"
      />
      {/* fringe — straight horizontal cut */}
      <path
        d="M24,43 Q35,38 60,38 Q85,38 96,43 Q85,40 60,40 Q35,40 24,43Z"
        fill="#0f0f18"
      />
      <path
        d="M24,43.5 Q44,40.5 60,40.5 Q76,40.5 96,43.5"
        stroke="#0b0b12"
        strokeWidth="2.5"
        fill="none"
      />
      {/* side bob panels */}
      <path d="M20,46 L18,70 Q18,80 23,84 Q26,86 27.5,83.5 Q28,74 27,60Z" fill="#0f0f18" />
      <path d="M100,46 L102,70 Q102,80 97,84 Q94,86 92.5,83.5 Q92,74 93,60Z" fill="#0f0f18" />

      {/* ── face — slim model oval ── */}
      <path
        d="M33,53 Q30,43 30,61 Q30,86 40,97 Q48,105 60,106 Q72,105 80,97 Q90,86 90,61 Q90,43 87,53 Q82,41 60,41 Q38,41 33,53Z"
        fill="url(#ava-skin)"
      />

      {/* ── brows ── */}
      <path d="M35,50 Q41,46.5 50,48" stroke="#18100a" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M70,48 Q79,46.5 85,50" stroke="#18100a" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* ── glasses — thick rectangular frames (like in reference photo) ── */}
      <rect x="30" y="48" width="32" height="18" rx="4"
        fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.9" />
      <rect x="60" y="48" width="32" height="18" rx="4"
        fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.9" />
      {/* nose bridge */}
      <path d="M59,57 Q60,55.5 61,57" stroke="#0d0d1e" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* lens shine — animated via .ava-shine-l / .ava-shine-r */}
      <line x1="34" y1="51" x2="44" y2="55"
        stroke="rgba(255,255,255,.25)" strokeWidth="1" strokeLinecap="round"
        className="ava-shine-l" />
      <line x1="66" y1="51" x2="76" y2="55"
        stroke="rgba(255,255,255,.25)" strokeWidth="1" strokeLinecap="round"
        className="ava-shine-r" />

      {/* ── eye whites ── */}
      <ellipse cx="46" cy="59" rx="9" ry="7" fill="#fefcfa" />
      <ellipse cx="74" cy="59" rx="9" ry="7" fill="#fefcfa" />

      {/* ── left eye — blinks via .ava-blink-l ── */}
      <g clipPath="url(#ava-eyeL)" className="ava-blink-l">
        <ellipse cx="46" cy="59" rx="9" ry="7" fill="#fefcfa" />
        <circle cx="46"   cy="59"   r="5.5" fill="#5a3215" />
        <circle cx="46"   cy="59"   r="3.8" fill="#280e06" />
        <circle cx="46"   cy="59"   r="2"   fill="#0c0704" />
        <circle cx="48.6" cy="56.8" r="1.7" fill="white"   opacity=".88" />
        <circle cx="44"   cy="61"   r=".65" fill="white"   opacity=".28" />
      </g>
      {/* left lashes — drop via .ava-lash-l */}
      <g className="ava-lash-l">
        <path d="M37,53.5 Q41,50 46,49.5 Q51,50 55,53.5 Q50,52 46,52 Q42,52 37,53.5Z" fill="#0c0818" />
        <line x1="39"   y1="53"   x2="36.5" y2="48"   stroke="#0c0818" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="41"   y1="51.5" x2="39.5" y2="46.5" stroke="#0c0818" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="43.5" y1="50.5" x2="42.5" y2="45.5" stroke="#0c0818" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="46"   y1="50"   x2="46"   y2="45"   stroke="#0c0818" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="48.5" y1="50.5" x2="50"   y2="45.5" stroke="#0c0818" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="51"   y1="51.5" x2="52.5" y2="46.5" stroke="#0c0818" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="53.5" y1="53"   x2="56"   y2="48"   stroke="#0c0818" strokeWidth="1.1" strokeLinecap="round" />
      </g>

      {/* ── right eye — blinks via .ava-blink-r ── */}
      <g clipPath="url(#ava-eyeR)" className="ava-blink-r">
        <ellipse cx="74" cy="59" rx="9" ry="7" fill="#fefcfa" />
        <circle cx="74"   cy="59"   r="5.5" fill="#5a3215" />
        <circle cx="74"   cy="59"   r="3.8" fill="#280e06" />
        <circle cx="74"   cy="59"   r="2"   fill="#0c0704" />
        <circle cx="76.6" cy="56.8" r="1.7" fill="white"   opacity=".88" />
        <circle cx="72"   cy="61"   r=".65" fill="white"   opacity=".28" />
      </g>
      {/* right lashes — drop via .ava-lash-r */}
      <g className="ava-lash-r">
        <path d="M65,53.5 Q69,50 74,49.5 Q79,50 83,53.5 Q78,52 74,52 Q70,52 65,53.5Z" fill="#0c0818" />
        <line x1="67"   y1="53"   x2="64.5" y2="48"   stroke="#0c0818" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="69"   y1="51.5" x2="67.5" y2="46.5" stroke="#0c0818" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="71.5" y1="50.5" x2="70.5" y2="45.5" stroke="#0c0818" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="74"   y1="50"   x2="74"   y2="45"   stroke="#0c0818" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="76.5" y1="50.5" x2="78"   y2="45.5" stroke="#0c0818" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="79"   y1="51.5" x2="80.5" y2="46.5" stroke="#0c0818" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="81.5" y1="53"   x2="84"   y2="48"   stroke="#0c0818" strokeWidth="1.1" strokeLinecap="round" />
      </g>

      {/* ── lips — natural red ── */}
      <path
        d="M50,86 Q53,83 57,84 Q59,82.5 60,83 Q61,82.5 63,84 Q67,83 70,86 Q65,89 60,89.5 Q55,89 50,86Z"
        fill="url(#ava-lips)"
        opacity=".95"
      />
      <path
        d="M50,86 Q55,90.5 60,91.5 Q65,90.5 70,86 Q65,93.5 60,94.5 Q55,93.5 50,86Z"
        fill="url(#ava-lips)"
        opacity=".75"
      />
    </svg>
  )
}
