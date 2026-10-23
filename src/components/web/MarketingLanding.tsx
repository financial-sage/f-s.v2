"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  HeartHandshake,
  Lightbulb,
  Plus,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react";

type Props = {
  loginUrl: string;
};

const FAQS = [
  {
    q: "¿SinDescuadre es solo para parejas?",
    a: "No. Funciona en solitario o en hogar compartido. Si vivís en pareja, podéis tener lo vuestro, lo mío y lo de los dos sin mezclarlo.",
  },
  {
    q: "¿Qué hace la IA?",
    a: "Lee tu situación (gastos, bolsillos, tendencias) y te ofrece orientación y recomendaciones en lenguaje claro: qué está pasando y qué conviene hacer. No es un chat infinito: es ayuda contextual, cuando la necesitas.",
  },
  {
    q: "¿Tengo que instalarla desde una tienda?",
    a: "No. Es una app web (PWA): la abres en el navegador del móvil y, si quieres, la añades a la pantalla de inicio. Sin App Store ni Play Store.",
  },
  {
    q: "¿Y en el ordenador?",
    a: "La experiencia completa está pensada para el móvil. En escritorio este sitio te cuenta la historia y te lleva al login del teléfono; si ya eres Premium, puedes ver el panel web de métricas.",
  },
] as const;

const STEPS = [
  "Abres SinDescuadre en el móvil (QR o enlace).",
  "Creas tu cuenta en un minuto.",
  "Añades cuentas o bolsillos.",
  "Registras gastos del día a día.",
  "La IA te orienta sobre qué está pasando.",
  "Si quieres, invitas a tu pareja al hogar.",
] as const;

const SHOWCASES = [
  {
    title: "Tu dinero, de un vistazo",
    body: "Saldo claro, bolsillos y una pista de qué conviene mirar. Sin dashboards abrumadores.",
    image: "/img/marketing/phone-dashboard.jpg",
    alt: "Captura real de SinDescuadre: panel principal con saldo",
    tone: "navy" as const,
    icon: Wallet,
  },
  {
    title: "IA que te orienta",
    body: "No solo números: orientación contextual con IA para entender qué está pasando con tu dinero y qué hacer después — sin sermones ni chat eterno.",
    image: "/img/marketing/phone-guidance.jpg",
    alt: "Captura real de SinDescuadre: modal de orientación con IA",
    tone: "gold" as const,
    icon: Sparkles,
  },
  {
    title: "Cuentas donde tocan",
    body: "Bancos, efectivo e ingresos ordenados. Sabes qué hay en cada sitio sin abrir cinco apps.",
    image: "/img/marketing/phone-accounts.jpg",
    alt: "Captura real de SinDescuadre: centro de cuentas",
    tone: "sand" as const,
    icon: Lightbulb,
  },
  {
    title: "Cada gasto, en su sitio",
    body: "Historial claro del día a día. Ves supermercado, café o ingresos — y de dónde salió el dinero.",
    image: "/img/marketing/phone-history.jpg",
    alt: "Captura real de SinDescuadre: historial de movimientos",
    tone: "navy" as const,
    icon: HeartHandshake,
  },
] as const;

