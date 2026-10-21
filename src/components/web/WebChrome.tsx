import SignOutButton from "@/components/SignOutButton";

type Props = {
  eyebrow?: string;
  title?: string;
  subtitle?: string | null;
};

export default function WebChrome({
  eyebrow = "Escritorio",
  title = "SinDescuadre",
  subtitle,
}: Props) {
  return (
    <header className="border-b border-outline-variant/25 bg-surface-lowest/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/v3/apple-touch-icon.png"
            alt=""
            className="h-9 w-9 rounded-lg shadow-sm"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-headline text-base font-semibold tracking-tight text-on-surface">
                {title}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                {eyebrow}
              </span>
            </div>
            {subtitle ? (
              <p className="truncate text-xs font-light text-on-surface-variant">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <SignOutButton
          compact
          className="shrink-0 border-outline-variant/40 bg-surface-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        />
      </div>
    </header>
  );
}
