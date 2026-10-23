import type { AppCurrency } from "@/lib/currency";

const SIZE = {
  sm: "h-4 w-5",
  md: "h-5 w-7",
  lg: "h-6 w-8",
} as const;

type FlagSize = keyof typeof SIZE;

export function CurrencyFlag({
  code,
  size = "sm",
  className = "",
}: {
  code: AppCurrency;
  size?: FlagSize;
  className?: string;
}) {
  const box = `${SIZE[size]} shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)] ${className}`;

  if (code === "EUR") {
    return (
      <svg viewBox="0 0 21 15" className={box} aria-hidden role="img">
        <title>España</title>
        <rect width="21" height="15" fill="#AA151B" />
        <rect y="3.75" width="21" height="7.5" fill="#F1BF00" />
      </svg>
    );
  }

  if (code === "COP") {
    return (
      <svg viewBox="0 0 21 15" className={box} aria-hidden role="img">
        <title>Colombia</title>
        <rect width="21" height="7.5" fill="#FFCD00" />
        <rect y="7.5" width="21" height="3.75" fill="#003893" />
        <rect y="11.25" width="21" height="3.75" fill="#CE1126" />
      </svg>
    );
  }

  if (code === "GBP") {
    return (
      <svg viewBox="0 0 21 15" className={box} aria-hidden role="img">
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
      <svg viewBox="0 0 21 15" className={box} aria-hidden role="img">
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
      <svg viewBox="0 0 21 15" className={box} aria-hidden role="img">
        <title>Suiza</title>
        <rect width="21" height="15" fill="#FF0000" />
        <rect x="8.5" y="3" width="4" height="9" fill="#fff" />
        <rect x="6" y="5.5" width="9" height="4" fill="#fff" />
      </svg>
    );
  }

  if (code === "BRL") {
    return (
      <svg viewBox="0 0 21 15" className={box} aria-hidden role="img">
        <title>Brasil</title>
        <rect width="21" height="15" fill="#009C3B" />
        <path d="M10.5 1.5L19.5 7.5 10.5 13.5 1.5 7.5Z" fill="#FFDF00" />
        <circle cx="10.5" cy="7.5" r="3.2" fill="#002776" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 21 15" className={box} aria-hidden role="img">
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
