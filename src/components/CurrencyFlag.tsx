import type { AppCurrency } from "@/lib/currency";

const SIZE = {
  sm: "h-4 w-5",
  md: "h-5 w-7",
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
  const box = `${SIZE[size]} shrink-0 overflow-hidden rounded-[3px] ${className}`;

  if (code === "EUR") {
    return (
      <svg
        viewBox="0 0 21 15"
        className={box}
        aria-hidden
        role="img"
      >
        <title>España</title>
        <rect width="21" height="15" fill="#AA151B" />
        <rect y="3.75" width="21" height="7.5" fill="#F1BF00" />
      </svg>
    );
  }

  if (code === "COP") {
    return (
      <svg
        viewBox="0 0 21 15"
        className={box}
        aria-hidden
        role="img"
      >
        <title>Colombia</title>
        <rect width="21" height="7.5" fill="#FFCD00" />
        <rect y="7.5" width="21" height="3.75" fill="#003893" />
        <rect y="11.25" width="21" height="3.75" fill="#CE1126" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 21 15"
      className={box}
      aria-hidden
      role="img"
    >
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
