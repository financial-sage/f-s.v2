"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Delete, Divide, Equal, Plus, Shapes, X } from "lucide-react";

interface CustomNumpadProps {
  isOpen: boolean;
  initialValue?: string;
  onClose: () => void;
  onValueChange: (value: string) => void;
  onConfirm: (value?: string) => void;
  embedded?: boolean;
  embeddedStyle?: "card" | "flat";
  showDisplay?: boolean;
  accentColor?: string;
}

function normalizeExpression(expression: string) {
  return expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/,/g, ".")
    .replace(/[^0-9+\-*/.()]/g, "");
}

function formatForDisplay(value: string) {
  if (!value) {
    return "0";
  }

  return value.replace(/\./g, ",").replace(/\*/g, "×").replace(/\//g, "÷");
}

function safeEvaluate(expression: string) {
  const normalized = normalizeExpression(expression);

  if (!normalized) {
    return "0";
  }

  const result = Function(`"use strict"; return (${normalized})`)();

  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Operación inválida");
  }

  return String(Number(result.toFixed(2)));
}

function keyClass(kind: "digit" | "op" | "danger" = "digit") {
  const base =
    "flex h-[3.6rem] items-center justify-center rounded-2xl text-[1.35rem] font-medium shadow-[0_4px_12px_rgba(43,52,55,0.05)] transition-all active:scale-95";
  if (kind === "op") {
    return `${base} bg-white/55 text-primary backdrop-blur-sm`;
  }
  if (kind === "danger") {
    return `${base} bg-white/55 text-rose-500 backdrop-blur-sm`;
  }
  return `${base} bg-white/50 text-on-surface backdrop-blur-md`;
}

export default function CustomNumpad({
  isOpen,
  initialValue,
  onClose,
  onValueChange,
  onConfirm,
  embedded = false,
  embeddedStyle = "card",
  showDisplay = true,
  accentColor = "#4A6549",
}: CustomNumpadProps) {
  const [expression, setExpression] = useState("");

  useEffect(() => {
    if (isOpen) {
      setExpression(initialValue && initialValue.trim() ? initialValue.replace(/\./g, ",") : "0");
      return;
    }

    setExpression("");
  }, [initialValue, isOpen]);

  const displayValue = useMemo(() => formatForDisplay(expression || "0"), [expression]);
  const hasPendingOperation = /[+\-×÷]/.test(expression);

  function appendValue(value: string) {
    setExpression((prev) => {
      if (value === ",") {
        const lastChunk = prev.split(/[+\-×÷]/).pop() ?? "";
        if (lastChunk.includes(".") || lastChunk.includes(",")) {
          return prev;
        }
        return `${prev}${prev ? value : "0,"}`;
      }

      if (/^[0-9]$/.test(value) && prev === "0") {
        return value;
      }

      if (["+", "-", "×", "÷"].includes(value)) {
        if (!prev) {
          return value === "-" ? "-" : prev;
        }

        if (/[+\-×÷]$/.test(prev)) {
          return `${prev.slice(0, -1)}${value}`;
        }
      }

      return `${prev}${value}`;
    });
  }

  function handleBackspace() {
    setExpression((prev) => prev.slice(0, -1));
  }

  function handleConfirm() {
    try {
      const result = safeEvaluate(expression);

      if (hasPendingOperation) {
        setExpression(result);
        return;
      }

      onValueChange(result);
      onConfirm(result);

      if (!embedded) {
        onClose();
      }
    } catch {
      if (!hasPendingOperation) {
        onValueChange("0");
        onConfirm("0");

        if (!embedded) {
          onClose();
        }
      }
    }
  }

  return (
    <>
      {isOpen && !embedded && <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />}
      <div
        className={`pointer-events-auto ${
          embedded
            ? embeddedStyle === "flat"
              ? "relative w-full"
              : "relative w-full rounded-2xl bg-surface-lowest px-3 py-2 shadow-md"
            : "fixed right-0 bottom-0 left-0 z-50 rounded-t-3xl bg-surface-lowest px-4 pt-3 pb-10 shadow-2xl transition-transform duration-300 ease-in-out"
        } ${!embedded ? (isOpen ? "translate-y-0" : "translate-y-full") : ""}`}
      >
        <div className="mx-auto w-full max-w-md">
          {!embedded && <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-high" />}

          {showDisplay && (
            <div className={`${embedded ? "mb-4" : "mb-6"} flex flex-col items-center justify-center px-6 text-center`}>
              <span className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                Monto
              </span>
              <div className="flex min-h-[3.5rem] items-baseline justify-center gap-1.5">
                <span className="text-2xl font-light" style={{ color: accentColor }}>
                  $
                </span>
                <span className="text-[2.75rem] font-light leading-none tracking-tight text-on-surface">
                  {displayValue}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 gap-2 px-3 pb-5 pt-1">
            <button type="button" onClick={onClose} className={keyClass("op")}>
              <X size={18} />
            </button>
            <button type="button" onClick={() => appendValue("7")} className={keyClass()}>
              7
            </button>
            <button type="button" onClick={() => appendValue("8")} className={keyClass()}>
              8
            </button>
            <button type="button" onClick={() => appendValue("9")} className={keyClass()}>
              9
            </button>
            <button type="button" onClick={handleBackspace} className={keyClass("danger")}>
              <Delete size={18} />
            </button>

            <button type="button" onClick={() => appendValue("÷")} className={keyClass("op")}>
              <Divide size={18} />
            </button>
            <button type="button" onClick={() => appendValue("4")} className={keyClass()}>
              4
            </button>
            <button type="button" onClick={() => appendValue("5")} className={keyClass()}>
              5
            </button>
            <button type="button" onClick={() => appendValue("6")} className={keyClass()}>
              6
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="row-span-3 flex items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_rgba(43,52,55,0.16)] transition-all active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              {hasPendingOperation ? <Equal size={28} /> : <Check size={28} />}
            </button>
            <button type="button" onClick={() => appendValue("×")} className={keyClass("op")}>
              <X size={18} />
            </button>
            <button type="button" onClick={() => appendValue("1")} className={keyClass()}>
              1
            </button>
            <button type="button" onClick={() => appendValue("2")} className={keyClass()}>
              2
            </button>
            <button type="button" onClick={() => appendValue("3")} className={keyClass()}>
              3
            </button>

            <button type="button" onClick={() => appendValue("+")} className={keyClass("op")}>
              <Plus size={18} />
            </button>
            <button type="button" className={keyClass("op")}>
              <Shapes size={18} />
            </button>
            <button type="button" onClick={() => appendValue("0")} className={keyClass()}>
              0
            </button>
            <button type="button" onClick={() => appendValue(",")} className={keyClass()}>
              ,
            </button>
          </div>

          {!embedded && <div className="h-6 w-full" />}
        </div>
      </div>
    </>
  );
}