function PhoneFrame({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2.15rem] border-[5px] border-[#1c2740] bg-[#1c2740] shadow-[0_28px_64px_rgba(28,39,64,0.32)] ${className}`}
    >
      <div className="pointer-events-none absolute left-1/2 top-2.5 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[#2a3654]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="block h-full w-full object-cover object-top"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border-b border-[color-mix(in_srgb,var(--on-surface)_12%,transparent)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 py-5 text-left"
      >
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--on-surface)_14%,transparent)] bg-surface-lowest text-on-surface"
          aria-hidden
        >
          <Plus
            size={18}
            strokeWidth={2.2}
            className={`transition-transform duration-300 ${open ? "rotate-45" : ""}`}
          />
        </span>
        <span className="pt-1.5 text-[1.05rem] font-semibold leading-snug tracking-tight text-on-surface sm:text-lg">
          {question}
        </span>
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="pb-5 pl-[3.25rem] pr-2 text-[15px] font-light leading-relaxed text-on-surface-variant">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MarketingLanding({ loginUrl }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import("qrcode").then(async (QRCode) => {
      try {
        const dataUrl = await QRCode.toDataURL(loginUrl, {
          width: 196,
          margin: 2,
          color: { dark: "#1c2740", light: "#fffcf7" },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loginUrl]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const displayUrl = loginUrl.replace(/^https?:\/\//i, "");

  return (
    <div className="relative min-h-dvh bg-[#f7f4ee] text-on-surface">
      <style>{`
        @keyframes sd-rise {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sd-float {
          0%, 100% { transform: translateY(0) rotate(-1.5deg); }
          50% { transform: translateY(-10px) rotate(-1.5deg); }
        }
        @keyframes sd-tile {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes sd-bob {
          0%, 100% { transform: translateY(0); opacity: 0.55; }
          50% { transform: translateY(6px); opacity: 1; }
        }
        .sd-rise { animation: sd-rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .sd-rise-2 { animation: sd-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
        .sd-rise-3 { animation: sd-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both; }
        .sd-phone { animation: sd-float 8s ease-in-out infinite; }
        .sd-tile-a { animation: sd-tile 6.5s ease-in-out infinite; }
        .sd-tile-b { animation: sd-tile 7.2s ease-in-out 0.4s infinite; }
        .sd-tile-c { animation: sd-tile 6.8s ease-in-out 0.8s infinite; }
        .sd-bob { animation: sd-bob 1.8s ease-in-out infinite; }
      `}</style>

      {/* Fixed nav */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[color-mix(in_srgb,var(--on-surface)_06%,transparent)] bg-[#fffcf7]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/welcome" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/v3/logo-mark.png"
              alt=""
              className="h-9 w-9 rounded-[22%] object-cover"
            />
            <span className="font-headline text-lg font-bold tracking-tight text-[#1c2740]">
              SinDescuadre
            </span>
          </Link>
          <a
            href="#abrir"
            className="inline-flex h-10 items-center rounded-lg bg-[#1c2740] px-4 text-sm font-semibold text-[#e8e2d6] transition-opacity hover:opacity-90"
          >
            Ábrelo en tu móvil
          </a>
        </div>
      </nav>

      {/*
        Fixed hero + spacer: hero stays put; next sections (z-10, solid bg)
        slide up and cover it — Tapdaa-style reveal.
      */}
      <div className="relative h-[100dvh]">
        <header className="pointer-events-none fixed inset-x-0 top-[4.25rem] z-0 flex h-[calc(100dvh-4.25rem)] flex-col overflow-hidden bg-[#f7f4ee]">
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 55% at 85% 20%, color-mix(in srgb, #c4a574 22%, transparent), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 80%, color-mix(in srgb, #1c2740 6%, transparent), transparent 50%)",
            }}
          />

          <div className="pointer-events-auto relative mx-auto grid h-full w-full max-w-6xl items-center gap-6 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-20 lg:pt-10">
            <div className="max-w-xl">
              <p className="sd-rise mb-4 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,#c4a574_45%,transparent)] bg-[color-mix(in_srgb,#c4a574_16%,#fffcf7)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1c2740]">
                <Sparkles size={13} strokeWidth={2.2} className="text-[#c4a574]" />
                Con orientación por IA
              </p>
              <h1 className="sd-rise font-headline text-[2.4rem] font-bold leading-[1.05] tracking-tight text-[#1c2740] sm:text-[3.25rem] lg:text-[3.6rem]">
                Llegar a fin de mes, tan claro como un tap.
              </h1>
              <p className="sd-rise-2 mt-5 max-w-md text-base font-normal leading-relaxed text-[#5c5348] sm:text-lg">
                Organiza tu dinero — solo o en pareja — y deja que la IA te
                explique qué está pasando y qué conviene hacer. Sin ansiedad,
                sin hojas de cálculo.
              </p>
              <div className="sd-rise-3 mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#abrir"
                  className="inline-flex h-12 items-center rounded-lg border-2 border-[#1c2740] bg-[#fffcf7] px-6 text-sm font-bold text-[#1c2740] transition-colors hover:bg-[#1c2740] hover:text-[#e8e2d6]"
                >
                  Empezar
                </a>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-[#5c5348] underline-offset-4 hover:text-[#1c2740] hover:underline"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </div>

            <div className="sd-rise-3 relative mx-auto hidden h-full max-h-[560px] w-full max-w-[440px] lg:block">
              <div
                className="absolute left-1/2 top-10 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
                style={{
                  background: "color-mix(in srgb, #c4a574 35%, transparent)",
                }}
                aria-hidden
              />

              <div className="sd-phone absolute left-[16%] top-2 z-10 w-[220px] xl:left-[18%] xl:w-[240px]">
                <PhoneFrame
                  src="/img/marketing/phone-dashboard.jpg"
                  alt="SinDescuadre en el móvil: panel principal"
                  priority
                  className="aspect-[9/19]"
                />
              </div>

              <div className="sd-tile-a absolute right-0 top-6 z-20 w-[150px] overflow-hidden rounded-xl bg-[#1c2740] shadow-[0_16px_36px_rgba(28,39,64,0.28)] xl:w-[168px]">
                <div className="aspect-[4/5] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/img/marketing/phone-login.jpg"
                    alt=""
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <p className="px-3 py-2.5 text-[12px] font-bold text-[#e8e2d6]">
                  Entra en un minuto
                </p>
              </div>

              <div className="sd-tile-b absolute bottom-24 left-0 z-20 w-[148px] overflow-hidden rounded-xl bg-[#e4e0d6] shadow-[0_16px_36px_rgba(28,39,64,0.14)] xl:w-[160px]">
                <div className="aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/img/marketing/phone-accounts.jpg"
                    alt=""
                    className="h-full w-full object-cover object-[center_15%]"
                  />
                </div>
                <p className="px-3 py-2.5 text-[12px] font-bold text-[#1c2740]">
                  Tus cuentas
                </p>
              </div>

              <div className="sd-tile-c absolute bottom-4 right-6 z-20 w-[148px] rounded-xl bg-[#c4a574] p-3.5 text-[#0f1729] shadow-[0_16px_36px_rgba(28,39,64,0.18)] xl:right-10 xl:w-[160px]">
                <Sparkles size={22} strokeWidth={1.75} className="mb-2" />
                <p className="text-[13px] font-bold leading-snug">
                  IA que orienta
                </p>
              </div>
            </div>
          </div>

          <a
            href="#conocer"
            className="sd-bob pointer-events-auto absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5c5348]"
          >
            Sigue bajando
            <ChevronDown size={18} strokeWidth={2.2} />
          </a>
        </header>
      </div>

      {/* Slides over the fixed hero */}
      <div className="relative z-10">
        <div className="border-b border-[color-mix(in_srgb,var(--on-surface)_08%,transparent)] bg-[#fffcf7] px-5 py-12 lg:hidden">
          <div className="mx-auto flex max-w-sm justify-center gap-3">
            <PhoneFrame
              src="/img/marketing/phone-dashboard.jpg"
              alt="SinDescuadre: panel principal"
              className="aspect-[9/19] w-[42%]"
            />
            <PhoneFrame
              src="/img/marketing/phone-guidance.jpg"
              alt="SinDescuadre: orientación con IA"
              className="mt-8 aspect-[9/19] w-[42%]"
            />
          </div>
        </div>

        <section
          id="conocer"
          className="scroll-mt-24 border-t border-[color-mix(in_srgb,var(--on-surface)_08%,transparent)] bg-[#fffcf7] px-5 py-20 sm:px-8 lg:py-28"
        >
          <div className="mx-auto max-w-3xl">
            <div
              className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#c4a574] text-[#1c2740]"
              aria-hidden
            >
              <span className="font-headline text-lg font-bold">?</span>
            </div>
            <h2 className="font-headline text-3xl font-bold tracking-tight text-[#1c2740] sm:text-4xl">
              Conoce SinDescuadre
            </h2>
            <p className="mt-5 max-w-2xl text-base font-normal leading-relaxed text-[#5c5348] sm:text-lg">
              El dinero no desaparece: se vuelve invisible. Un gasto aquí, una
              transferencia allá, y a fin de mes nadie sabe por qué no llega.
              SinDescuadre ordena cuentas y bolsillos, y con IA te ayuda a
              entender qué está pasando — para que vuelvas a verlo.
            </p>

            <div className="mt-12">
              {FAQS.map((item) => (
                <FaqItem key={item.q} question={item.q} answer={item.a} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f7f4ee] px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-headline text-3xl font-bold tracking-tight text-[#1c2740] sm:text-[2.75rem]">
                La app, como se ve en tu móvil
              </h2>
              <p className="mt-4 text-base font-normal text-[#5c5348] sm:text-lg">
                Capturas reales: panel, orientación con IA, cuentas e historial.
              </p>
            </div>

            <div className="mt-16 space-y-20 lg:space-y-28">
              {SHOWCASES.map((item, index) => {
                const Icon = item.icon;
                const reverse = index % 2 === 1;
                const panel =
                  item.tone === "navy"
                    ? "bg-[#1c2740] text-[#e8e2d6]"
                    : item.tone === "gold"
                      ? "bg-[#c4a574] text-[#0f1729]"
                      : "bg-[#e4e0d6] text-[#1c2740]";

                return (
                  <article
                    key={item.title}
                    className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                      reverse ? "lg:[&>*:first-child]:order-2" : ""
                    }`}
                  >
                    <div className={`rounded-[1.75rem] p-8 sm:p-10 ${panel}`}>
                      <Icon size={28} strokeWidth={1.6} className="opacity-90" />
                      <h3 className="mt-6 font-headline text-2xl font-bold tracking-tight sm:text-3xl">
                        {item.title}
                      </h3>
                      <p className="mt-4 max-w-md text-base font-normal leading-relaxed opacity-90">
                        {item.body}
                      </p>
                    </div>

                    <div className="relative mx-auto w-[min(100%,280px)]">
                      <div
                        className="pointer-events-none absolute -inset-8 rounded-full blur-3xl"
                        style={{
                          background:
                            "color-mix(in srgb, #c4a574 28%, transparent)",
                        }}
                        aria-hidden
                      />
                      <PhoneFrame
                        src={item.image}
                        alt={item.alt}
                        className="relative aspect-[9/19]"
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-[color-mix(in_srgb,var(--on-surface)_08%,transparent)] bg-[#fffcf7] px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c4a574]">
                Cómo empezar
              </p>
              <h2 className="mt-3 font-headline text-3xl font-bold tracking-tight text-[#1c2740] sm:text-4xl">
                Del enlace al “ya está”, paso a paso
              </h2>
              <p className="mt-4 text-base font-normal leading-relaxed text-[#5c5348]">
                Sin fricción ni tutoriales eternos. En minutos estás ordenando
                tu dinero — y la IA empieza a orientarte.
              </p>
            </div>

            <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((step, i) => (
                <li
                  key={step}
                  className="rounded-2xl border border-[color-mix(in_srgb,var(--on-surface)_10%,transparent)] bg-[#f7f4ee] p-6"
                >
                  <span className="font-headline text-3xl font-bold text-[#c4a574]">
                    {i + 1}
                  </span>
                  <p className="mt-3 text-[15px] font-semibold leading-snug text-[#1c2740]">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#f7f4ee] px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tight text-[#1c2740] sm:text-[2.75rem]">
              Menos ansiedad. Más “ya cuadra”.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base font-normal leading-relaxed text-[#5c5348] sm:text-lg">
              Anota en segundos, mira el saldo sin miedo y deja que la IA te
              diga qué importa ahora. Eso es SinDescuadre.
            </p>
          </div>
        </section>

        <section
          id="abrir"
          className="scroll-mt-24 bg-[#1c2740] px-5 py-20 text-[#e8e2d6] sm:px-8 lg:py-28"
        >
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-lg text-center lg:text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c4a574]">
                Empieza ahora
              </p>
              <h2 className="mt-3 font-headline text-3xl font-bold tracking-tight sm:text-4xl">
                Empieza tu viaje SinDescuadre
              </h2>
              <p className="mt-4 text-base font-normal leading-relaxed text-[#c4bcae]">
                Escanea el código o copia el enlace. En el móvil creas tu
                cuenta o entras — orden, claridad e IA en el bolsillo.
              </p>
              <p className="mt-6 truncate font-mono text-sm text-[#c4a574]">
                {displayUrl}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <button
                  type="button"
                  onClick={() => void copyUrl()}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#c4bcae]/40 bg-transparent px-4 text-sm font-semibold text-[#e8e2d6] transition-colors hover:bg-white/10"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copiado" : "Copiar enlace"}
                </button>
                <a
                  href={loginUrl}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#c4a574] px-4 text-sm font-bold text-[#0f1729] transition-opacity hover:opacity-90"
                >
                  <Smartphone size={16} strokeWidth={2.2} />
                  Abrir login
                </a>
              </div>
            </div>

            <div className="flex items-end gap-4">
              <PhoneFrame
                src="/img/marketing/phone-login.jpg"
                alt="Login de SinDescuadre en el móvil"
                className="hidden aspect-[9/19] w-[140px] sm:block"
              />
              <div className="rounded-2xl bg-[#fffcf7] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Código QR para abrir SinDescuadre en el móvil"
                    width={196}
                    height={196}
                    className="h-[196px] w-[196px] rounded-lg"
                  />
                ) : (
                  <div
                    className="flex h-[196px] w-[196px] items-center justify-center rounded-lg bg-[#f0ebe3] text-[#5c5348]"
                    aria-hidden
                  >
                    <Smartphone size={36} strokeWidth={1.4} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-[color-mix(in_srgb,var(--on-surface)_08%,transparent)] bg-[#f7f4ee] px-5 py-10 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/v3/logo-mark.png"
                alt=""
                className="h-8 w-8 rounded-[22%] object-cover"
              />
              <span className="font-headline text-sm font-bold text-[#1c2740]">
                SinDescuadre
              </span>
            </div>
            <p className="text-[12px] font-normal text-[#5c5348]">
              Tus finanzas, en orden.{" "}
              <Link
                href="/login"
                className="font-semibold text-[#1c2740] hover:underline"
              >
                Ya tengo cuenta
              </Link>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
