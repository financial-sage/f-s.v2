import type { AppCurrency } from "@/lib/currency";
import type { ReactNode } from "react";

const SIZE = {
  sm: "h-4 w-5",
  md: "h-5 w-7",
  lg: "h-6 w-8",
  /** Fills parent height; width follows 21:15 flag ratio via aspect. */
  match: "h-full w-auto aspect-[21/15]",
} as const;

type FlagSize = keyof typeof SIZE;

function FlagSvg({
  code,
  className,
  preserveAspectRatio = "xMidYMid meet",
}: {
  code: AppCurrency;
  className: string;
  preserveAspectRatio?: string;
}) {
  const common = {
    viewBox: "0 0 21 15",
    className,
    "aria-hidden": true as const,
    role: "img" as const,
    preserveAspectRatio,
  };

  if (code === "EUR") {
    return (
      <svg {...common}>
        <title>España</title>
        <rect width="21" height="15" fill="#AA151B" />
        <rect y="3.75" width="21" height="7.5" fill="#F1BF00" />
      </svg>
    );
  }

  if (code === "COP") {
    return (
      <svg {...common}>
        <title>Colombia</title>
        <rect width="21" height="7.5" fill="#FFCD00" />
        <rect y="7.5" width="21" height="3.75" fill="#003893" />
        <rect y="11.25" width="21" height="3.75" fill="#CE1126" />
      </svg>
    );
  }

  if (code === "GBP") {
    return (
      <svg {...common}>
        <title>Reino Unido</title>
        <rect width="21" height="15" fill="#012169" />
        <path d="M0 0l21 15M21 0L0 15" stroke="#fff" strokeWidth="3" />
        <path d="M0 0l21 15M21 0L0 15" stroke="#C8102E" strokeWidth="1.5" />
        <path d="M10.5 0v15M0 7.5h21" stroke="#fff" strokeWidth="5" />
        <path d="M10.5 0v15M0 7.5h21" stroke="#C8102E" strokeWidth="2.5" />
      </svg>
    );
  }

  if (code === "MXN") {
    return (
      <svg {...common}>
        <title>México</title>
        <rect width="7" height="15" fill="#006847" />
        <rect x="7" width="7" height="15" fill="#fff" />
        <rect x="14" width="7" height="15" fill="#CE1126" />
        <circle cx="10.5" cy="7.5" r="1.6" fill="#8B5A2B" />
      </svg>
    );
  }

  if (code === "CHF") {
    return (
      <svg {...common}>
        <title>Suiza</title>
        <rect width="21" height="15" fill="#FF0000" />
        <rect x="8.5" y="3" width="4" height="9" fill="#fff" />
        <rect x="6" y="5.5" width="9" height="4" fill="#fff" />
      </svg>
    );
  }

  if (code === "BRL") {
    return (
      <svg {...common}>
        <title>Brasil</title>
        <rect width="21" height="15" fill="#009C3B" />
        <path d="M10.5 1.5L19.5 7.5 10.5 13.5 1.5 7.5Z" fill="#FFDF00" />
        <circle cx="10.5" cy="7.5" r="3.2" fill="#002776" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <title>Estados Unidos</title>
      <rect width="21" height="15" fill="#B22234" />
      <path
        fill="#fff"
        d="M0 1.15h21v1.15H0zm0 2.3h21v1.15H0zm0 2.3h21v1.15H0zm0 2.3h21v1.15H0zm0 2.3h21v1.15H0zm0 2.3h21V15H0z"
      />
      <rect width="8.4" height="8.05" fill="#3C3B6E" />
    </svg>
  );
}

export function CurrencyFlag({
  code,
  size = "sm",
  className = "",
}: {
  code: AppCurrency;
  size?: FlagSize;
  className?: string;
}) {
  const box =
    `${SIZE[size]} shrink-0 overflow-hidden rounded-[3px] opacity-[0.55] shadow-[0_0_0_1px_rgba(0,0,0,0.04)] ${className}`.trim();
  return <FlagSvg code={code} className={box} />;
}

const FLAG_FADE_MASK =
  "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.5) 28%, rgba(0,0,0,0.22) 55%, rgba(0,0,0,0.06) 78%, transparent 100%)";

/** Stronger fade for list edge wash — flag stays subtle, not prominent.
 *  Right-edge version: solid on the right, fades toward the left. */
const FLAG_EDGE_FADE_MASK =
  "linear-gradient(270deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.28) 32%, rgba(0,0,0,0.1) 58%, transparent 82%)";

/**
 * Hero wash: tall flag on the left with L→R fade; amount sits to the right
 * so the flag stays visible (not covered by the number).
 */
export function CurrencyFlagHero({
  code,
  children,
  className = "",
}: {
  code: AppCurrency;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex items-center ${className}`.trim()}>
      <span
        className="pointer-events-none relative z-0 h-[1em] w-[2.1em] shrink-0 overflow-hidden rounded-[3px]"
        style={{
          WebkitMaskImage: FLAG_FADE_MASK,
          maskImage: FLAG_FADE_MASK,
        }}
        aria-hidden
      >
        <FlagSvg
          code={code}
          className="h-full w-full rounded-[3px] object-cover opacity-75"
        />
      </span>
      <span className="relative z-[1] -ml-5 pl-6">{children}</span>
    </span>
  );
}

/** Full-height edge wash for list rows (flush to card right, fades left). */
export function CurrencyFlagEdgeWash({
  code,
  className = "",
}: {
  code: AppCurrency;
  className?: string;
}) {
  return (
    <span
      className={`pointer-events-none absolute inset-y-0 right-0 z-0 w-[5.5rem] overflow-hidden ${className}`.trim()}
      style={{
        WebkitMaskImage: FLAG_EDGE_FADE_MASK,
        maskImage: FLAG_EDGE_FADE_MASK,
      }}
      aria-hidden
    >
      <FlagSvg
        code={code}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full opacity-55"
      />
    </span>
  );
}
