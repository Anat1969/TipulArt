// סימן האפליקציה: שלושה דפים בשכבות וכדור חימר. אותו סימן משמש כאייקון ההתקנה.
export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lm-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c99a45" />
          <stop offset="1" stopColor="#a8741c" />
        </linearGradient>
        <linearGradient id="lm-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c76a50" />
          <stop offset="1" stopColor="#a9472f" />
        </linearGradient>
        <radialGradient id="lm-c" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#5a5d64" />
          <stop offset="1" stopColor="#1f2024" />
        </radialGradient>
      </defs>
      <rect x="6" y="14" width="34" height="40" fill="url(#lm-a)" transform="rotate(-8 23 34)" />
      <rect x="16" y="10" width="34" height="40" fill="url(#lm-b)" opacity="0.92" transform="rotate(4 33 30)" />
      <rect x="22" y="18" width="32" height="36" fill="#f3eee5" stroke="#221f1b" strokeOpacity="0.2" />
      <circle cx="38" cy="36" r="9" fill="url(#lm-c)" />
    </svg>
  )
}
