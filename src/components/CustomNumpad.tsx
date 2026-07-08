"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Delete, Divide, Equal, Plus, Shapes, X } from "lucide-react";

interface CustomNumpadProps {
  isOpen: boolean;
  initialValue?: string;
  onClose: () => void;
  onValueChange: (value: string) => void;
  onConfirm: (value?: string) => void;
  embedded?: boolean;
  embeddedStyle?: "card" | "flat";
  showDisplay?: boolean;
}

const operatorMap: Record<string, string> = {
  "×": "*",
  "÷": "/",
  ",": ".",
};

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

export default function CustomNumpad({
  isOpen,
  initialValue,
  onClose,
  onValueChange,
  onConfirm,
  embedded = false,
  embeddedStyle = "card",
  showDisplay = true,
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
            <div className={`${embedded ? "mb-3" : "mb-6"} flex flex-col items-end px-4`}>
              <span className="mb-1 text-[0.6875rem] uppercase tracking-widest text-on-surface-variant">
                Ingrese el monto
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-sage text-2xl font-bold">$</span>
                <span className="text-4xl font-extrabold tracking-tight text-on-surface">
                  {displayValue}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 gap-1 p-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-16 items-center justify-center rounded-lg bg-surface-container font-bold text-[#4A6549] shadow-sm transition-all active:scale-95"
            >
              <X size={18} />
            </button>
            <button type="button" onClick={() => appendValue("7")} className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest font-semibold text-on-surface shadow-sm transition-all active:scale-95">7</button>
            <button type="button" onClick={() => appendValue("8")} className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest font-semibold text-on-surface shadow-sm transition-all active:scale-95">8</button>
            <button type="button" onClick={() => appendValue("9")} className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest font-semibold text-on-surface shadow-sm transition-all active:scale-95">9</button>
            <button
              type="button"
              onClick={handleBackspace}
              className="row-span-1 flex h-16 items-center justify-center rounded-lg bg-surface-lowest text-red-500 shadow-sm transition-all active:scale-95"
            >
              <Delete size={18} />
            </button>

            <button
              type="button"
              onClick={() => appendValue("÷")}
              className="flex h-16 items-center justify-center rounded-lg bg-surface-container font-bold text-[#4A6549] shadow-sm transition-all active:scale-95"
            >
              <Divide size={18} />
            </button>
            <button type="button" onClick={() => appendValue("4")} className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest font-semibold text-on-surface shadow-sm transition-all active:scale-95">4</button>
            <button type="button" onClick={() => appendValue("5")} className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest font-semibold text-on-surface shadow-sm transition-all active:scale-95">5</button>
            <button type="button" onClick={() => appendValue("6")} className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest font-semibold text-on-surface shadow-sm transition-all active:scale-95">6</button>
            {/* <button
              type="button"
              className="flex h-16 items-center justify-center rounded-xl bg-surface-lowest text-sage shadow-sm transition-all active:scale-95"
            >
              <CalendarDays size={18} />
            </button> */}

            <button
              type="button"
              onClick={handleConfirm}
              className="row-span-3 flex items-center justify-center rounded-xl bg-[#C1E1C1] text-[#4A6549] shadow-lg transition-all active:scale-95"
            >
              {hasPendingOperation ? <Equal size={30} /> : <Check size={30} />}
            </button>
            <button
              type="button"
              onClick={() => appendValue("×")}
              className="flex h-16 items-center justify-center rounded-lg bg-surface-container font-bold text-[#4A6549] shadow-sm transition-all active:scale-95"
            >
              <X size={18} />
            </button>
            <button type="button" onClick={() => appendValue("1")} className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest font-semibold text-on-surface shadow-sm transition-all active:scale-95">1</button>
            <button type="button" onClick={() => appendValue("2")} className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest font-semibold text-on-surface shadow-sm transition-all active:scale-95">2</button>
            <button type="button" onClick={() => appendValue("3")} className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest font-semibold text-on-surface shadow-sm transition-all active:scale-95">3</button>

            <button
              type="button"
              onClick={() => appendValue("+")}
              className="flex h-16 items-center justify-center rounded-lg bg-surface-container font-bold text-[#4A6549] shadow-sm transition-all active:scale-95"
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest text-sage shadow-sm transition-all active:scale-95"
            >
              <Shapes size={18} />
            </button>
            <button type="button" onClick={() => appendValue("0")} className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest font-semibold text-on-surface shadow-sm transition-all active:scale-95">0</button>
            <button type="button" onClick={() => appendValue(",")} className="flex h-16 items-center justify-center rounded-lg bg-surface-lowest font-semibold text-on-surface shadow-sm transition-all active:scale-95">,</button>
          </div>

          {!embedded && <div className="h-6 w-full" />}
        </div>
      </div>
    </>
  );
}
