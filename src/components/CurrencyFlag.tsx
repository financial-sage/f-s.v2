import type { AppCurrency } from "@/lib/currency";
import { cn } from "@/components/ui/cn";
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
  "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.72) 22%, rgba(0,0,0,0.32) 52%, rgba(0,0,0,0.08) 78%, transparent 100%)";
/** Flush-to-edge: solid at the card border, then a clear fade into the amount. */
const FLAG_FLUSH_FADE_MASK =
  "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.78) 28%, rgba(0,0,0,0.35) 58%, rgba(0,0,0,0.06) 82%, transparent 100%)";

/** List edge wash — more pronounced dissolve toward the content. */
const FLAG_EDGE_FADE_RIGHT =
  "linear-gradient(270deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 28%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.04) 78%, transparent 100%)";
/** Left-edge version: solid on the left, fades toward the right. */
const FLAG_EDGE_FADE_LEFT =
  "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 28%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.04) 78%, transparent 100%)";

/**
 * Hero wash: flag to the left of the amount with a light L→R fade.
 * `flushLeft`: flag sits on the card’s left edge — parent row must bleed
 * with `-mx-5` (see AccountsPanel investment hero).
 */
export function CurrencyFlagHero({
  code,
  children,
  flushLeft = false,
  className = "",
}: {
  code: AppCurrency;
  children: ReactNode;
  flushLeft?: boolean;
  className?: string;
}) {
  const mask = flushLeft ? FLAG_FLUSH_FADE_MASK : FLAG_FADE_MASK;
  return (
    <span
      className={cn(
        "relative inline-flex items-center",
        flushLeft && "gap-2.5",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none relative z-0 h-[1em] shrink-0 overflow-hidden",
          flushLeft
            ? "w-[2.5em] rounded-none"
            : "w-[2.1em] rounded-[3px]"
        )}
        style={{
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
        aria-hidden
      >
        <FlagSvg
          code={code}
          className={cn(
            "h-full w-full object-cover",
            flushLeft ? "opacity-95" : "rounded-[3px] opacity-90"
          )}
        />
      </span>
      <span
        className={cn("relative z-[1]", !flushLeft && "-ml-5 pl-6")}
      >
        {children}
      </span>
    </span>
  );
}

/** Full-height edge wash (flush to card edge, fades inward). */
export function CurrencyFlagEdgeWash({
  code,
  side = "right",
  className = "",
}: {
  code: AppCurrency;
  side?: "left" | "right";
  className?: string;
}) {
  const mask = side === "left" ? FLAG_EDGE_FADE_LEFT : FLAG_EDGE_FADE_RIGHT;
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-y-0 z-0 w-[5.5rem] overflow-hidden",
        side === "left" ? "left-0" : "right-0",
        className
      )}
      style={{
        WebkitMaskImage: mask,
        maskImage: mask,
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
