"use client";

import { useEffect, useState } from "react";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  action?: ToastAction;
  duration: number;
};

type ToastInput = {
  title: string;
  description?: string;
  action?: ToastAction;
  /** ms — default 5500 so the action stays tappable */
  duration?: number;
};

type ToastState = {
  toasts: ToastItem[];
};

const listeners = new Set<(state: ToastState) => void>();
let memoryState: ToastState = { toasts: [] };

function emit() {
  for (const listener of listeners) listener(memoryState);
}

function dismiss(id?: string) {
  memoryState = {
    toasts: id
      ? memoryState.toasts.filter((t) => t.id !== id)
      : [],
  };
  emit();
}

/** Imperative API (shadcn-style). */
export function toast(input: ToastInput) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `toast-${Date.now()}`;

  const item: ToastItem = {
    id,
    title: input.title,
    description: input.description,
    action: input.action,
    duration: input.duration ?? 5500,
  };

  memoryState = { toasts: [...memoryState.toasts, item].slice(-3) };
  emit();

  window.setTimeout(() => dismiss(id), item.duration);
  return { id, dismiss: () => dismiss(id) };
}

export function useToast() {
  const [state, setState] = useState<ToastState>(memoryState);

  useEffect(() => {
    listeners.add(setState);
    setState(memoryState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss,
  };
}
